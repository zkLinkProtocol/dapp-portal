import { useStorage } from "@vueuse/core";
import { decodeEventLog } from "viem";

import ZkSyncContractInterface from "@/zksync-web3-nova/abi/IZkSync.json";

import type { FeeEstimationParams } from "@/composables/zksync/useFee";
import type { TransactionDestination } from "@/store/destinations";
import type { TokenAmount } from "@/types";
import type { Hash } from "@/types";

import { useOnboardStore } from "@/store/onboard";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { useZkSyncWalletStore } from "@/store/zksync/wallet";
import { abi as secondaryAbi } from "@/views/transactions/ZkLink.json";
import { ethers, type BigNumberish, type BytesLike } from "ethers";
import { PRIMARY_CHAIN_KEY } from "~/zksync-web3-nova/src/utils";
import { nexusGoerliNode } from "@/data/networks";
import useNetworks from "@/composables/useNetworks";
import { Provider } from "@/zksync-web3-nova/src";
import { useNetworkStore } from "@/store/network";

export type TransactionInfo = {
  type: FeeEstimationParams["type"] | "deposit";
  token: TokenAmount;
  from: { address: string; destination: TransactionDestination };
  to: { address: string; destination: TransactionDestination };
  transactionHash: string;
  timestamp: string;
  fromChainKey: string;
  info: {
    toTransactionHash?: string;
    expectedCompleteTimestamp?: string;
    withdrawalFinalizationAvailable?: boolean;
    completed: boolean;
  };
  gateway?: string;
};
//TODO Setting the secondary chain and primary chain separately.
export const ESTIMATED_DEPOSIT_DELAY = 1 * 60 * 1000; // 1 minutes
export const ESTIMATED_DEPOSIT_DELAY_SECONDARY = 3 * 60 * 1000; // 1 minutes
export const getEstmatdDepositDelay = (networkKey: string): number => {
  if (networkKey === PRIMARY_CHAIN_KEY) {
    return ESTIMATED_DEPOSIT_DELAY;
  } else {
    return ESTIMATED_DEPOSIT_DELAY_SECONDARY;
  }
};
export const WITHDRAWAL_DELAY = 7 * 24 * 60 * 60 * 1000; // 7 * 24 hours
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
      return storageSavedTransactions.value["eraNetwork.value.key"] || [];
    },
    set: (transactions: TransactionInfo[]) => {
      storageSavedTransactions.value["eraNetwork.value.key"] = transactions;
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

  const getDepositL2TransactionHashForSecondary = async (l1TransactionHash: string): Promise<Hash> => {
    const publicClient = onboardStore.getPublicClient();
    const transaction = await publicClient.waitForTransactionReceipt({
      hash: l1TransactionHash as Hash,
    });
    console.log("getDepositL2TransactionHashForSecondary", l1TransactionHash);
    let forwardL2Request: ForwardL2Request | undefined;
    for (const log of transaction.logs) {
      try {
        const { args, eventName } = decodeEventLog({
          abi: secondaryAbi,
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

    if (!forwardL2Request) {
      throw new Error("No L2 transaction hash found");
    }

    let abicoder = new ethers.utils.AbiCoder();
    let encodedata = abicoder.encode(
      ["(bytes32,address,bool,address,uint256,address,uint256,bytes32,uint256,uint256,bytes32,address)"],
      [
        [
          "0xe0aaca1722ef50bb0c9b032e5b16ce2b79fa9f23638835456b27fd6894f8292c",
          forwardL2Request.gateway,
          forwardL2Request.isContractCall,
          forwardL2Request.sender,
          forwardL2Request.txId,
          forwardL2Request.contractAddressL2,
          forwardL2Request.l2Value,
          ethers.utils.keccak256(forwardL2Request.l2CallData),
          forwardL2Request.l2GasLimit,
          forwardL2Request.l2GasPricePerPubdata,
          ethers.utils.keccak256(abicoder.encode(["bytes[]"], [forwardL2Request.factoryDeps])),
          forwardL2Request.refundRecipient,
        ],
      ]
    );
    const forwardHash = ethers.utils.keccak256(encodedata) as Hash;
    console.log(forwardHash);
    while (true) {
      const canonicalTxHash = await eraWalletStore.getPrimaryL1VoidSigner().getCanonicalTxHash(forwardHash);
      if (canonicalTxHash) return canonicalTxHash;
      await sleep(5000);
    }
  };
  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const updateDepositStatus = async (transaction: TransactionInfo) => {
    let transactionHash;
    console.log("from chainkey", transaction.fromChainKey);
    if (transaction.fromChainKey !== PRIMARY_CHAIN_KEY) {
      // if secondary chain
      transactionHash = await getDepositL2TransactionHashForSecondary(transaction.transactionHash);
    } else {
      transactionHash = await getDepositL2TransactionHash(transaction.transactionHash);
    }

    const transactionReceipt = await request(transaction.gateway).getTransactionReceipt(transactionHash);
    if (!transactionReceipt) return transaction;
    transaction.info.toTransactionHash = transactionHash;
    transaction.info.completed = true;
    return transaction;
  };
  const { primaryNetwork, zkSyncNetworks } = useNetworks();
  const getNetworkInfo = (gateway: any) => {
    const newNetwork = zkSyncNetworks.find(
      (item) => item.l1Gateway && item.l1Gateway.toLowerCase() === gateway?.toLowerCase()
    );
    return newNetwork ?? primaryNetwork;
  };

  const { selectedNetwork } = storeToRefs(useNetworkStore());
  let provider: Provider | undefined;
  const request = (gateway: any) => {
    const eraNetwork = getNetworkInfo(gateway) || selectedNetwork.value;
    if (!provider) {
      provider = new Provider(eraNetwork.rpcUrl);
    }
    //if provider.networkKey != eraNetwork.key
    console.log(eraNetwork.key);
    provider.setContractAddresses(eraNetwork.key, {
      mainContract: eraNetwork.mainContract,
      erc20BridgeL1: eraNetwork.erc20BridgeL1,
      erc20BridgeL2: eraNetwork.erc20BridgeL2,
      l1Gateway: eraNetwork.l1Gateway,
    });
    provider.setIsEthGasToken(eraNetwork.isEthGasToken ?? true);
    return provider;
  };
  const getWithdrawalStatus = async (transaction: TransactionInfo) => {
    if (!transaction.info.withdrawalFinalizationAvailable) {
      const transactionDetails = await request(transaction.gateway).getTransactionDetails(transaction.transactionHash);
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
    const transactionReceipt = await request(transaction.gateway).getTransactionReceipt(transaction.transactionHash);
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
