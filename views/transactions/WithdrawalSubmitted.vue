<template>
  <div>
    <h1 class="h1 mt-block-gap-1/2 text-center">
      {{ transaction.info.completed ? "Transaction completed" : "Transaction submitted" }}
    </h1>
    <CommonHeightTransition :opened="!transaction.info.completed">
      <p class="mb-4 text-center">
        <template v-if="withdrawalManualFinalizationRequired && transaction.info.withdrawalFinalizationAvailable">
          Your funds will be available on <span class="font-medium">{{ transaction.to.destination.label }}</span> after
          you claim the withdrawal.
        </template>
        <template v-else>
          Your funds will be available on <span class="font-medium">{{ transaction.to.destination.label }}</span> after
          a minimum delay of 8 days. (On average, it takes around 8.5 days). During this time, the transaction will be
          processed
          {{
            withdrawalManualFinalizationRequired
              ? "and become available for claiming."
              : "and finalized. You are free to close this page."
          }}
        </template>
      </p>
      <template v-if="withdrawalManualFinalizationRequired">
        <CommonAlert
          v-if="withdrawalFinalizationAvailable && is829Passed"
          variant="warning"
          :icon="ExclamationTriangleIcon"
          class="mb-4"
        >
          <p>You can claim your withdrawal now.</p>
        </CommonAlert>
        <CommonAlert v-else variant="warning" :icon="ExclamationTriangleIcon" class="mb-4">
          <div class="flex flex-col">
            <p>
              You will have to claim your withdrawal once it's processed. Claiming will require paying the fee on the
              destination network.
            </p>
            <p class="mt-2">
              Due to a recent update to the Optimism fraud-proof mechanism, all transactions on Nova require
              re-verification. As a result, any recent withdrawals will now take additional days to complete.
            </p>
          </div>
        </CommonAlert>
      </template>
    </CommonHeightTransition>
    <TransactionProgress
      :from-address="transaction.from.address"
      :from-destination="transaction.from.destination"
      :to-address="transaction.to.address"
      :to-destination="transaction.to.destination"
      :from-explorer-link="blockExplorerUrl"
      :from-transaction-hash="transaction.transactionHash"
      :to-transaction-hash="finalizeTransactionHash || transaction.info.toTransactionHash"
      :to-explorer-link="
        finalizeTransactionHash || transaction.info.toTransactionHash ? l1BlockExplorerUrls : undefined
      "
      :token="transaction.token"
      :completed="transaction.info.completed"
      :animation-state="withdrawalFinalizationAvailable ? 'stopped-in-the-end' : undefined"
      :expected-complete-timestamp="
        withdrawalFinalizationAvailable ? undefined : transaction.info.expectedCompleteTimestamp
      "
      :is-withdraw="true"
    >
      <template #to-button v-if="withdrawalFinalizationAvailable && is829Passed">
        <template v-if="!(network.chain?.id === getNetworkInfo().l1Network?.id)">
          <CommonButton
            size="xs"
            variant="light"
            :disabled="connectorName === 'WalletConnect'"
            @click="onboardStore.setCorrectNetwork(getNetworkInfo().l1Network?.id)"
          >
            Change wallet network to claim
          </CommonButton>
        </template>
        <CommonButton
          v-else-if="feeLoading || fee"
          size="xs"
          variant="light"
          :disabled="continueButtonDisabled"
          @click="buttonContinue()"
        >
          <CommonContentLoader v-if="feeLoading && !fee" :length="9" />
          <span v-else>Claim</span>
          <CommonSpinner
            v-if="finalizeTransactionStatus !== 'not-started' || transaction.info.toTransactionHash"
            variant="text-color"
            class="-mr-1 ml-2 h-6 w-6"
            aria-hidden="true"
          />
        </CommonButton>
      </template>
    </TransactionProgress>
    <CommonHeightTransition :opened="withdrawalFinalizationAvailable && is829Passed">
      <div>
        <CommonErrorBlock v-if="feeError" class="mt-2" @try-again="estimate">
          Fee estimation error: {{ feeError.message }}
        </CommonErrorBlock>
        <TransactionFeeDetails
          v-else
          label="Claiming fee:"
          :fee-token="feeToken"
          :fee-amount="fee"
          :loading="feeLoading"
          class="mt-4"
        />

        <TransactionEthereumTransactionFooter :transaction="transaction">
          <template #after-checks>
            <CommonButton :disabled="continueButtonDisabled" class="w-full" variant="primary" @click="buttonContinue()">
              <transition v-bind="TransitionPrimaryButtonText" mode="out-in">
                <span v-if="finalizeTransactionStatus === 'processing'">Processing...</span>
                <span v-else-if="finalizeTransactionStatus === 'waiting-for-signature'">Waiting for confirmation</span>
                <span
                  v-else-if="
                    finalizeTransactionStatus === 'sending' ||
                    finalizeTransactionStatus === 'done' ||
                    transaction.info.toTransactionHash
                  "
                >
                  Claiming withdrawal...
                </span>
                <span v-else>Claim withdrawal</span>
              </transition>
            </CommonButton>
            <TransactionButtonUnderlineConfirmTransaction
              :opened="finalizeTransactionStatus === 'waiting-for-signature'"
            />
          </template>
          <template #change-network-auto>Change wallet network to claim</template>
          <template #change-network-manual="{ walletName }">
            Change network manually in your {{ walletName }} wallet to claim
          </template>
        </TransactionEthereumTransactionFooter>
      </div>
    </CommonHeightTransition>

    <div class="mt-5 flex flex-wrap items-center justify-center gap-block-gap">
      <CommonButton as="RouterLink" :to="{ name: 'assets' }" size="xs">Go to Assets page</CommonButton>
      <CommonButton
        size="xs"
        :as="makeAnotherTransaction ? undefined : 'RouterLink'"
        :to="{ name: 'withdraw' }"
        @click="makeAnotherTransaction && makeAnotherTransaction()"
      >
        Make another transaction
      </CommonButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, watch } from "vue";

import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";
import { storeToRefs } from "pinia";

import useNetworks from "@/composables/useNetworks";
import { isWithdrawalManualFinalizationRequired } from "@/composables/zksync/useTransaction";
import useWithdrawalFinalization from "@/composables/zksync/useWithdrawalFinalization";

import type { TransactionInfo } from "@/store/zksync/transactionStatus";
import type { PropType } from "vue";

import { useNetworkStore } from "@/store/network";
import { useOnboardStore } from "@/store/onboard";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { useZkSyncTransactionStatusStore } from "@/store/zksync/transactionStatus";
import { getEstimateWithdrawalDelayDays } from "@/utils/helpers";

const props = defineProps({
  transaction: {
    type: Object as PropType<TransactionInfo>,
    required: true,
  },
  makeAnotherTransaction: {
    type: Function as PropType<() => void>,
    required: false,
  },
});

// const network = ref(getNetwork());

// watchNetwork((updatedNetwork) => {
//   network.value = updatedNetwork;
// });
const { primaryNetwork, zkSyncNetworks } = useNetworks();

const { l1Network, l1BlockExplorerUrl } = storeToRefs(useNetworkStore());
const getNetworkInfo = () => {
  if (props.transaction?.gateway) {
    const newNetwork = zkSyncNetworks.find(
      (item) => item.l1Gateway && item.l1Gateway.toLowerCase() === props.transaction?.gateway?.toLowerCase()
    );
    const obj = { l1Network: { id: l1Network.value?.id, blockExplorers: { default: { url: l1BlockExplorerUrl } } } };
    return props.transaction ? newNetwork ?? primaryNetwork : obj;
  } else {
    let objs = zkSyncNetworks.find(
      (item) => item.key && item.key.toLowerCase() === (props.transaction?.token?.networkKey || "primary").toLowerCase()
    );
    const obj = { l1Network: { id: l1Network.value?.id, blockExplorers: { default: { url: l1BlockExplorerUrl } } } };
    return props.transaction ? objs ?? primaryNetwork : obj;
  }
};
const l1BlockExplorerUrls = getNetworkInfo().l1Network?.blockExplorers?.default.url;
const onboardStore = useOnboardStore();
// const network = onboardStore.network;
const transactionStatusStore = useZkSyncTransactionStatusStore();
const { eraNetwork, blockExplorerUrl } = storeToRefs(useZkSyncProviderStore());
const { connectorName } = storeToRefs(onboardStore);

const network = computed(() => {
  return onboardStore.network;
});

const withdrawalManualFinalizationRequired = computed(() => {
  return (
    !props.transaction.info.completed &&
    isWithdrawalManualFinalizationRequired(props.transaction.token, eraNetwork.value.l1Network?.id || -1)
  );
});
const withdrawalFinalizationAvailable = computed(() => {
  return withdrawalManualFinalizationRequired.value && props.transaction.info.withdrawalFinalizationAvailable;
});

const displayEstimateWithdrawTime = computed(() => {
  return getEstimateWithdrawalDelayDays(props.transaction.timestamp);
});

const is829Passed = computed(() => {
  const time829 = 1724889600000;
  return Date.now() > time829;
});

const {
  feeToken,
  totalFee: fee,
  estimationError: feeError,
  estimationInProgress: feeLoading,
  estimateFee: estimate,

  status: finalizeTransactionStatus,
  transactionHash: finalizeTransactionHash,
  commitTransaction,
} = useWithdrawalFinalization(computed(() => props.transaction));
watch(
  withdrawalFinalizationAvailable,
  (finalizationAvailable) => {
    if (finalizationAvailable) {
      estimate();
    }
  },
  { immediate: true }
);

const continueButtonDisabled = computed(() => {
  if (finalizeTransactionStatus.value !== "not-started") return true;
  if (feeLoading.value || !fee.value) return true;
  if (props.transaction.info.toTransactionHash) return true;
  return false;
});
const buttonContinue = async () => {
  if (continueButtonDisabled.value) return;
  await commitTransaction();

  if (finalizeTransactionStatus.value === "done") {
    transactionStatusStore.updateTransactionData(props.transaction.transactionHash, {
      ...props.transaction,
      info: {
        ...props.transaction.info,
        completed: true,
        toTransactionHash: finalizeTransactionHash.value! as string,
      },
    });
  }
};
</script>
