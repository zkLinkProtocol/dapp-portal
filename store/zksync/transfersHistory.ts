import useNetworks from "@/composables/useNetworks";
import usePaginatedRequest from "@/composables/zksync/usePaginatedRequest";

import type { Api } from "@/types";
import type { Transfer } from "@/utils/mappers";

import { useDestinationsStore } from "@/store/destinations";
import { useOnboardStore } from "@/store/onboard";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import {
  useZkSyncTransactionStatusStore,
  WITHDRAWAL_CHECK_DELAY_DAYS,
  WITHDRAWAL_DELAY,
} from "@/store/zksync/transactionStatus";
import { useZkSyncWithdrawalsStore } from "@/store/zksync/withdrawals";
import { mapApiTransfer } from "@/utils/mappers";

const TRANSACTIONS_FETCH_LIMIT = 50;

export const useZkSyncTransfersHistoryStore = defineStore("zkSyncTransfersHistory", () => {
  const onboardStore = useOnboardStore();
  const { eraNetwork } = storeToRefs(useZkSyncProviderStore());
  const { account } = storeToRefs(onboardStore);
  const transactionStatusStore = useZkSyncTransactionStatusStore();
  const { userTransactions } = storeToRefs(transactionStatusStore);
  const { destinations } = storeToRefs(useDestinationsStore());
  const { getNetworkInfo } = useNetworks();

  const filterOutDuplicateTransfers = (transfers: Transfer[]) => {
    /*
      Currently BE API Deposit and Withdrawal transaction generate 2 logs:
        1 "transfer" and 1 "deposit" / "withdrawal" depending on the type of the transaction.
      We want to remove the "transfer" from the list for user convenience.
    */
    const transactions = transfers.reduce((acc, transfer) => {
      if (!transfer.transactionHash) {
        return acc;
      }
      if (!acc[transfer.transactionHash]) {
        acc[transfer.transactionHash] = [];
      }
      acc[transfer.transactionHash].push(transfer);
      return acc;
    }, {} as Record<string, Transfer[]>);

    const filteredTransfers = Object.values(transactions).reduce((acc, transfers) => {
      const transfer = transfers.find((e) => e.type === "transfer");
      const depositOrWithdrawal = transfers.find((e) => e.type === "deposit" || e.type === "withdrawal");
      if (
        transfer &&
        depositOrWithdrawal &&
        depositOrWithdrawal.token?.address === transfer.token?.address &&
        depositOrWithdrawal.amount === transfer.amount &&
        ((depositOrWithdrawal.type === "deposit" && depositOrWithdrawal.to === transfer.to) ||
          (depositOrWithdrawal.type === "withdrawal" && depositOrWithdrawal.from === transfer.from))
      ) {
        acc.push(depositOrWithdrawal);
        return acc;
      }
      acc.push(...transfers);
      return acc;
    }, [] as Transfer[]);
    return filteredTransfers.sort((a, b) => new Date(b.timestamp).valueOf() - new Date(a.timestamp).valueOf());
  };

  const {
    canLoadMore,
    loadNext,
    reset: resetPaginatedRequest,
  } = usePaginatedRequest<Api.Response.Transfer>(() => {
    if (!eraNetwork.value.blockExplorerApi)
      throw new Error(`Block Explorer API is not available on ${eraNetwork.value.name}`);

    const url = new URL(`/address/${account.value.address}/transfers`, eraNetwork.value.blockExplorerApi);
    url.searchParams.set("limit", TRANSACTIONS_FETCH_LIMIT.toString());
    return url;
  });
  const transfers = ref<Transfer[]>([]);

  const {
    inProgress: recentTransfersRequestInProgress,
    error: recentTransfersRequestError,
    execute: requestRecentTransfers,
    reset: resetRecentTransfersRequest,
    reload: reloadRecentTransfers,
  } = usePromise(
    async () => {
      if (transfers.value.length) {
        resetPaginatedRequest();
      }
      const response = await loadNext();
      const mappedTransfers = response.items.map(mapApiTransfer);
      useZkSyncWithdrawalsStore().updateWithdrawals();
      transfers.value = filterOutDuplicateTransfers(mappedTransfers);
      //TODO put withdrawals into local storage
      for (const withdrawal of transfers.value.filter((e) => e.type === "withdrawal")) {
        if (!userTransactions.value.find((e) => e.transactionHash === withdrawal.transactionHash)) {
          const eraNetworks = getNetworkInfo(withdrawal);
          const obj = {
            iconUrl: eraNetworks.logoUrl,
            key: "nova",
            label: eraNetworks?.l1Network?.name,
          };
          transactionStatusStore.saveTransaction({
            type: "withdrawal",
            transactionHash: withdrawal.transactionHash!,
            timestamp: withdrawal.timestamp,
            token: {
              ...withdrawal.token!,
              amount: withdrawal.amount!,
            },
            from: {
              address: withdrawal.from,
              destination: destinations.value.nova,
            },
            to: {
              address: withdrawal.to,
              destination: obj,
            },
            info: {
              expectedCompleteTimestamp: new Date(
                new Date(withdrawal.timestamp).getTime() + WITHDRAWAL_DELAY
              ).toISOString(),
              completed: false, // will check internally
              withdrawalFinalizationAvailable: false, // will check internally
            },
            gateway: withdrawal.gateway,
          });
        }
      }
    },
    { cache: 30000 }
  );

  const {
    inProgress: previousTransfersRequestInProgress,
    error: previousTransfersRequestError,
    execute: requestPreviousTransfers,
    reset: resetPreviousTransfersRequest,
  } = usePromise(
    async () => {
      const oldestTransferInTheList = transfers.value[transfers.value.length - 1];
      if (!oldestTransferInTheList) {
        return requestRecentTransfers();
      }
      const response = await loadNext();
      const mappedTransfers = response.items.map((e) => mapApiTransfer(e));
      transfers.value = filterOutDuplicateTransfers([...transfers.value, ...mappedTransfers]);
    },
    { cache: false }
  );

  onboardStore.subscribeOnAccountChange(() => {
    transfers.value = [];
    resetRecentTransfersRequest();
    resetPreviousTransfersRequest();
    resetPaginatedRequest();
  });

  return {
    transfers: computed(() => transfers.value),

    recentTransfersRequestInProgress,
    recentTransfersRequestError,
    requestRecentTransfers,
    reloadRecentTransfers,

    canLoadMore,
    previousTransfersRequestInProgress,
    previousTransfersRequestError,
    requestPreviousTransfers,
  };
});
