import { getPublicClient } from "@wagmi/core";
import { ethers } from "ethers";
import { $fetch } from "ofetch";

import useNetworks from "@/composables/useNetworks";

import type { ZkSyncNetwork } from "@/data/networks";
import type { Api } from "@/types";
import type { Config } from "@wagmi/core";

import { useDestinationsStore } from "@/store/destinations";
import { useNetworkStore } from "@/store/network";
import { useOnboardStore } from "@/store/onboard";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { useZkSyncTransactionStatusStore, WITHDRAWAL_DELAY } from "@/store/zksync/transactionStatus";
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

  const TRANSACTIONS_FETCH_LIMIT = 50;

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  const setStatus = async (obj: { transactionHash: ethers.utils.BytesLike; status: string; gateway: string }) => {
    const { primaryNetwork, zkSyncNetworks } = useNetworks();

    const getNetworkInfo = () => {
      const newNetwork = zkSyncNetworks.find(
        (item) => item.l1Gateway && item.l1Gateway.toLowerCase() === obj.gateway?.toLowerCase()
      );
      return newNetwork ?? primaryNetwork;
    };

    const { selectedNetwork } = storeToRefs(useNetworkStore());
    let provider: Provider | undefined;
    const request = () => {
      const eraNetwork = getNetworkInfo() || selectedNetwork.value;
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
        chainId: getNetworkInfo().l1Network?.id,
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
      const { primaryNetwork, zkSyncNetworks } = useNetworks();

      const getNetworkInfo = () => {
        const newNetwork = zkSyncNetworks.find(
          (item) => item.l1Gateway && item.l1Gateway.toLowerCase() === withdrawal.gateway?.toLowerCase()
        );
        return newNetwork ?? primaryNetwork;
      };
      const transactionFromStorage = transactionStatusStore.getTransaction(withdrawal.transactionHash);
      if (transactionFromStorage) {
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

      const { selectedNetwork } = storeToRefs(useNetworkStore());
      let provider: Provider | undefined;
      let eraNetworks: ZkSyncNetwork;
      let obj = {};
      const request = () => {
        eraNetworks = getNetworkInfo() || selectedNetwork.value;
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
      if (!withdrawalTransfer) continue;
      if (new Date(withdrawalTransfer.timestamp).getTime() < Date.now() - FETCH_TIME_LIMIT) break;
      const transactionDetails = await retry(() => request().getTransactionDetails(withdrawal.transactionHash));
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
          withdrawalFinalizationAvailable: transactionDetails.status === "verified",
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
  };
});
