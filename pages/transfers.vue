<template>
  <div>
    <PageTitle>History</PageTitle>

    <template v-if="!isConnected">
      <ConnectWalletBlock>Connect wallet to view your latest transfers on {{ eraNetwork.name }}</ConnectWalletBlock>
    </template>
    <template v-else>
      <template v-if="!loading && recentBridgeOperations.length">
        <TypographyCategoryLabel>Recent bridge operations</TypographyCategoryLabel>
        <div v-if="actionRequiredBridgeTransactions.length" class="space-y-block-gap">
          <CommonCardWithLineButtons v-for="(item, index) in actionRequiredBridgeTransactions" :key="index">
            <TransactionTransferWithdrawalLineItem
              :transfer="item"
              :in-progress="!item.completed"
              as="RouterLink"
              :to="{
                name: 'transaction-hash',
                params: { hash: item.identifierTransactionHash },
                query: { network: eraNetwork.key },
              }"
            />
          </CommonCardWithLineButtons>
        </div>
        <CommonCardWithLineButtons
          v-if="actionNotRequiredBridgeTransactions.length"
          :class="{ 'mt-block-gap': actionRequiredBridgeTransactions.length }"
        >
          <TransactionTransferLineItem
            v-for="(item, index) in actionNotRequiredBridgeTransactions"
            :key="index"
            :transfer="item"
            :in-progress="!item.completed"
            as="RouterLink"
            :to="{
              name: 'transaction-hash',
              params: { hash: item.identifierTransactionHash },
              query: { network: eraNetwork.key },
            }"
          />
        </CommonCardWithLineButtons>
      </template>
      <template v-if="failedTransfers.length">
        <TypographyCategoryLabel>Failed Deposit </TypographyCategoryLabel>

        <CommonCardWithLineButtons>
          <FailedDepositLineItem v-for="(item, index) in failedTransfers" :key="index" :transfer="item" as="a" />
        </CommonCardWithLineButtons>
      </template>
      <div class="flex items-center justify-between" v-if="!hasOnlyRecentBridgeOperations">
        <TypographyCategoryLabel>Completed transfers</TypographyCategoryLabel>
        <div class="flex items-center filter-checkbox">
          <label for="show-deposits-withdrawals-only" class="mr-2">Show Deposits & Withdrawas only</label>
          <input type="checkbox" id="show-deposits-withdrawals-only" v-model="showDepositsWithdrawalsOnly" />
        </div>
      </div>

      <div v-if="loading">
        <CommonCardWithLineButtons>
          <TokenBalanceLoader v-for="index in 5" :key="index" />
        </CommonCardWithLineButtons>
      </div>
      <CommonCardWithLineButtons v-else-if="recentTransfersRequestError">
        <CommonErrorBlock @try-again="fetch">
          Loading transfers error: {{ recentTransfersRequestError.message }}
        </CommonErrorBlock>
      </CommonCardWithLineButtons>
      <div v-else-if="displayedTransfers.length">
        <CommonCardWithLineButtons>
          <TransactionTransferLineItem v-for="(item, index) in displayedTransfers" :key="index" :transfer="item" />
        </CommonCardWithLineButtons>

        <!-- Load more -->
        <template v-if="canLoadMore">
          <div v-if="previousTransfersRequestInProgress" class="mt-block-gap">
            <CommonCardWithLineButtons>
              <TokenBalanceLoader v-for="index in 5" :key="index" />
            </CommonCardWithLineButtons>
          </div>
          <CommonCardWithLineButtons v-else-if="previousTransfersRequestError">
            <CommonErrorBlock @try-again="fetchMore">
              Loading transfers error: {{ previousTransfersRequestError.message }}
            </CommonErrorBlock>
          </CommonCardWithLineButtons>
          <CommonButton v-else ref="loadMoreEl" variant="primary" class="mx-auto mt-4">Load more</CommonButton>
        </template>
      </div>
      <CommonCardWithLineButtons v-else-if="!hasOnlyRecentBridgeOperations">
        <CommonEmptyBlock>
          At the moment you don't have any transfers on
          <span class="font-medium">{{ destinations.era.label }}</span>
        </CommonEmptyBlock>
      </CommonCardWithLineButtons>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref } from "vue";

import { useIntersectionObserver } from "@vueuse/core";
import { storeToRefs } from "pinia";

import useSingleLoading from "@/composables/useSingleLoading";

import type { Transfer } from "@/utils/mappers";

import { getWaitTime } from "@/data/networks";
import { useDestinationsStore } from "@/store/destinations";
import { useOnboardStore } from "@/store/onboard";
import { useFailedDepositHistoryStore } from "@/store/zksync/failedDepositHistory";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { getEstmatdDepositDelay, WITHDRAWAL_DELAY } from "@/store/zksync/transactionStatus";
import { useZkSyncTransactionStatusStore } from "@/store/zksync/transactionStatus";
import { useZkSyncTransfersHistoryStore } from "@/store/zksync/transfersHistory";
import FailedDepositLineItem from "~/components/transaction/FailedDepositLineItem.vue";

const onboardStore = useOnboardStore();
const { eraNetwork } = storeToRefs(useZkSyncProviderStore());
const transfersHistoryStore = useZkSyncTransfersHistoryStore();
const failedDepositHistory = useFailedDepositHistoryStore();
const { isConnected } = storeToRefs(onboardStore);
const {
  transfers,
  recentTransfersRequestInProgress,
  recentTransfersRequestError,
  canLoadMore,
  previousTransfersRequestInProgress,
  previousTransfersRequestError,
} = storeToRefs(transfersHistoryStore);
const { failedTransfers } = storeToRefs(failedDepositHistory);

const showDepositsWithdrawalsOnly = ref(true);

console.log("failedTransfers : ", failedTransfers.value);
const { destinations } = storeToRefs(useDestinationsStore());
const { userTransactions } = storeToRefs(useZkSyncTransactionStatusStore());
type RecentBridgeOperation = Transfer & {
  identifierTransactionHash: string;
  completed: boolean;
  finalizationAvailable?: boolean;
};
const recentBridgeOperations = computed<RecentBridgeOperation[]>(() => {
  const recent = userTransactions.value.filter(
    (tx) =>
      (tx.type === "withdrawal" && !tx.info.completed) ||
      (tx.type === "deposit" &&
        new Date(tx.timestamp).getTime() + getWaitTime(eraNetwork.value.l1Network?.id)[0] > new Date().getTime())
  );

  return [
    ...recent.map((tx) => {
      return {
        transactionHash: tx.type === "deposit" ? tx.info.toTransactionHash || null : tx.transactionHash,
        identifierTransactionHash: tx.transactionHash,
        type: tx.type,
        from: tx.from.address,
        to: tx.to.address,
        fromNetwork: tx.type === "deposit" ? "L1" : "L2",
        toNetwork: tx.type === "deposit" ? "L2" : "L1",
        amount: tx.token.amount,
        token: tx.token,
        timestamp: tx.timestamp,
        completed: tx.info.completed,
        finalizationAvailable:
          tx.type === "withdrawal" ? !tx.info.completed && tx.info.withdrawalFinalizationAvailable : undefined,
        gateway: tx.gateway,
      } as RecentBridgeOperation;
    }),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
});

const actionRequiredBridgeTransactions = computed(() =>
  recentBridgeOperations.value.filter((e) => e.finalizationAvailable)
);

const actionNotRequiredBridgeTransactions = computed(() => {
  const actionRequiredHashes = actionRequiredBridgeTransactions.value.map((e) => e.transactionHash);
  return recentBridgeOperations.value.filter((e) => !actionRequiredHashes.includes(e.transactionHash));
});
const displayedTransfers = computed(() => {
  return transfers.value
    .filter((transfer) => !recentBridgeOperations.value.find((tx) => tx.transactionHash === transfer.transactionHash))
    .filter((item) =>
      showDepositsWithdrawalsOnly.value ? item.type === "deposit" || item.type === "withdrawal" : true
    );
});
const hasOnlyRecentBridgeOperations = computed(() => {
  return !displayedTransfers.value.length && recentBridgeOperations.value.length && !recentTransfersRequestError.value;
});
const { loading, reset: resetSingleLoading } = useSingleLoading(recentTransfersRequestInProgress);

const fetch = () => {
  if (!isConnected.value) return;
  transfersHistoryStore.requestRecentTransfers();
  failedDepositHistory.requestFailedDepositTransfers();
  transfersHistoryStore.requestWithdrawals();
};
fetch();

const unsubscribe = onboardStore.subscribeOnAccountChange((newAddress) => {
  if (!newAddress) return;
  resetSingleLoading();
  fetch();
});

const loadMoreEl = ref(null);
const fetchMore = () => {
  transfersHistoryStore.requestPreviousTransfers();
  failedDepositHistory.requestFailedDepositTransfers();
};
const { stop: stopLoadMoreObserver } = useIntersectionObserver(loadMoreEl, ([{ isIntersecting }]) => {
  if (isIntersecting) {
    fetchMore();
  }
});

onBeforeUnmount(() => {
  unsubscribe();
  stopLoadMoreObserver();
});
</script>

<style lang="scss" scoped>
.filter-checkbox {
  color: #9ca2ae;
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px; /* 125% */
}
</style>
