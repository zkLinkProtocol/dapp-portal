<template>
  <CommonButtonLine class="transaction-withdrawal-line-item">
    <div class="line-button-with-img-image">
      <DestinationIconContainer>
        <img src="/img/icon-cross.svg" class="w-9 h-9"/>
      </DestinationIconContainer>
    </div>
    <div class="withdrawal-line-body">
      <div class="withdrawal-line-top">
        <div class="line-button-with-img-body">
          <CommonButtonLineBodyInfo class="text-left">
            <template #label>
              Failed Deposit
            </template>
            <template #underline>
              <template v-if="chainsLabel">
                <div >
                  From:
                  <!-- <img v-if="chainIconUrl" class="chain-icon left" :src="chainIconUrl" /> -->
                  <span>{{ chainsLabel.from }}</span
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
              <!-- <TokenAmount v-if="token" :token="token" :amount="computeAmount" /> -->
            </template>
            <template #underline>
              <div class="flex flex-col">
                <span>Claim on source chain</span>
                <span>~{{ 8 }} days left</span>
              </div>
            </template>
          </CommonButtonLineBodyInfo>
        </div>
      </div>
    </div>
  </CommonButtonLine>
</template>

<script lang="ts" setup>
import { computed } from "vue";

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

const props = defineProps({
  transfer: {
    type: Object as PropType<Transaction>,
    required: true,
  },

});

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
        from: eraNetwork.name,
        to: eraNetwork.name,
      };
    } else {
      return {
        from: primaryNetwork.l1Network?.name,
        to: primaryNetwork.l1Network?.name,
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
}
</style>
