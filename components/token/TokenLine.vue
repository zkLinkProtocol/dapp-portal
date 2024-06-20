<template>
  <CommonButtonLineWithImg :as="as">
    <template #image>
      <div class="image-wrap">
        <TokenImage :symbol="symbol" :address="address" :icon-url="iconUrl" />
        <img class="chain-icon" v-if="networkKey && iconsList[networkKey]" :src="iconsList[networkKey]" />
      </div>
    </template>
    <template #default>
      <CommonButtonLineBodyInfo class="text-left">
        <template #label>
          <div class="truncate">{{ symbol }} {{ networkKey ? ` (${getNetworkName(networkKey)})` : "" }}</div>
        </template>
        <template v-if="name" #underline>
          <CommonButtonLabel
            v-if="showNameLink && eraNetwork.blockExplorerUrl"
            as="a"
            variant="light"
            :href="`${eraNetwork.blockExplorerUrl}/address/${address}`"
            target="_blank"
            class="flex gap-1"
            @click.stop=""
          >
            <span class="truncate">{{ name }}</span>
            <ArrowTopRightOnSquareIcon class="h-6 w-6 flex-shrink-0" />
          </CommonButtonLabel>
          <div v-else class="truncate">{{ name }}</div>
        </template>
      </CommonButtonLineBodyInfo>
    </template>
    <template #right>
      <slot name="right" />
    </template>
  </CommonButtonLineWithImg>
</template>

<script lang="ts" setup>
import { ArrowTopRightOnSquareIcon } from "@heroicons/vue/24/outline";
import { storeToRefs } from "pinia";

import type { TokenPrice } from "@/types";
import type { Component, PropType } from "vue";

import { iconsList } from "@/data/iconlists";
import { useZkSyncProviderStore } from "@/store/zksync/provider";

const getNetworkName = (networkKey: string) => {
  if (!networkKey) return "";
  return networkKey === "primary" ? "Linea" : networkKey[0].toUpperCase() + networkKey.slice(1);
};

defineProps({
  as: {
    type: [String, Object] as PropType<string | Component>,
  },
  symbol: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  showNameLink: {
    type: Boolean,
    default: false,
  },
  address: {
    type: String,
    required: true,
  },
  decimals: {
    type: Number,
    required: true,
  },
  iconUrl: {
    type: String,
  },
  price: {
    type: [String, Number] as PropType<TokenPrice>,
  },
  networkKey: {
    type: String,
  },
});

const { eraNetwork } = storeToRefs(useZkSyncProviderStore());
</script>

<style lang="scss" scoped>
.image-wrap {
  position: relative;
  .chain-icon {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    overflow: hidden;
  }
}
</style>
