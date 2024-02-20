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
        <template v-if="chainsLabel.from !== chainsLabel.to">
          <div class="chain-label-wrap">
            <img
              v-if="networkKey && transfer.type == 'deposit'"
              v-tooltip="TokenName"
              class="chain-icon left"
              :src="iconsList[networkKey]"
            />
            <span>{{ chainsLabel.from }}</span>
            <ArrowRightIcon class="relative -top-px mx-1 inline h-4 w-4" aria-hidden="true" />
            <img
              v-if="networkKey && transfer.type == 'withdrawal'"
              v-tooltip="TokenName"
              class="chain-icon"
              :src="iconsList[networkKey]"
            />
            <span>{{ chainsLabel.to }}</span
            >.
          </div>
        </template>
        <template v-else>
          <span>{{ chainsLabel.from }}</span
          >.
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
import { useTimeAgo } from "@vueuse/core";
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
import { nexusNode, ZkSyncNetwork } from "@/data/networks";
import { ETH_ADDRESS } from "~/zksync-web3-nova/src/utils";

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
const networkKey = computed(() => {
  return props.transfer.token?.networkKey;
});

const getLayerName = (layer: NetworkLayer) => {
  if (layer === "L1") {
    return eraNetwork.value.l1Network?.name;
  }
  return eraNetwork.value.name;
};
const TokenName = computed(() => {
  return nexusNode.find((item) => item.key === networkKey.value)?.name;
});

const getTokenName = () => {
  const newNetwork = nexusNode.find((item) => item.l1Gateway && item.l1Gateway == props.transfer.gateway);
  return newNetwork?.name;
};
const getLayerName2 = () => {
  const { token, type, gateway, toNetwork, fromNetwork } = props.transfer;
  if (token?.address != ETH_ADDRESS && gateway) {
    if (type === "withdrawal") {
      return {
        from: getLayerName(fromNetwork),
        to: getTokenName(),
      };
    } else if (type === "deposit") {
      return {
        from: token?.name,
        to: getLayerName(toNetwork),
      };
    }
  } else {
    return {
      from: getLayerName(fromNetwork),
      to: getLayerName(toNetwork),
    };
  }
};

const chainsLabel = computed(() => {
  if (!eraNetwork.value.l1Network) {
    return;
  }
  return getLayerName2();
  // return {
  //   to: getLayerName(props.transfer.toNetwork),
  //   from: getLayerName(props.transfer.fromNetwork),
  // };
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
