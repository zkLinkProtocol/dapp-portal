import { getPublicClient } from "@wagmi/core";
import { ethers } from "ethers";
import { $fetch } from "ofetch";

import useNetworks from "@/composables/useNetworks";

import { abi as secondaryAbi } from "@/views/transactions/ZkLink.json";
import type { ZkSyncNetwork } from "@/data/networks";
import type { Api } from "@/types";
import type { Config } from "@wagmi/core";

import { useDestinationsStore } from "@/store/destinations";
import { useNetworkStore } from "@/store/network";
import { useOnboardStore } from "@/store/onboard";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { useZkSyncTransactionStatusStore, WITHDRAWAL_DELAY } from "@/store/zksync/transactionStatus";
import { useZkSyncWalletStore } from "@/store/zksync/wallet";
import { Provider } from "@/zksync-web3-nova/src";
import { Wallet } from "@/zksync-web3-nova/src";

const FETCH_TIME_LIMIT = 31 * 24 * 60 * 60 * 1000; // 31 days

export const useZkSyncWithdrawalsStore = defineStore("zkSyncWithdrawals", () => {
  const onboardStore = useOnboardStore();
  const providerStore = useZkSyncProviderStore();
  const transactionStatusStore = useZkSyncTransactionStatusStore();
  const { account, isConnected } = storeToRefs(onboardStore);
  const { eraNetwork } = storeToRefs(providerStore);
  const { userTransactions } = storeToRefs(transactionStatusStore);
  const { destinations } = storeToRefs(useDestinationsStore());
  const eraWalletStore = useZkSyncWalletStore();

  const TRANSACTIONS_FETCH_LIMIT = 100;

  const DELAY_DAYS = process.env.NODE_TYPE === "nexus-sepolia" ? 1 : 7;

  const isWithinDelayDays = (timestamp: number | string) => {
    return Date.now() - new Date(timestamp).getTime() < DELAY_DAYS * 24 * 60 * 60 * 1000;
  };

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 对于提到从链的提现：
* 条件1：查linea上zklink合约的isEthWithdrawalFinalized：

  * _l2BatchNumber
  * _l2MessageIndex

  getTransactionReceipt（novaTxHash)

* 条件2：查从链的zklink合约的totalBatchesExecuted，查出来的值必须要>=nova上的提现hash去查所在batch高度

  对于eth 提现需要满足 条件1和条件2， 对于erc20， 只需要满足条件2
   * @param transactionHash 
   * @returns 
   */

  const isEthWithdrawalFinalizedOnPrimary = async (transactionHash: ethers.utils.BytesLike) => {
    const isFinalized = await eraWalletStore
      .getPrimaryL1VoidSigner()
      .isWithdrawalFinalized(transactionHash)
      .catch(() => false);
    return isFinalized;
  };

  const getTotalBatchesExecuted = async (obj: {
    transactionHash: ethers.utils.BytesLike;
    status: string;
    gateway: string;
  }) => {
    const { primaryNetwork, zkSyncNetworks, getNetworkInfo } = useNetworks();
    const { selectedNetwork } = storeToRefs(useNetworkStore());

    const eraNetwork = getNetworkInfo(obj) || selectedNetwork.value;
    const publicClient = getPublicClient(onboardStore.wagmiConfig as Config, {
      chainId: eraNetwork.l1Network?.id,
    });
    const res = await publicClient?.readContract({
      address: eraNetwork.mainContract as `0x${string}`,
      abi: secondaryAbi,
      functionName: "totalBatchesExecuted",
    });
    console.log("totalBatchesExecuted: ", res);
    return res as bigint;
  };

  const checkWithdrawalFinalizeAvailable = async (withdrawal: {
    transactionHash: ethers.utils.BytesLike;
    status: string;
    gateway: string;
    [key: string]: any;
  }) => {
    const { primaryNetwork, zkSyncNetworks, getNetworkInfo } = useNetworks();
    const { selectedNetwork } = storeToRefs(useNetworkStore());
    let provider: Provider | undefined;
    let eraNetworks: ZkSyncNetwork;
    let obj = {};
    const request = () => {
      eraNetworks = getNetworkInfo(withdrawal) || selectedNetwork.value;
      obj = {
        iconUrl: eraNetworks.logoUrl,
        key: "nova",
        label: eraNetworks?.l1Network?.name,
      };
      if (!provider) {
        provider = new Provider(eraNetworks.rpcUrl);
      }
      //if provider.networkKey != eraNetwork.key
      provider.setContractAddresses(eraNetworks.key, {
        mainContract: eraNetworks.mainContract,
        erc20BridgeL1: eraNetworks.erc20BridgeL1,
        erc20BridgeL2: eraNetworks.erc20BridgeL2,
        l1Gateway: eraNetworks.l1Gateway,
        wethContract: eraNetworks.wethContract,
      });
      provider.setIsEthGasToken(eraNetworks.isEthGasToken ?? true);
      return provider;
    };
    const transactionDetails = await retry(() => request().getTransactionDetails(withdrawal.transactionHash));
    let claimable = false;
    if (transactionDetails.status === "verified") {
      const eraNetwork = getNetworkInfo(withdrawal) || selectedNetwork.value;
      if (eraNetwork.key === "primary") {
        claimable = true;
      } else {
        const { l1BatchNumber, l1BatchTxIndex } = await request().getTransactionReceipt(
          withdrawal.transactionHash as string
        );
        const totalBatchesExecuted = await getTotalBatchesExecuted(withdrawal);
        if (withdrawal.token.symbol === "ETH") {
          const status = await isEthWithdrawalFinalizedOnPrimary(withdrawal.transactionHash);
          console.log("status: ", status, withdrawal);
          claimable = status && totalBatchesExecuted >= l1BatchNumber;
        } else {
          claimable = totalBatchesExecuted >= l1BatchNumber;
        }
      }
    }
    return claimable;
  };

  const setStatus = async (obj: { transactionHash: ethers.utils.BytesLike; status: string; gateway: string }) => {
    const { primaryNetwork, zkSyncNetworks, getNetworkInfo } = useNetworks();

    const { selectedNetwork } = storeToRefs(useNetworkStore());
    let provider: Provider | undefined;
    const request = () => {
      const eraNetwork = getNetworkInfo(obj) || selectedNetwork.value;
      if (!provider) {
        provider = new Provider(eraNetwork.rpcUrl);
      }
      provider.setContractAddresses(eraNetwork.key, {
        mainContract: eraNetwork.mainContract,
        erc20BridgeL1: eraNetwork.erc20BridgeL1,
        erc20BridgeL2: eraNetwork.erc20BridgeL2,
        l1Gateway: eraNetwork.l1Gateway,
        wethContract: eraNetwork.wethContract,
      });
      provider.setIsEthGasToken(eraNetwork.isEthGasToken ?? true);
      return provider;
    };

    const web3Provider = new ethers.providers.Web3Provider(
      getPublicClient(onboardStore.wagmiConfig as Config, {
        chainId: getNetworkInfo(obj).l1Network?.id,
      }) as ethers.providers.ExternalProvider,
      "any"
    );
    const wallet = new Wallet(
      "0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110",
      request(),
      web3Provider
    );
    const isFinalized = await wallet.isWithdrawalFinalized(obj.transactionHash).catch(() => false);
    obj.status = isFinalized ? "Finalized" : "";
    return isFinalized;
  };
  const updateWithdrawals = async () => {
    if (!isConnected.value) throw new Error("Account is not available");
    if (!eraNetwork.value.withdrawalFinalizerApi)
      throw new Error(`Withdrawal Finalizer API is not available on ${eraNetwork.value.name}`);
    if (!eraNetwork.value.blockExplorerApi)
      throw new Error(`Block Explorer API is not available on ${eraNetwork.value.name}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transfers: { items: any[] } = await $fetch(
      `${eraNetwork.value.blockExplorerApi}/address/${
        account.value.address
      }/transfers?limit=${TRANSACTIONS_FETCH_LIMIT.toString()}`
    );
    const withdrawals = transfers.items.filter((e) => e.type === "withdrawal" && e.token && e.amount);
    for (const withdrawal of withdrawals) {
      if (isWithinDelayDays(withdrawal.timestamp)) continue;
      const { primaryNetwork, zkSyncNetworks, getNetworkInfo } = useNetworks();
      const transactionFromStorage = transactionStatusStore.getTransaction(withdrawal.transactionHash);
      if (transactionFromStorage) {
        if (!transactionFromStorage.info.withdrawalFinalizationAvailable) {
          const status = await checkWithdrawalFinalizeAvailable(transactionFromStorage);
          if (status) {
            transactionStatusStore.updateTransactionData(withdrawal.transactionHash, {
              ...transactionFromStorage,
              info: {
                ...transactionFromStorage.info,
                withdrawalFinalizationAvailable: true,
              },
            });
          }
        } else if (!transactionFromStorage.info.completed) {
          await setStatus(withdrawal);
          await sleep(200);
          if (withdrawal.status === "Finalized") {
            transactionStatusStore.updateTransactionData(withdrawal.transactionHash, {
              ...transactionFromStorage,
              info: {
                ...transactionFromStorage.info,
                completed: true,
              },
            });
          }
        }
        continue;
      } else {
        await setStatus(withdrawal);
        await sleep(200);
      }
      const transactionTransfers: Api.Response.Collection<Api.Response.Transfer> = await $fetch(
        `${eraNetwork.value.blockExplorerApi}/transactions/${withdrawal.transactionHash}/transfers?limit=100&page=1`
      );
      const transfers = transactionTransfers.items.map(mapApiTransfer);
      const withdrawalTransfer = transfers.find((e) => e.type === "withdrawal" && e.token && e.amount);
      if (!withdrawalTransfer) continue;
      if (new Date(withdrawalTransfer.timestamp).getTime() < Date.now() - FETCH_TIME_LIMIT) break;
      const { selectedNetwork } = storeToRefs(useNetworkStore());
      const eraNetworks = getNetworkInfo(withdrawal) || selectedNetwork.value;
      const obj = {
        iconUrl: eraNetworks.logoUrl,
        key: "nova",
        label: eraNetworks?.l1Network?.name,
      };
      const claimable = await checkWithdrawalFinalizeAvailable(withdrawal);
      transactionStatusStore.saveTransaction({
        type: "withdrawal",
        transactionHash: withdrawal.transactionHash,
        timestamp: withdrawalTransfer.timestamp,
        token: {
          ...withdrawalTransfer.token!,
          amount: withdrawalTransfer.amount!,
        },
        from: {
          address: withdrawalTransfer.from,
          destination: destinations.value.nova,
        },
        to: {
          address: withdrawalTransfer.to,
          destination: obj,
        },
        info: {
          expectedCompleteTimestamp: new Date(
            new Date(withdrawalTransfer.timestamp).getTime() + WITHDRAWAL_DELAY
          ).toISOString(),
          completed: withdrawal.status === "Finalized",
          withdrawalFinalizationAvailable: claimable,
        },
        gateway: withdrawalTransfer.gateway,
      });
    }
  };

  const withdrawalsAvailableForClaiming = computed(() =>
    userTransactions.value.filter(
      (tx) => tx.type === "withdrawal" && !tx.info.completed && tx.info.withdrawalFinalizationAvailable
    )
  );

  const updateWithdrawalsIfPossible = async () => {
    if (!isConnected.value || !eraNetwork.value.blockExplorerApi || !eraNetwork.value.withdrawalFinalizerApi) {
      return;
    }
    await updateWithdrawals();
  };
  const { reset: resetAutoUpdate, stop: stopAutoUpdate } = useInterval(() => {
    updateWithdrawals();
  }, 60_000);

  onboardStore.subscribeOnAccountChange((account) => {
    if (account) {
      resetAutoUpdate();
      updateWithdrawals();
    } else {
      stopAutoUpdate();
    }
  });

  return {
    withdrawalsAvailableForClaiming,
    updateWithdrawals,
    updateWithdrawalsIfPossible,
    checkWithdrawalFinalizeAvailable,
    setStatus,
  };
});
