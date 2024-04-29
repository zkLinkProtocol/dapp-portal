<template>
  <CommonButtonLine
    class="transaction-withdrawal-line-item"
    @click="
      () => {
        if (!clainedTxHash) {
          isModalOpen = true;
        }
      }
    "
  >
    <div class="line-button-with-img-image">
      <DestinationIconContainer class="p-0">
        <img src="/img/icon-cross.svg" class="w-3 h-3" />
      </DestinationIconContainer>
    </div>
    <div class="withdrawal-line-body">
      <div class="withdrawal-line-top">
        <div class="line-button-with-img-body">
          <CommonButtonLineBodyInfo class="text-left">
            <template #label> Failed Deposit </template>
            <template #underline>
              <template v-if="chainsLabel">
                <div>
                  From:
                  <!-- <img v-if="chainIconUrl" class="chain-icon left" :src="chainIconUrl" /> -->
                  <span>{{ chainsLabel }}</span
                  >.
                </div>
              </template>
              <span>{{ timeAgo }}</span>
            </template>
          </CommonButtonLineBodyInfo>
        </div>
        <div class="line-button-with-img-right">
          <CommonButtonLineBodyInfo ref="el" class="hidden text-right sm:block">
            <template #secondary>
              <TokenAmount v-if="token" :token="token" :amount="computeAmount" />
            </template>
            <template #underline>
              <div class="flex flex-col">
                <span>Transaction hash of asset return</span>
                <a :href="clainedTxHash?.explorerUrl" target="_blank" class="claimed-hash">{{
                  clainedTxHash?.txHash
                }}</a>
              </div>
            </template>
          </CommonButtonLineBodyInfo>
        </div>
      </div>
    </div>
  </CommonButtonLine>
  <CommonModal v-model:opened="isModalOpen" title="Failed Deposit">
    <div class="flex flex-col items-center text-left">
      <p class="w-full text-left mb-8 mt-4">Your assets are SAFE!</p>

      <p class="w-full text-left mb-8">
        However, unfortunately, your deposit from Arbitrum failed to execute on Nova, resulting in your assets remaining
        on the source chain.
      </p>

      <p class="w-full text-left mb-4">
        After approximately 15 days from Nova's withdrawal opening, your assets will be automatically returned to the
        deposit address on the source chain.
      </p>
      <CommonButton type="submit" variant="primary" class="w-full" @click="isModalOpen = false"> Confirm </CommonButton>
      <a class="mt-4" href="https://discord.com/invite/zklink" target="_blank">Contact for help</a>
    </div>
  </CommonModal>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";

import { ArrowRightIcon, MinusIcon } from "@heroicons/vue/24/outline";
import { useTimeAgo } from "@vueuse/core";
import { BigNumber } from "ethers";
import { storeToRefs } from "pinia";

import TokenAmount from "@/components/transaction/lineItem/TokenAmount.vue";

import useNetworks from "@/composables/useNetworks";

import type { NetworkLayer, Transaction } from "@/utils/mappers";
import type { PropType } from "vue";

import { useOnboardStore } from "@/store/onboard";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { shortenAddress } from "@/utils/formatters";
import { ETH_ADDRESS } from "~/zksync-web3-nova/src/utils";
import { failedDepositClaimedTxhashes } from "@/data/failedClaimedTxhashes";

const props = defineProps({
  transfer: {
    type: Object as PropType<Transaction>,
    required: true,
  },
});

const isModalOpen = ref(false);

const { primaryNetwork, zkSyncNetworks } = useNetworks();
const getNetworkInfo = () => {
  const newNetwork = zkSyncNetworks.find(
    (item) => item.l1Gateway && item.l1Gateway.toLowerCase() === props.transfer.gateway?.toLowerCase()
  );
  return newNetwork ?? primaryNetwork;
};
const { account } = storeToRefs(useOnboardStore());
const eraNetwork = getNetworkInfo();

const formatAddress = (address: string) => {
  if (address === account.value.address) {
    return "your account";
  }
  return shortenAddress(address);
};

const chainsLabel = computed(() => {
  const { networkKey } = props.transfer;
  if (networkKey === "ethereum" && process.env.NODE_TYPE === "nexus-sepolia") {
    // special handle for be
    return "Sepolia";
  } else {
    const network = zkSyncNetworks.find((item) => item.key === networkKey);
    return network?.l1Network?.name;
  }
});

const expectedCompleteTimestamp = computed(() => {
  xw;
  console.log("transer: ", props.transfer);
  return new Date(1713088800000 + 15 * 24 * 3600 * 1000).toISOString(); // 15 days after withdrawal open
});
const computeAmount = computed(() => {
  return BigNumber.from(props.transfer.token.amount || "0").toString();
});
const token = computed(() => {
  return props.transfer.token;
});

const clainedTxHash = computed(() => {
  for (const [key, value] of Object.entries(failedDepositClaimedTxhashes)) {
    const item = value[props.transfer.hash];
    if (item) {
      const network = zkSyncNetworks.find((item) => item.key === key);
      return {
        explorerUrl: `${network?.l1Network?.blockExplorers?.default.url}/tx/${item}`,
        txHash: item.substring(0, 6) + "..." + item.substring(item.length - 4),
      };
    }
    continue;
  }
  return null;
});

const timeAgo = useTimeAgo(props.transfer.receivedAt);
</script>

<style lang="scss" scoped>
.transaction-withdrawal-line-item {
  @apply flex items-center gap-4;

  .line-button-with-img-image {
    @apply mt-[1.5px] aspect-square h-auto w-9 flex-none self-start;
  }

  .withdrawal-line-body {
    @apply w-full;

    .withdrawal-line-separator {
      @apply my-4 w-full border-t border-neutral-200 dark:border-neutral-800;
    }

    .withdrawal-line-top {
      @apply flex w-full items-center gap-4;

      .line-button-with-img-body {
        @apply w-full overflow-hidden;
      }

      .line-button-with-img-right {
        @apply w-max;
      }
    }

    .withdrawal-line-bottom {
      @apply flex flex-col items-center justify-between gap-4 xs:flex-row;

      .withdrawal-claim-button {
        @apply w-full whitespace-nowrap xs:w-auto;
      }
    }
  }
  .claimed-hash {
    color: #1755f4;
    text-align: right;
    font-family: Inter;
    font-size: 16px;
    font-style: normal;
    font-weight: 400;
    line-height: normal;
    text-decoration-line: underline;
  }
}
</style>
