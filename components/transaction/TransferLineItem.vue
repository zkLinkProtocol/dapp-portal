<template>
  <TransactionLineItem
    :icon="transactionIcon"
    :explorer-url="blockExplorerUrl"
    :transaction-hash="transfer.transactionHash!"
  >
    <template #icon v-if="inProgress">
      <CommonSpinner variant="dark" aria-hidden="true" />
    </template>
    <template #top-left>{{ label }}</template>
    <template #bottom-left>
      <template v-if="chainsLabel">
        <div v-if="transfer.type == 'deposit'">
          From:
          <!-- <img v-if="chainIconUrl" class="chain-icon left" :src="chainIconUrl" /> -->
          <span>{{ chainsLabel.from }}</span
          >.
        </div>
        <div v-else-if="transfer.type == 'withdrawal'">
          To:
          <!-- <img v-if="chainIconUrl" class="chain-icon" :src="chainIconUrl" /> -->
          <span>{{ chainsLabel.to }}</span
          >.
        </div>
        <template v-else>
          <div v-if="chainsLabel.from !== chainsLabel.to" class="chain-label-wrap">
            <span>{{ chainsLabel.from }}</span>
            <ArrowRightIcon class="relative -top-px mx-1 inline h-4 w-4" aria-hidden="true" />
            <span>{{ chainsLabel.to }}</span
            >.
          </div>
          <span v-else>{{ chainsLabel.from }}&nbsp</span>
        </template>
      </template>
      <span>{{ timeAgo }}</span>
      <slot name="bottom-left"></slot>
    </template>
    <template #top-right>
      <TokenAmount v-if="token" :token="token" :amount="computeAmount" :direction="direction" />
    </template>
    <template #bottom-right>
      <TotalPrice v-if="token" :token="token" :amount="computeAmount" :direction="direction" />
    </template>
  </TransactionLineItem>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import {
  ArrowDownLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BanknotesIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/vue/24/outline";
import { useNetwork, useTimeAgo } from "@vueuse/core";
import { BigNumber } from "ethers";
import { storeToRefs } from "pinia";

import TokenAmount from "@/components/transaction/lineItem/TokenAmount.vue";
import TotalPrice from "@/components/transaction/lineItem/TotalPrice.vue";

import type { NetworkLayer, Transfer } from "@/utils/mappers";
import type { Component, PropType } from "vue";

import { useOnboardStore } from "@/store/onboard";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { shortenAddress } from "@/utils/formatters";
import { iconsList } from "@/data/iconlists";
import { ETH_ADDRESS } from "~/zksync-web3-nova/src/utils";
import useNetworks from "@/composables/useNetworks";

const props = defineProps({
  as: {
    type: [String, Object] as PropType<string | Component>,
    default: "div",
  },
  transfer: {
    type: Object as PropType<Transfer>,
    required: true,
  },
  inProgress: {
    type: Boolean,
    default: false,
  },
});

const { account } = storeToRefs(useOnboardStore());
const { eraNetwork, blockExplorerUrl } = storeToRefs(useZkSyncProviderStore());

const direction = computed(() => {
  if (props.transfer.to === props.transfer.from && props.transfer.toNetwork === props.transfer.fromNetwork) {
    return undefined;
  }
  if (props.transfer.toNetwork === "L2" && props.transfer.to === account.value.address) {
    return "in";
  } else {
    return "out";
  }
});

const formatAddress = (address: string) => {
  if (address === account.value.address) {
    return "your account";
  }
  return shortenAddress(address);
};
const label = computed(() => {
  if (props.transfer.type === "transfer") {
    if (direction.value === "in") {
      return `Received from ${formatAddress(props.transfer.from)}`;
    }
    return `Sent to ${formatAddress(props.transfer.to)}`;
  } else if (props.transfer.type === "withdrawal") {
    if (props.transfer.to === account.value.address) {
      return "Withdraw";
    }
    return `Bridged to ${formatAddress(props.transfer.to)}`;
  } else if (props.transfer.type === "deposit") {
    if (direction.value === "in") {
      if (props.transfer.from === account.value.address) {
        return "Deposit";
      }
      return `Bridged from ${formatAddress(props.transfer.from)}`;
    } else {
      return `Sent to ${formatAddress(props.transfer.to)}`;
    }
  } else if (props.transfer.type === "fee") {
    return "Fee payment";
  } else if (props.transfer.type === "mint") {
    return "Minted";
  }
  return props.transfer.type || "Unknown";
});
const chainIconUrl = computed(() => {
  // return props.transfer.token?.chainIconUrl;
  return getNetworkInfo()?.logoUrl;
});

const { primaryNetwork, zkSyncNetworks } = useNetworks();

const getNetworkInfo = () => {
  const newNetwork = zkSyncNetworks.find(
    (item) => item.l1Gateway && item.l1Gateway.toLowerCase() === props.transfer.gateway?.toLowerCase()
  );
  return newNetwork ?? primaryNetwork;
};
const getl1NetworkName = () => {
  const { type, gateway } = props.transfer;
  // other chain
  if (gateway) {
    if (type === "withdrawal") {
      return {
        from: "",
        to: getNetworkInfo().l1Network?.name,
      };
    } else if (type === "deposit") {
      return {
        from: getNetworkInfo().l1Network?.name,
        to: "",
      };
    }
  } else {
    // primary chain
    if (type === "transfer") {
      return {
        from: eraNetwork.value.name,
        to: eraNetwork.value.name,
      };
    } else if (type === "withdrawal") {
      const newNetwork = zkSyncNetworks.find(
        (item) => item.key && item.key.toLowerCase() === (props.transfer.token?.networkKey || 'primary').toLowerCase()
      )
      return {
        from: newNetwork?.l1Network?.name,
        to: newNetwork?.l1Network?.name,
      };
    } else {
      return {
        from: getNetworkInfo().l1Network?.name,
        to: getNetworkInfo().l1Network?.name,
      };
    }
  }
};

const chainsLabel = computed(() => {
  return getl1NetworkName();
});
const computeAmount = computed(() => {
  return BigNumber.from(props.transfer.amount || "0").toString();
});
const token = computed(() => {
  return props.transfer.token;
});
const transactionIcon = computed(() => {
  switch (props.transfer.type) {
    case "transfer":
      return direction.value === "in" ? ArrowDownLeftIcon : ArrowUpRightIcon;
    case "withdrawal":
      return MinusIcon;
    case "deposit":
      return direction.value === "in" ? PlusIcon : ArrowUpRightIcon;
    case "mint":
      return PlusIcon;
    case "fee":
      return BanknotesIcon;
    case undefined:
      return undefined;
    default:
      if (direction.value) {
        return direction.value === "in" ? ArrowDownLeftIcon : ArrowRightIcon;
      }
      return undefined;
  }
});

const timeAgo = useTimeAgo(props.transfer.timestamp);
</script>
<style lang="scss" scoped>
.chain-label-wrap {
  @apply flex items-center;
}

.chain-icon {
  display: inline-flex;
  width: 18px;
  height: auto;
  margin-right: 6px;
  &.left {
    margin: 0 6px 0 0;
  }
}
</style>
