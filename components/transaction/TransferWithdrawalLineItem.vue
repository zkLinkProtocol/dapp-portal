<template>
  <CommonButtonLine class="transaction-withdrawal-line-item">
    <div class="line-button-with-img-image">
      <DestinationIconContainer>
        <CommonSpinner v-if="inProgress" variant="dark" />
        <MinusIcon v-else aria-hidden="true" />
      </DestinationIconContainer>
    </div>
    <div class="withdrawal-line-body">
      <div class="withdrawal-line-top">
        <div class="line-button-with-img-body">
          <CommonButtonLineBodyInfo class="text-left">
            <template #label>
              {{ label }}
            </template>
            <template #underline>
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
                  <span v-else>{{ chainsLabel.from }} .</span>
                </template>
              </template>
              <span>{{ timeAgo }}</span>
            </template>
          </CommonButtonLineBodyInfo>
          <div class="flex flex-wrap items-center gap-x-2 sm:hidden">
            <TokenAmount v-if="token" :token="token" :amount="computeAmount" />
          </div>
        </div>
        <div class="line-button-with-img-right">
          <CommonButtonLineBodyInfo ref="el" class="hidden text-right sm:block">
            <template #secondary>
              <TokenAmount v-if="token" :token="token" :amount="computeAmount" />
            </template>
            <template #underline>
              <TotalPrice v-if="token" :token="token" :amount="computeAmount" />
            </template>
          </CommonButtonLineBodyInfo>
        </div>
      </div>
      <div class="withdrawal-line-separator"></div>
      <div class="withdrawal-line-bottom">
        <div>Withdrawal is available for claiming on the {{ eraNetwork.l1Network?.name }} network</div>
        <CommonButton variant="primary" class="withdrawal-claim-button">Go to claim</CommonButton>
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
import TotalPrice from "@/components/transaction/lineItem/TotalPrice.vue";
import { ETH_ADDRESS } from "~/zksync-web3-nova/src/utils";

import type { NetworkLayer, Transfer } from "@/utils/mappers";
import type { PropType } from "vue";

import { useOnboardStore } from "@/store/onboard";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { shortenAddress } from "@/utils/formatters";
import useNetworks from "@/composables/useNetworks";

const props = defineProps({
  transfer: {
    type: Object as PropType<Transfer>,
    required: true,
  },
  inProgress: {
    type: Boolean,
    default: false,
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
const label = computed(() => {
  if(props.transfer.status === 'failed') {
    return 'Failed Deposit'
  }
  const article = 'Withdraw';
  if (props.transfer.to === account.value.address) {
    return article;
  }
  return `${article} to ${formatAddress(props.transfer.to)}`;
});

const formatAddress = (address: string) => {
  if (address === account.value.address) {
    return "your account";
  }
  return shortenAddress(address);
};
const chainIconUrl = computed(() => {
  // return props.transfer.token?.chainIconUrl;
  return getNetworkInfo()?.logoUrl;
});
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

const timeAgo = useTimeAgo(props.transfer.timestamp);
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
