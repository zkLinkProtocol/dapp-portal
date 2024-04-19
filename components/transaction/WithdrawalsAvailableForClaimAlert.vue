<template>
  <CommonHeightTransition :opened="!!withdrawalsAvailableForClaiming.length">
    <CommonAlert variant="warning" :icon="ExclamationTriangleIcon" class="mb-block-gap">
      <p>You have withdrawals available for claiming on {{ newNetwork?.l1Network?.name }} network</p>
      <CommonButton as="RouterLink" :to="{ name: 'transfers' }" variant="primary">
        <span class="whitespace-nowrap">See withdrawals</span>
      </CommonButton>
    </CommonAlert>
  </CommonHeightTransition>
</template>

<script lang="ts" setup>
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";
import { storeToRefs } from "pinia";

import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { useZkSyncWithdrawalsStore } from "@/store/zksync/withdrawals";
import useNetworks from "@/composables/useNetworks";

const { eraNetwork } = storeToRefs(useZkSyncProviderStore());
const { withdrawalsAvailableForClaiming } = storeToRefs(useZkSyncWithdrawalsStore());
const { primaryNetwork, zkSyncNetworks } = useNetworks();
const getNetworkInfo = () => {
  const newNetwork = zkSyncNetworks.find(
    (item) => item.l1Gateway && item.l1Gateway.toLowerCase() === withdrawalsAvailableForClaiming.value[0].gateway?.toLowerCase()
  );
  return newNetwork ?? primaryNetwork;
};
const newNetwork = computed(() => {
  if (withdrawalsAvailableForClaiming.value.length> 0) {
    if (withdrawalsAvailableForClaiming.value[0].gateway) {
      getNetworkInfo()
    } else {
      let obj = zkSyncNetworks.find(
        (item) => item.key && item.key.toLowerCase() === (withdrawalsAvailableForClaiming.value[0].token?.networkKey || 'primary').toLowerCase()
      )
      return obj ?? primaryNetwork;
    }
  }
})
</script>
