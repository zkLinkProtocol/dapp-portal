<template>
  <!-- <LoadersConnecting /> -->
  <ModalConnectingWalletError />
  <!-- <ModalNetworkChangedWarning v-if="!isConnectingWallet" /> -->
  <ModalLegalNotice />

  <div class="app-layout">
    <ModalWalletWarning />

    <Header v-if="showHeaderFooter" />
    <main class="app-layout-main">
      <NuxtPage />
    </main>
    <Footer v-if="showHeaderFooter" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
const showHeaderFooter = computed(() => {
  return !window.location.pathname.includes("integrate");
});
</script>

<style lang="scss" scoped>
.app-layout {
  @apply grid;
  min-height: 100vh;
  min-height: 100dvh;
  grid-template-rows: auto 1fr max-content;

  .app-layout-main {
    @apply flex min-h-0 w-full min-w-0 max-w-[700px] flex-col justify-self-center p-2 md:px-0 md:py-4;
  }
}
</style>
