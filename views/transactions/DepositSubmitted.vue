<template>
  <div>
    <h1 class="h1 mt-block-gap-1/2 text-center">
      {{ transaction.info.completed ? "Transaction completed" : "Transaction submitted" }}
    </h1>
    <CommonHeightTransition :opened="!transaction.info.completed">
      <p class="mb-4 text-center">
        Your funds will be available after the transaction is committed on
        <span class="font-medium">{{ transaction.from.destination.label }}</span> and then processed on
        <span class="font-medium">{{ transaction.to.destination.label }}</span
        >. You are free to close this page.
      </p>
    </CommonHeightTransition>
    <TransactionProgress
      :from-address="transaction!.from.address"
      :from-destination="transaction!.from.destination"
      :from-explorer-link="l1BlockExplorerUrl"
      :from-transaction-hash="transaction.transactionHash"
      :to-address="transaction!.to.address"
      :to-destination="transaction!.to.destination"
      :to-explorer-link="blockExplorerUrl"
      :to-transaction-hash="transaction.info.toTransactionHash"
      :expected-complete-timestamp="transaction.info.expectedCompleteTimestamp"
      :token="transaction!.token"
      :completed="transaction.info.completed"
    />

    <EcosystemBlock v-if="eraNetwork.displaySettings?.showPartnerLinks" class="mt-block-gap" />
    <CommonButton
      v-if="!fromLink"
      size="sm"
      :as="makeAnotherTransaction ? undefined : 'RouterLink'"
      :to="{ name: 'index' }"
      class="mx-auto mt-block-gap w-max"
      @click="makeAnotherTransaction && makeAnotherTransaction()"
    >
      Make another transaction
    </CommonButton>
    <CommonButton size="sm" v-if="fromLink" class="mx-auto mt-block-gap w-max" @click="handleGoBack()">
      Go Back
    </CommonButton>
  </div>
</template>

<script lang="ts" setup>
import { useRouteQuery } from "@vueuse/router";
import { storeToRefs } from "pinia";

import useNetworks from "@/composables/useNetworks";

import type { TransactionInfo } from "@/store/zksync/transactionStatus";
import type { PropType } from "vue";

import { useZkSyncProviderStore } from "@/store/zksync/provider";

const fromLink = useRouteQuery<string | undefined>("fromLink", "", {
  transform: String,
  mode: "replace",
});

const handleGoBack = () => {
  window.open(fromLink.value as string, "_self");
};

const { primaryNetwork, zkSyncNetworks, getNetworkInfo } = useNetworks();
let prop = defineProps({
  transaction: {
    type: Object as PropType<TransactionInfo>,
    required: true,
  },
  makeAnotherTransaction: {
    type: Function as PropType<() => void>,
    required: false,
  },
});

const l1BlockExplorerUrl = getNetworkInfo(prop.transaction)?.l1Network?.blockExplorers?.default.url;
const { eraNetwork, blockExplorerUrl } = storeToRefs(useZkSyncProviderStore());
</script>
