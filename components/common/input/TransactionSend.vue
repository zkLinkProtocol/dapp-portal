<template>
  <div>
    <TokenSelectModalSend
      v-model:opened="selectTokenModalOpened"
      v-model:token-address="selectedTokenAddress"
      :loading="loading"
      :tokens="tokens"
      :balances="balances"
    >
      <template #body-bottom v-if="$slots['token-dropdown-bottom']">
        <slot name="token-dropdown-bottom" />
      </template>
    </TokenSelectModalSend>
    <CommonContentBlock for="transaction-amount-input" as="label">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-2 overflow-hidden">
          <div class="font-bold">{{ label }}</div>
          <slot name="dropdown" />
        </div>
        <transition v-bind="TransitionOpacity()">
          <template v-if="displayedMaxAmount && displayedMaxAmount !== '0'">
            <span>
              <CommonButtonLabel variant="light" as="span">Max:&nbsp;</CommonButtonLabel>
              <CommonButtonLabel
                variant="light"
                :class="{ 'is-max': isMaxAmountSet }"
                :title="isMaxAmountSet ? 'Max amount is set' : `Your max amount is ${maxDecimalAmount}`"
                @click.prevent="setMaxAmount()"
              >
                {{ displayedMaxAmount }}
              </CommonButtonLabel>
            </span>
          </template>
        </transition>
      </div>
      <div class="mt-4 flex gap-2">
        <div class="w-full">
          <CommonInputLine
            :has-error="!!amountError"
            id="transaction-amount-input"
            class="text-[40px]"
            v-model.trim="inputted"
            placeholder="0"
            type="text"
            maxlength="25"
            spellcheck="false"
            autocomplete="off"
            autofocus
          />
          <transition v-bind="TransitionOpacity()" mode="default">
            <CommonInputErrorMessage v-if="amountError">
              <template v-if="amountError === 'insufficient_balance' || maxDecimalAmount === '0'">
                Insufficient balance
              </template>
              <template v-else-if="amountError === 'exceeds_balance' && !maxAmount">Amount exceeds balance</template>
              <template v-else-if="amountError === 'exceeds_max_amount' || amountError === 'exceeds_balance'">
                Max amount is
                <button
                  type="button"
                  class="cursor-pointer font-medium underline underline-offset-2"
                  @click.prevent="setMaxAmount()"
                >
                  {{ maxDecimalAmount }}
                </button>
              </template>
              <template v-else-if="amountError === 'exceeds_decimals'">
                Max decimal length for {{ selectedToken?.symbol }} is {{ selectedToken?.decimals }}
              </template>
            </CommonInputErrorMessage>
            <CommonButtonLabel v-else-if="inputted" as="div" variant="light" class="-mb-6 mt-1 text-right text-sm">
              {{ totalAmountPrice }}
            </CommonButtonLabel>
          </transition>
        </div>

        <transition v-bind="TransitionOpacity(300)">
          <div v-if="approveRequired" v-tooltip="'Allowance approval required'">
            <LockClosedIcon class="mt-4 h-6 w-6 text-warning-400" aria-hidden="true" />
          </div>
        </transition>
        <CommonButtonDropdown
          class="h-max"
          :toggled="selectTokenModalOpened"
          variant="light"
          @click="selectTokenModalOpened = true"
        >
          <template #left-icon>
            <CommonContentLoader v-if="loading" class="block h-full w-full rounded-full" />
            <TokenImage v-else-if="selectedToken" v-bind="selectedToken" />
          </template>
          <CommonContentLoader v-if="loading" :length="7" />
          <span v-else-if="selectedToken">{{ selectedToken.symbol }}</span>
        </CommonButtonDropdown>
      </div>
    </CommonContentBlock>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import { LockClosedIcon } from "@heroicons/vue/24/outline";
import { BigNumber } from "ethers";

import useNetworks from "@/composables/useNetworks";

import type { Token, TokenAmount } from "@/types";
import type { BigNumberish } from "ethers";
import type { PropType } from "vue";

import { decimalToBigNumber, formatTokenPrice, parseTokenAmount, removeSmallAmountPretty } from "@/utils/formatters";
import { ETH_ADDRESS, L2_ETH_TOKEN_ADDRESS } from "~/zksync-web3-nova/src/utils";
const { zkSyncNetworks } = useNetworks();
// const { selectedNetwork } = storeToRefs(useNetworkStore());
const selectedNetwork = zkSyncNetworks.filter((i) => i.key === "primary")[0];
const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  label: {
    type: String,
    default: "Amount",
  },
  tokens: {
    type: Array as PropType<Token[]>,
    default: () => [],
  },
  balances: {
    type: Array as PropType<TokenAmount[]>,
    default: () => [],
    required: true,
  },
  approveRequired: {
    type: Boolean,
    default: false,
  },
  tokenAddress: {
    type: String,
  },
  maxAmount: {
    type: String as PropType<BigNumberish>,
  },
  error: {
    type: String,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (eventName: "update:error", error?: string): void;
  (eventName: "update:modelValue", amount: string): void;
  (eventName: "update:tokenAddress", tokenAddress?: string): void;
}>();

const selectedTokenAddress = computed({
  get: () => props.tokenAddress,
  set: (value?: string) => emit("update:tokenAddress", value),
});
const selectedToken = computed(() => {
  const tokens = props.balances.length ? props.balances : props.tokens;
  return tokens
    .filter(
      (e) =>
        selectedNetwork.isEthGasToken || (e.address !== ETH_ADDRESS && e.address.toLowerCase() !== L2_ETH_TOKEN_ADDRESS)
    )
    .find((e) => e.address === props.tokenAddress);
});
const tokenBalance = computed(() => {
  if (!props.balances.length || !selectedToken.value) {
    return undefined;
  }
  return props.balances.find((e) => e.address === selectedToken.value?.address);
});
const selectTokenModalOpened = ref(false);

const inputted = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value.replace(/[^0-9.,]/g, "").replace(",", ".")),
});

const totalComputeAmount = computed(() => {
  try {
    if (!inputted.value || !selectedToken.value) {
      return BigNumber.from("0");
    }
    return decimalToBigNumber(inputted.value, selectedToken.value.decimals);
  } catch (error) {
    return BigNumber.from("0");
  }
});
const totalAmountPrice = computed(() => {
  if (!selectedToken.value || !selectedToken.value.price) {
    return "";
  }
  return formatTokenPrice(totalComputeAmount.value, selectedToken.value.decimals, selectedToken.value.price);
});
const maxDecimalAmount = computed(() => {
  // Full decimal amount
  if (!props.maxAmount || !selectedToken.value) {
    return;
  }
  return parseTokenAmount(props.maxAmount, selectedToken.value.decimals);
});
const displayedMaxAmount = computed(() => {
  // Displayed shortened amount
  if (!maxDecimalAmount.value || !selectedToken.value?.price) {
    return maxDecimalAmount.value;
  }
  return removeSmallAmountPretty(props.maxAmount!, selectedToken.value.decimals, selectedToken.value.price);
});
const isMaxAmountSet = computed(() => {
  if (!props.maxAmount) {
    return false;
  }
  return totalComputeAmount.value.eq(props.maxAmount);
});
const setMaxAmount = () => {
  if (!maxDecimalAmount.value) return;
  inputted.value = maxDecimalAmount.value;
};

const amountError = computed(() => {
  if (!selectedToken.value) return;
  if (tokenBalance.value && totalComputeAmount.value.gt(tokenBalance.value.amount)) {
    return "exceeds_balance";
  }
  if (props.maxAmount && totalComputeAmount.value.gt(props.maxAmount)) {
    if (BigNumber.from(props.maxAmount).isZero()) {
      return "insufficient_balance";
    }
    return "exceeds_max_amount";
  }
  if (inputted.value) {
    const [, decimal] = inputted.value.split(".");
    if (decimal && decimal.length > selectedToken.value.decimals) {
      return "exceeds_decimals";
    }
  }
  return undefined;
});
watch(
  amountError,
  (value) => {
    emit("update:error", value);
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped></style>
