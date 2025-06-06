<template>
  <CommonContentBlock>
    <div class="transaction-progress">
      <template v-if="isSameAddressDifferentDestination">
        <div class="info-column left">
          <div class="flex flex-col items-center justify-center gap-1 md:flex-row">
            <span>From</span>
            <img
              v-tooltip="fromDestination.label"
              :src="fromDestination.iconUrl"
              :alt="fromDestination.label"
              class="h-6 w-6 rounded-full"
            />
          </div>
          <div>Your account {{ shortenAddress(fromAddress) }}</div>
        </div>
        <div class="info-column right">
          <div class="flex flex-col items-center justify-center gap-1 md:flex-row">
            <span>To</span>
            <img
              v-tooltip="toDestination.label"
              :src="toDestination.iconUrl"
              :alt="toDestination.label"
              class="h-6 w-6 rounded-full"
            />
          </div>
          <div>{{ isSameAddress ? "Your account" : "Another account" }} {{ shortenAddress(toAddress) }}</div>
        </div>
      </template>
      <template v-else>
        <div class="info-column left">
          <AddressAvatar class="mx-auto h-12 w-12" :address="fromAddress">
            <template #icon>
              <img v-tooltip="fromDestination.label" :src="fromDestination.iconUrl" :alt="fromDestination.label" />
            </template>
          </AddressAvatar>
          <div>
            From your account
            <br />
            {{ shortenAddress(fromAddress) }}
          </div>
        </div>
        <div class="info-column right">
          <AddressAvatar class="mx-auto h-12 w-12" :address="toAddress">
            <template #icon>
              <img v-tooltip="toDestination.label" :src="toDestination.iconUrl" :alt="toDestination.label" />
            </template>
          </AddressAvatar>
          <div>
            {{ isSameAddress ? "To your account" : "To another account" }}
            <br />
            {{ shortenAddress(toAddress) }}
          </div>
        </div>
      </template>

      <AnimationsTransactionProgress
        :state="animationState ?? (completed ? 'completed' : 'playing')"
        class="transaction-animation"
      />

      <div v-if="fromExplorerLink || fromTransactionHash" class="info-column bottom-left mt-block-gap-1/2">
        <TransactionHashButton :explorer-url="fromExplorerLink" :transaction-hash="fromTransactionHash" />
      </div>
      <div v-else-if="$slots['from-button']" class="info-column bottom-left mt-block-gap-1/2">
        <slot name="from-button" />
      </div>
      <div v-if="toExplorerLink || toTransactionHash" class="info-column bottom-right mt-block-gap-1/2">
        <TransactionHashButton :explorer-url="toExplorerLink" :transaction-hash="toTransactionHash" />
      </div>
      <div v-else-if="$slots['to-button']" class="info-column bottom-right mt-block-gap-1/2">
        <slot name="to-button" />
      </div>
    </div>
    <TransactionHashButton
      v-if="explorerLink || transactionHash"
      :explorer-url="explorerLink"
      :transaction-hash="transactionHash"
      class="mx-auto mt-block-gap"
    />

    <div class="mt-block-padding flex flex-wrap items-center justify-center gap-4">
      <div>
        <span class="text-neutral-400">Value:</span>
        <span class="ml-1 inline-flex items-center">
          {{ parseTokenAmount(token.amount, token.decimals) }}
          {{ token.symbol }}
          <TokenImage class="ml-1.5 h-5 w-5" v-bind="token" />
        </span>
      </div>
      <div v-if="expectedCompleteTimestamp && !completed">
        <span class="text-neutral-400">Time{{ !isWithdraw ? "" : " left" }}: </span>
        <CommonTimer format="human-readable" :future-date="expectedCompleteTimestamp" :only-days="isWithdraw">
          <template #default="{ timer, isTimerFinished }">
            <template v-if="isTimerFinished">Funds should arrive soon!</template>
            <template v-else>
              <span class="tabular-nums">{{ timer }} {{ isWithdraw ? "" : "left" }}</span>
              <CommonButtonLabel as="span" class="showTip relative text-left" v-if="isWithdraw">
                <img src="/img/Shape.svg" class="ml-1 inline-block h-3 w-3" alt="" />
                <div class="tooltip">
                  The estimated time remaining may differ from the actual time remaining.
                </div>
              </CommonButtonLabel>
            </template>
          </template>
        </CommonTimer>
      </div>
    </div>
  </CommonContentBlock>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import type { AnimationState } from "@/components/animations/TransactionProgress.vue";
import type { TransactionDestination } from "@/store/destinations";
import type { TokenAmount } from "@/types";
import type { PropType } from "vue";

const props = defineProps({
  fromAddress: {
    type: String,
    required: true,
  },
  fromDestination: {
    type: Object as PropType<TransactionDestination>,
    required: true,
  },
  toAddress: {
    type: String,
    required: true,
  },
  toDestination: {
    type: Object as PropType<TransactionDestination>,
    required: true,
  },
  // left right buttons
  fromExplorerLink: {
    type: String,
  },
  fromTransactionHash: {
    type: String,
  },
  toExplorerLink: {
    type: String,
  },
  toTransactionHash: {
    type: String,
  },
  // center button
  explorerLink: {
    type: String,
  },
  transactionHash: {
    type: String,
  },
  token: {
    type: Object as PropType<TokenAmount>,
    required: true,
  },
  expectedCompleteTimestamp: {
    type: String,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  animationState: {
    type: String as PropType<AnimationState>,
  },
  isWithdraw: {
    type: Boolean,
    default: false,
  }
});

const isSameAddress = computed(() => props.fromAddress === props.toAddress);
const isSameAddressDifferentDestination = computed(
  () => isSameAddress.value && props.fromDestination.label !== props.toDestination.label
);
</script>

<style lang="scss" scoped>
.transaction-progress {
  @apply grid grid-flow-row grid-cols-3 grid-rows-[max-content] items-center gap-x-4 text-center;
  grid-template-areas: "info-col-left divider info-col-right" "info-col-bottom-left space info-col-bottom-right";

  .info-column {
    @apply flex flex-col items-center justify-center gap-2;
    &.left {
      grid-area: info-col-left;
    }
    &.right {
      grid-area: info-col-right;
    }
    &.bottom-left {
      grid-area: info-col-bottom-left;
    }
    &.bottom-right {
      grid-area: info-col-bottom-right;
    }
  }
  .transaction-animation {
    grid-area: divider;
  }
  .divider {
    @apply relative border-t border-dashed border-neutral-500;
    grid-area: divider;

    .airplane {
      @apply absolute h-8 w-8;
      animation: airplane 3s linear infinite;
      @keyframes airplane {
        0% {
          left: 0;
          transform: translate(0, -50%) scale(0);
          opacity: 0;
        }
        30%,
        60% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        100% {
          left: 100%;
          transform: translate(-100%, -50%) scale(0);
          opacity: 0;
        }
      }
    }
  }
}
.showTip:hover {
  .tooltip {
    display: block;
    z-index: 100;
  }
}
.tooltip {
  display: none;
  position: absolute;
  padding: 12px 20px 12px 24px;
  bottom: 105%;
  width: 30rem;
  left: -15rem;
  border-radius: 8px;
  background: #1f2127;
  color: #ffffff;
  font-size: 14px;
  font-weight: 400;
  transition: all .5s linear;
}
</style>
