<template>
  <div class="transaction-footer">
    <!-- Change network -->
    <transition v-bind="TransitionAlertScaleInOutTransition">
      <CommonErrorBlock
        v-if="buttonStep === 'network' && switchingNetworkError"
        class="mb-2"
        @try-again="onboardStore.setCorrectNetwork(getNetworkInfo().l1Network?.id)"
      >
        Network change error: {{ switchingNetworkError.message }}
      </CommonErrorBlock>
    </transition>
    <div v-if="buttonStep === 'connect'" class="transaction-footer-row">
      <CommonButton variant="primary" :disabled="isConnectingWallet" class="w-full" @click="onboardStore.openModal">
        Connect wallet
      </CommonButton>
    </div>
    <div v-if="buttonStep === 'network'" class="transaction-footer-row">
      <CommonButtonTopInfo>Incorrect network selected in your wallet</CommonButtonTopInfo>
      <template v-if="l1Network">
        <CommonButton
          v-if="connectorName !== 'WalletConnect'"
          type="submit"
          :disabled="switchingNetworkInProgress"
          variant="primary"
          class="w-full"
          @click="onboardStore.setCorrectNetwork(getNetworkInfo().l1Network?.id)"
        >
          <slot v-bind="{ l1Network, walletName }" name="change-network-auto">
            Change wallet network to {{ l1Network.name }}
          </slot>
        </CommonButton>
        <!--//TODO not only Binance Web3-->
        <CommonButton v-else-if="walletName === 'Binance Web3'" disabled variant="primary" class="w-full">
          <slot v-bind="{ l1Network, walletName }" name="change-network-manual">
            The current version of your {{ walletName }} wallet may not support {{ l1Network.name }}
          </slot>
        </CommonButton>
        <CommonButton v-else-if="walletName === 'OKX'" disabled variant="primary" class="w-full">
          <slot v-bind="{ l1Network, walletName }" name="change-network-manual">
            Switching chain through WalletConnect failed. Please refresh the page and try again.
          </slot>
        </CommonButton>
        <!--//TODO metamask wallect connect cannot work, add manually switch network-->
        <CommonButton v-else disabled variant="primary" class="w-full">
          <slot v-bind="{ l1Network, walletName }" name="change-network-manual">
            Change network manually to {{ l1Network.name }} in your {{ walletName }} wallet
          </slot>
        </CommonButton>
      </template>
      <template v-else>
        <CommonButton disabled variant="primary" class="w-full">
          L1 network is not available on {{ selectedNetwork.name }}
        </CommonButton>
      </template>
    </div>
    <div v-else-if="buttonStep === 'continue'" class="transaction-footer-row">
      <slot name="after-checks" />
    </div>

    <TransactionButtonUnderlineContinueInWallet :opened="continueInWalletTipDisplayed" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import { storeToRefs } from "pinia";

import useNetworks from "@/composables/useNetworks";

import type { TransactionInfo } from "@/store/zksync/transactionStatus";
import type { PropType } from "vue";

import { useNetworkStore } from "@/store/network";
import { useOnboardStore } from "@/store/onboard";
import { TransitionAlertScaleInOutTransition } from "@/utils/transitions";

const props = defineProps({
  transaction: {
    type: Object as PropType<TransactionInfo>,
    required: true,
  },
});
const emit = defineEmits<{
  (eventName: "update:opened", value: boolean): void;
  (eventName: "update:networkKey", networkKey?: string): void;
}>();
const onboardStore = useOnboardStore();
const {
  account,
  isConnectingWallet,
  isCorrectNetworkSet,
  switchingNetworkInProgress,
  switchingNetworkError,
  connectorName,
  walletName,
  network,
} = storeToRefs(onboardStore);
const { selectedNetwork, l1Network } = storeToRefs(useNetworkStore());
const { primaryNetwork, zkSyncNetworks } = useNetworks();
const getNetworkInfo = () => {
  const newNetwork = zkSyncNetworks.find(
    (item) => item.l1Gateway && item.l1Gateway.toLowerCase() === props.transaction?.gateway?.toLowerCase()
  );
  const obj = { l1Network: { id: l1Network.value?.id } };
  return props.transaction ? newNetwork ?? primaryNetwork : obj;
};

const buttonStep = computed(() => {
  console.log("buttonStep getNetworkInfo().l1Network?.id", getNetworkInfo().l1Network?.id);
  console.log("buttonStep network.value.chain?.id", network.value.chain?.id);
  if (!account.value.address || isConnectingWallet.value) {
    return "connect";
  } else if (!(network.value.chain?.id === getNetworkInfo().l1Network?.id)) {
    return "network";
  } else {
    return "continue";
  }
});

const continueInWalletTipDisplayed = computed(() => {
  if (buttonStep.value === "network" && switchingNetworkInProgress.value) {
    return true;
  }
  return false;
});
</script>

<style lang="scss" scoped>
.transaction-footer {
  @apply sticky bottom-0 z-10 flex flex-col items-center bg-neutral-50/60 bg-opacity-60 pb-2 pt-4 backdrop-blur-sm dark:bg-black dark:bg-opacity-60;

  .transaction-footer-row {
    @apply flex w-full flex-col items-center;
  }
}
</style>
