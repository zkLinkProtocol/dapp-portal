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
        <CommonButton v-if="isGateWalletUnsupportedChain" disabled variant="primary" class="w-full">
          <slot v-bind="{ l1Network, walletName }" name="change-network-manual">
            The current version of your {{ walletName }} wallet may not support {{ l1Network.name }}
          </slot>
        </CommonButton>
        <CommonButton
          v-else-if="connectorName !== 'WalletConnect'"
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
        <CommonButton
          v-else-if="walletName?.includes('Binance') && l1Network.name.includes('Mantle')"
          disabled
          variant="primary"
          class="w-full"
        >
          <slot v-bind="{ l1Network, walletName }" name="change-network-manual">
            The current version of your {{ walletName }} wallet may not support {{ l1Network.name }}
          </slot>
        </CommonButton>
        <!--//TODO metamask wallect connect cannot work, add manually switch network-->
        <CommonButton v-else-if="walletName === 'MetaMask'" disabled variant="primary" class="w-full">
          <slot v-bind="{ l1Network, walletName }" name="change-network-manual">
            Change network manually to {{ l1Network.name }} in your {{ walletName }} wallet
          </slot>
        </CommonButton>
        <CommonButton
          v-else
          variant="primary"
          class="w-full"
          @click="onboardStore.setCorrectNetwork(getNetworkInfo().l1Network?.id)"
        >
          <slot v-bind="{ l1Network, walletName }" name="change-network-manual">
            Change wallet network to {{ l1Network.name }}
          </slot>
        </CommonButton>
        <template v-if="connectorName === 'WalletConnect'">
          <CommonButtonUnderlineText :opened="!!walletName?.includes('Binance')">If you're using the Binance Web3 Wallet, please update it to the newest version.</CommonButtonUnderlineText>
        </template>
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

import { l1Networks } from "@/data/networks";
import { useNetworkStore } from "@/store/network";
import { useOnboardStore } from "@/store/onboard";
import { TransitionAlertScaleInOutTransition } from "@/utils/transitions";
const props = defineProps({
  transaction: {
    type: Object as PropType<TransactionInfo>,
    required: true,
  },
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const emit = defineEmits<{
  (eventName: "update:opened", value: boolean): void;
  (eventName: "update:networkKey", networkKey?: string): void;
}>();
const onboardStore = useOnboardStore();
const {
  account,
  isConnectingWallet,
  switchingNetworkInProgress,
  switchingNetworkError,
  connectorName,
  walletName,
  network,
} = storeToRefs(onboardStore);
const { selectedNetwork, l1Network } = storeToRefs(useNetworkStore());
const { primaryNetwork, zkSyncNetworks } = useNetworks();
const getNetworkInfo = () => {
  if (props.transaction?.gateway) {
    const newNetwork = zkSyncNetworks.find(
      (item) => item.l1Gateway && item.l1Gateway.toLowerCase() === props.transaction?.gateway?.toLowerCase()
    );
    const obj = { l1Network: { id: l1Network.value?.id } };
    return props.transaction ? newNetwork ?? primaryNetwork : obj;
  } else {
    let obj = zkSyncNetworks.find(
      (item) => item.key && item.key.toLowerCase() === (props.transaction?.token?.networkKey || 'primary').toLowerCase()
    )
    const objs = { l1Network: { id: l1Network.value?.id } };
    return props.transaction ? obj ?? primaryNetwork : objs;
  }
};

const isGateWalletUnsupportedChain = computed(() => {
  const supprotedChainIds = [
    l1Networks.mainnet.id,
    l1Networks.arbitrum.id,
    l1Networks.zkSync.id,
    l1Networks.optimism.id,
  ] as number[];
  return walletName.value?.includes("Gate") && l1Network.value?.id && !supprotedChainIds.includes(l1Network.value?.id);
});

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
