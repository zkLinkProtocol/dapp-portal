<template>
  <ModalTransactionDepositUnavailable />

  <div v-if="depositDisabled">
    <PageTitle>Bridge</PageTitle>
    <CommonAlert variant="warning" :icon="ExclamationTriangleIcon" class="mb-block-gap">
      <p>
        We are updating our systems. To prevent any inconveniences, bridging to
        {{ eraNetwork.name }} is temporarily disabled. Please check back in 15-30 minutes.
      </p>
    </CommonAlert>

    <div class="mt-5 flex flex-wrap items-center justify-center gap-block-gap">
      <CommonButton as="RouterLink" :to="{ name: 'assets' }" size="xs">Go to Assets page</CommonButton>
      <CommonButton size="xs" as="RouterLink" :to="{ name: 'withdraw' }">
        Bridge to {{ destinations.arbitrum.label }}
      </CommonButton>
    </div>
  </div>
  <DepositView v-else />
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";
import { storeToRefs } from "pinia";

import { useDestinationsStore } from "@/store/destinations";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { useNetworkStore } from "@/store/network";
import DepositView from "@/views/transactions/Deposit.vue";

const emit = defineEmits<{
  (eventName: "update:networkKey", networkKey?: string): void;
}>();
const route = useRoute();
const router = useRouter();
const { destinations } = storeToRefs(useDestinationsStore());
const { eraNetwork } = storeToRefs(useZkSyncProviderStore());
const networkStore = useNetworkStore();
const depositDisabled = computed(() => eraNetwork.value.key === "scrollsepolia");

// stop deposit for ops network.
onMounted(() => {
  const opsNetworks = ["optimism", "arbitrum", "base", "mantle", "manta"];
  const networkParam = route.query.network;

  if (opsNetworks.includes(networkParam as string)) {
    const newQuery = { ...route.query, network: "ethereum" };

    networkStore.selectedNetworkKey = "ethereum";
    emit("update:networkKey", "ethereum");

    router.replace({
      path: route.path,
      query: newQuery,
    });
  }
});
</script>

<style lang="scss" scoped></style>
