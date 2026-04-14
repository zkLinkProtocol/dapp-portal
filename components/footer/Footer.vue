<template>
  <footer class="footer">
    <div>
      <CommonButtonLabel v-if="showAddNetworkButton" @click="addNetworkToWallet()">
        Add {{ eraNetwork.name }} to your wallet
      </CommonButtonLabel>
    </div>
    <div class="links-container">
      <span v-if="isHomePage" class="deploy-badge" aria-label="Test deployment marker">TEST DEPLOY</span>
      <!-- <CommonButtonLabel as="a" href="https://zksync.io/terms" target="_blank" class="footer-link">
        Terms of Service
      </CommonButtonLabel>
      <CommonButtonLabel as="a" href="https://zksync.io/privacy" target="_blank" class="footer-link">
        Privacy Policy
      </CommonButtonLabel> -->
    </div>
  </footer>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

import { storeToRefs } from "pinia";

import { useOnboardStore } from "@/store/onboard";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { useZkSyncWalletStore } from "@/store/zksync/wallet";

const route = useRoute();
const eraWalletStore = useZkSyncWalletStore();
const { isCorrectNetworkSet } = storeToRefs(eraWalletStore);
const { isConnected, connectorName } = storeToRefs(useOnboardStore());
const { eraNetwork } = storeToRefs(useZkSyncProviderStore());
const addNetworkToWallet = async () => {
  await eraWalletStore.setCorrectNetwork();
};

const showAddNetworkButton = computed(() => {
  return isConnected.value && !isCorrectNetworkSet.value && connectorName.value !== "WalletConnect";
});

const isHomePage = computed(() => route.path === "/");
</script>

<style lang="scss" scoped>
.footer {
  @apply flex flex-col items-center justify-between gap-x-8 gap-y-4 px-4 py-8 sm:flex-row;

  .links-container {
    @apply flex w-max flex-wrap items-center justify-center gap-x-8 gap-y-4 whitespace-nowrap;
  }

  .deploy-badge {
    @apply rounded-full border border-neutral-700/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-500;
    pointer-events: none;
    user-select: none;
  }
}
</style>
