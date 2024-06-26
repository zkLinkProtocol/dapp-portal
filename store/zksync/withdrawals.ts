import { getBalance, getPublicClient } from "@wagmi/core";
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
import {
  useZkSyncTransactionStatusStore,
  WITHDRAWAL_DELAY,
  WITHDRAWAL_CHECK_DELAY_DAYS,
} from "@/store/zksync/transactionStatus";
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
  const wagmiConfig = onboardStore.wagmiConfig;
  const { getNetworkInfo } = useNetworks();
  const { selectedNetwork } = storeToRefs(useNetworkStore());

  const TRANSACTIONS_FETCH_LIMIT = 100; // may miss claimable tx when user address has many txs;

  const isWithinDelayDays = (timestamp: number | string) => {
    return Date.now() - new Date(timestamp).getTime() < WITHDRAWAL_CHECK_DELAY_DAYS * 24 * 60 * 60 * 1000;
  };

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * for withdrawal to secondary chain：
* condition 1: call zklink contract's isEthWithdrawalFinalized on Linea

  * _l2BatchNumber
  * _l2MessageIndex

  getTransactionReceipt（novaTxHash)

* condition 2：call zklink contract's totalBatchesExecuted on secondary chain, result >= l1batchnumber of the withdrawal transaction hash
  for eth need both condition 1 and 2;， for erc20, only need condition2
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

  const isETHBalanceEnoughForClaim = async (withdrawal: {
    transactionHash: ethers.utils.BytesLike;
    status: string;
    gateway: string;
    [key: string]: any;
  }) => {
    const eraNetwork = getNetworkInfo(withdrawal) || selectedNetwork.value;
    const ethBalance = await getBalance(wagmiConfig as Config, {
      address: eraNetwork.mainContract!,
      chainId: eraNetwork.l1Network?.id,
      token: undefined,
    });
    return !!ethBalance.value && ethBalance.value > Number(withdrawal.token.amount);
  };

  const checkWithdrawalFinalizeAvailable = async (withdrawal: TransactionInfo) => {
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
          const isEthBalanceEnough = await isETHBalanceEnoughForClaim(withdrawal);
          claimable = status && totalBatchesExecuted >= l1BatchNumber && isEthBalanceEnough;
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
      }/withdrawalTransfers?limit=${TRANSACTIONS_FETCH_LIMIT.toString()}`
    );
    const withdrawals = transfers.items.filter((e) => e.type === "withdrawal" && e.token && e.amount);
    for (const withdrawal of withdrawals) {
      const { primaryNetwork, zkSyncNetworks, getNetworkInfo } = useNetworks();

      const transactionFromStorage = transactionStatusStore.getTransaction(withdrawal.transactionHash);
      if (transactionFromStorage) {
        // check if tx.to.destination is matching with tx.token.networkKey for erc20
        if (
          transactionFromStorage.to.destination.key !== transactionFromStorage.token.networkKey &&
          transactionFromStorage.token.symbol !== "ETH"
        ) {
          const { selectedNetwork } = storeToRefs(useNetworkStore());
          const eraNetworks = getNetworkInfo(withdrawal) || selectedNetwork.value;
          const obj = {
            iconUrl: eraNetworks.logoUrl!,
            key: "nova",
            label: eraNetworks?.l1Network?.name ?? "",
          };
          transactionStatusStore.updateTransactionData(withdrawal.transactionHash, {
            ...transactionFromStorage,
            to: {
              ...transactionFromStorage.to,
              destination: obj,
            },
          });
        }
        if (isWithinDelayDays(withdrawal.timestamp)) continue;
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
        } else {
          // recheck claimable status
          const status = await checkWithdrawalFinalizeAvailable(transactionFromStorage);
          if (!status) {
            transactionStatusStore.updateTransactionData(withdrawal.transactionHash, {
              ...transactionFromStorage,
              info: {
                ...transactionFromStorage.info,
                withdrawalFinalizationAvailable: false,
              },
            });
          }
        }

        if (!transactionFromStorage.info.completed) {
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
            new Date(withdrawalTransfer.timestamp).getTime() +
              getEstimateWithdrawalDelayDays(withdrawalTransfer.timestamp) * 24 * 3600 * 1000
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
  }, 5 * 60_000);

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
