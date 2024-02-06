import { useStorage } from "@vueuse/core";
import { decodeEventLog } from "viem";

import ZkSyncContractInterface from "zksync-web3/abi/IZkSync.json";

import type { FeeEstimationParams } from "@/composables/zksync/useFee";
import type { TransactionDestination } from "@/store/destinations";
import type { TokenAmount } from "@/types";
import type { Hash } from "@/types";

import { useOnboardStore } from "@/store/onboard";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { useZkSyncWalletStore } from "@/store/zksync/wallet";
import { useNetworkStore } from "@/store/network";
import {abi as secondaryAbi} from "@/views/transactions/ZkLink.json";
import {abi as primaryGetterAbi} from "@/views/transactions/GettersFacet.json";
import type { PublicClient } from "@wagmi/core";
import { ethers, type BigNumberish, type BytesLike } from "ethers";
import type {TransactionRequest} from "@ethersproject/abstract-provider";
import { createPublicClient,http } from "viem";
import { Interface } from "ethers/lib/utils";
import { zkSyncSepoliaTestnet } from "viem/chains";
export type TransactionInfo = {
  type: FeeEstimationParams["type"] | "deposit";
  token: TokenAmount;
  from: { address: string; destination: TransactionDestination };
  to: { address: string; destination: TransactionDestination };
  transactionHash: string;
  timestamp: string;
  info: {
    toTransactionHash?: string;
    expectedCompleteTimestamp?: string;
    withdrawalFinalizationAvailable?: boolean;
    completed: boolean;
  };
};

export const ESTIMATED_DEPOSIT_DELAY = 15 * 60 * 1000; // 15 minutes
export const WITHDRAWAL_DELAY = 24 * 60 * 60 * 1000; // 24 hours
export type Address = Hash;
export type ForwardL2Request = {
  gateway: Address;
  isContractCall: boolean;
  sender: Address;
  txId: BigNumberish;
  contractAddressL2: Address;
  l2Value: BigNumberish;
  l2CallData: BytesLike;
  l2GasLimit: BigNumberish;
  l2GasPricePerPubdata: BigNumberish;
  factoryDeps: BytesLike[];
  refundRecipient: Address;
};

export const useZkSyncTransactionStatusStore = defineStore("zkSyncTransactionStatus", () => {
  const onboardStore = useOnboardStore();
  const providerStore = useZkSyncProviderStore();
  const { account } = storeToRefs(onboardStore);
  const { eraNetwork } = storeToRefs(providerStore);
  const eraWalletStore = useZkSyncWalletStore();
  const storageSavedTransactions = useStorage<{ [networkKey: string]: TransactionInfo[] }>(
    "zksync-bridge-transactions",
    {}
    );
    const savedTransactions = computed<TransactionInfo[]>({
      get: () => {
        return storageSavedTransactions.value[eraNetwork.value.key] || [];
      },
      set: (transactions: TransactionInfo[]) => {
        storageSavedTransactions.value[eraNetwork.value.key] = transactions;
      },
    });
    const userTransactions = computed(() =>
    savedTransactions.value.filter(
      (tx) =>
        tx.from.address === account.value.address ||
        (tx.type === "withdrawal" && tx.to.address === account.value.address)
    )
  );

  const getDepositL2TransactionHash = async (l1TransactionHash: string) => {
    const publicClient = onboardStore.getPublicClient();
    const transaction = await publicClient.waitForTransactionReceipt({
      hash: l1TransactionHash as Hash,
    });
    for (const log of transaction.logs) {
      try {
        const { args, eventName } = decodeEventLog({
          abi: ZkSyncContractInterface.abi,
          data: log.data,
          topics: log.topics,
        });
        if (eventName === "NewPriorityRequest") {
          return (args as { txHash: Hash }).txHash;
        }
      } catch {
        // ignore failed decoding
      }
    }
    throw new Error("No L2 transaction hash found");
  };

  const getDepositL2TransactionHashForSecondary = async (l1TransactionHash:string, secondaryClient: PublicClient) : Promise<Hash> =>{
    
    const transaction = await secondaryClient.waitForTransactionReceipt({
      hash: l1TransactionHash as Hash,
    });
    let forwardL2Request: ForwardL2Request | undefined;
    for (const log of transaction.logs) {
      try {
        const { args, eventName } = decodeEventLog({
          abi: secondaryAbi,//TODO
          data: log.data,
          topics: log.topics,
        });
        if (eventName === "NewPriorityRequest") {
          forwardL2Request = (args as { l2Request: ForwardL2Request }).l2Request;
        }
      } catch {
        // ignore failed decoding
      }
    }

    if (!forwardL2Request){
      throw new Error("No L2 transaction hash found");
    }

    let abicoder = new ethers.utils.AbiCoder();
    let encodedata = abicoder.encode(
      [
        "(address,bool,address,uint256,address,uint256,bytes,uint256,uint256,bytes[],address)",
      ],
      [
        [
          forwardL2Request.gateway,
          forwardL2Request.isContractCall,
          forwardL2Request.sender,
          forwardL2Request.txId,
          forwardL2Request.contractAddressL2,
          forwardL2Request.l2Value,
          forwardL2Request.l2CallData,
          forwardL2Request.l2GasLimit,
          forwardL2Request.l2GasPricePerPubdata,
          forwardL2Request.factoryDeps,
          forwardL2Request.refundRecipient,
        ],
      ]
    );
    const forwardHash = ethers.utils.keccak256(encodedata);

    while(true){
      const canonicalTxHash = await getCanonicalTxHash(forwardHash);
      if (canonicalTxHash) return canonicalTxHash;
      await sleep(5000);
    }
  }
  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
  const getCanonicalTxHash = async (forwardHash:string ) : Promise<Hash>=> {
    const publicClient = onboardStore.getPublicClient();
    const mainContractAddress = await providerStore.requestProvider().getMainContractAddress();

    const wallet = await eraWalletStore.getL1Signer();
    const mainContract = await wallet?.getMainContract();
    //TODO planA
    // const canonicalTxHash = await mainContract?.populateTransaction.getCanonicalTxHash(forwardHash);
  
    //TODO plan C
    const iface = new Interface(primaryGetterAbi);
    let tx : TransactionRequest = {
      to: mainContractAddress,
      data: iface.encodeFunctionData("getCanonicalTxHash",[forwardHash])
    };
    // const canonicalTxHash = await providerStore.requestProvider().call(tx)
    
    //TODO plan B
    const canonicalTxHash = await publicClient.readContract({ address: mainContractAddress as Address, abi: primaryGetterAbi, functionName:"getCanonicalTxHash",args:[forwardHash]});

    return canonicalTxHash as Hash;
  }
  const updateDepositStatus = async (transaction: TransactionInfo) => {
    const { selectedNetwork } = storeToRefs(useNetworkStore());
    console.log(selectedNetwork.value)
    let transactionHash;

    if(selectedNetwork.value.key != "primary"){
        // if secondary chain
      const secondaryPublicClient = createPublicClient({
        chain: selectedNetwork.value.l1Network!,
        transport: http(),
      });
   
      transactionHash = await getDepositL2TransactionHashForSecondary(transaction.transactionHash, secondaryPublicClient)
    }else{
      transactionHash = await getDepositL2TransactionHash(transaction.transactionHash);
    }
    const transactionReceipt = await providerStore.requestProvider().getTransactionReceipt(transactionHash);
    if (!transactionReceipt) return transaction;
    transaction.info.toTransactionHash = transactionHash;
    transaction.info.completed = true;
    return transaction;
  };
  const getWithdrawalStatus = async (transaction: TransactionInfo) => {
    if (!transaction.info.withdrawalFinalizationAvailable) {
      const transactionDetails = await providerStore
        .requestProvider()
        .getTransactionDetails(transaction.transactionHash);
      if (transactionDetails.status !== "verified") {
        return transaction;
      }
    }
    const isFinalized = await useZkSyncWalletStore()
      .getL1VoidSigner(true)
      ?.isWithdrawalFinalized(transaction.transactionHash)
      .catch(() => false);
    transaction.info.withdrawalFinalizationAvailable = true;
    transaction.info.completed = isFinalized;
    return transaction;
  };
  const getTransferStatus = async (transaction: TransactionInfo) => {
    const transactionReceipt = await providerStore.requestProvider().getTransactionReceipt(transaction.transactionHash);
    if (!transactionReceipt) return transaction;
    transaction.info.completed = true;
    return transaction;
  };
  const waitForCompletion = async (transaction: TransactionInfo) => {
    if (transaction.info.completed) return transaction;
    if (transaction.type === "deposit") {
      transaction = await updateDepositStatus(transaction);
    } else if (transaction.type === "withdrawal") {
      transaction = await getWithdrawalStatus(transaction);
    } else if (transaction.type === "transfer") {
      transaction = await getTransferStatus(transaction);
    }
    if (!transaction.info.completed) {
      const timeoutByType: Record<TransactionInfo["type"], number> = {
        deposit: 15_000,
        withdrawal: 30_000,
        transfer: 2_000,
      };
      await new Promise((resolve) => setTimeout(resolve, timeoutByType[transaction.type]));
      transaction = await waitForCompletion(transaction);
    }
    return transaction;
  };

  const saveTransaction = (transaction: TransactionInfo) => {
    if (
      savedTransactions.value.some(
        (existingTransaction) => existingTransaction.transactionHash === transaction.transactionHash
      )
    ) {
      updateTransactionData(transaction.transactionHash, transaction);
    } else {
      savedTransactions.value = [...savedTransactions.value, transaction];
    }
  };
  const updateTransactionData = (transactionHash: string, replaceTransaction: TransactionInfo) => {
    const transaction = savedTransactions.value.find((transaction) => transaction.transactionHash === transactionHash);
    if (!transaction) throw new Error("Transaction not found");
    const index = savedTransactions.value.indexOf(transaction);
    const newSavedTransactions = [...savedTransactions.value];
    newSavedTransactions[index] = replaceTransaction;
    savedTransactions.value = newSavedTransactions;
    return replaceTransaction;
  };
  const getTransaction = (transactionHash: string) => {
    transactionHash = transactionHash.toLowerCase();
    return savedTransactions.value.find((transaction) => transaction.transactionHash.toLowerCase() === transactionHash);
  };

  return {
    savedTransactions,
    userTransactions,
    waitForCompletion,
    saveTransaction,
    updateTransactionData,
    getTransaction,
  };
});
