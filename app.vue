<template>
  <NuxtLayout>
    <slot />
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useZkSyncWithdrawalsStore } from "@/store/zksync/withdrawals";
import { trackPage } from "@/utils/analytics";

useZkSyncWithdrawalsStore().updateWithdrawalsIfPossible(); // init store to update withdrawals

const isMaintenance = true;
const route = useRoute();
const router = useRouter();

watch(
  () => route.path,
  () => {
    trackPage();
    if (isMaintenance) {
      router.push("/maintenance");
    }
  },
  { immediate: true }
);
</script>
