<template>
  <CommonModal v-model:opened="isModalOpened" class="token-select-modal" :title="title" @after-leave="search = ''">
    <Combobox v-model="selectedToken">
      <!-- TODO: Refactor this to use ComboboxInput as main component but look like CommonInputSearch -->
      <CommonInputSearch
        v-model.trim="search"
        class="mb-block-padding-1/4"
        placeholder="Symbol or address"
        autofocus="desktop"
      >
        <template #icon>
          <MagnifyingGlassIcon aria-hidden="true" />
        </template>
      </CommonInputSearch>
      <div class="-mx-block-padding-1/2 h-full overflow-auto px-block-padding-1/2">
        <template v-if="loading">
          <div class="-mx-block-padding-1/2">
            <TokenBalanceLoader v-for="index in 2" variant="light" :key="index" />
          </div>
        </template>
        <template v-else-if="error">
          <CommonErrorBlock class="m-2" @try-again="emit('try-again')">
            {{ error.message }}
          </CommonErrorBlock>
        </template>
        <template v-else-if="!hasBalances">
          <div class="category -mx-block-padding-1/4 sm:-mx-block-padding-1/2">
            <TokenLine
              v-for="item in displayedTokens"
              class="token-line"
              :key="item.address"
              v-bind="item"
              @click="selectedToken = item"
            />
          </div>
        </template>
        <template v-else-if="balanceGroups.length || !search">
          <div v-for="(group, index) in balanceGroups" :key="index" class="category">
            <TypographyCategoryLabel size="sm" variant="darker" class="group-category-label">
              {{ group.title || "Your assets" }}
            </TypographyCategoryLabel>
            <div class="-mx-block-padding-1/4 sm:-mx-block-padding-1/2">
              <TokenBalance
                v-for="item in group.balances"
                v-bind="item"
                size="sm"
                variant="light"
                :key="item.address"
                @click="selectedToken = item"
              />
            </div>
          </div>
        </template>
        <template v-else-if="showLoading">
          <div class="-mx-block-padding-1/2">
            <TokenBalanceLoader v-for="index in 2" variant="light" :key="index" />
          </div>
        </template>
        <p v-else class="mt-block-padding-1/2 text-center">
          No tokens was found for "{{ search }}"
          <br />
          <span class="mt-1.5 inline-block">Make sure you are using correct network</span>
        </p>
        <slot name="body-bottom" />
      </div>
    </Combobox>
  </CommonModal>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";

import { Combobox } from "@headlessui/vue";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
import { ethers } from "ethers";
import { storeToRefs } from "pinia";

import type { Token, TokenAmount } from "@/types";
import type { Address } from "viem";
import type { PropType } from "vue";

import { useNetworkStore } from "@/store/network";
import { useOnboardStore } from "@/store/onboard";
import { useSearchtokenStore } from "@/store/searchToken";
import { useZkSyncEthereumBalanceStore } from "@/store/zksync/ethereumBalance";
import { groupBalancesByAmount } from "@/utils/mappers";
import { ETH_ADDRESS, fetchErc20, L2_ETH_TOKEN_ADDRESS } from "~/zksync-web3-nova/src/utils";

const props = defineProps({
  title: {
    type: String,
    default: "Choose token",
  },
  opened: {
    type: Boolean,
    default: false,
  },
  tokenAddress: {
    type: String,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Error,
  },
  tokens: {
    type: Array as PropType<Token[]>,
    default: () => [],
  },
  balances: {
    type: Array as PropType<TokenAmount[]>,
    default: () => [],
  },
});
const emit = defineEmits<{
  (eventName: "update:opened", value: boolean): void;
  (eventName: "update:tokenAddress", tokenAddress?: string): void;
  (eventName: "try-again"): void;
}>();
const { selectedNetwork } = storeToRefs(useNetworkStore());
const zkSyncEthereumBalance = useZkSyncEthereumBalanceStore();

const search = ref("");
const showLoading = ref(false);
const hasBalances = computed(() => props.balances.length > 0);
const onboardStore = useOnboardStore();
const { account } = storeToRefs(onboardStore);
const searchtokenStore = useSearchtokenStore();

const filterTokens = (tokens: Token[]) => {
  const lowercaseSearch = search.value.toLowerCase();
  let newTokens = tokens.filter(({ address, name, symbol }) =>
    Object.values({ address, name, symbol })
      .filter((e) => typeof e === "string")
      .some((value) => value!.toLowerCase().includes(lowercaseSearch))
  );
  if (newTokens.length == 0) {
    let contractAddress;
    try {
      contractAddress = ethers.utils.getAddress(lowercaseSearch);
    } catch {
      return [];
    }

    showLoading.value = true;
    fetchErc20(contractAddress as Address, onboardStore.getPublicClient(), account.value.address)
      .then((token) => {
        if (token) {
          searchtokenStore.saveSearchToken(token);
          setTimeout(() => {
            zkSyncEthereumBalance.saveTokenRequest().then();
          }, 1);
        }
      })
      .finally(() => {
        showLoading.value = false;
      });
  }
  return newTokens;
};

const displayedTokens = computed(() =>
  filterTokens(
    props.tokens.filter(
      (e) =>
        selectedNetwork.value.isEthGasToken ||
        (e.address !== ETH_ADDRESS && e.address.toLowerCase() !== L2_ETH_TOKEN_ADDRESS)
    )
  )
);
const displayedBalances = computed(
  () =>
    filterTokens(
      props.balances.filter(
        (e) =>
          selectedNetwork.value.isEthGasToken ||
          (e.address !== ETH_ADDRESS && e.address.toLowerCase() !== L2_ETH_TOKEN_ADDRESS)
      )
    ) as TokenAmount[]
);
const balanceGroups = groupBalancesByAmount(displayedBalances);
const selectedTokenAddress = computed({
  get: () => props.tokenAddress,
  set: (value) => emit("update:tokenAddress", value),
});
const selectedToken = computed({
  get: () => {
    if (!props.tokens) {
      return undefined;
    }
    return props.tokens
      .filter(
        (e) =>
          selectedNetwork.value.isEthGasToken ||
          (e.address !== ETH_ADDRESS && e.address.toLowerCase() !== L2_ETH_TOKEN_ADDRESS)
      )
      .find((e) => e.address === selectedTokenAddress.value);
  },
  set: (value) => {
    if (value) {
      selectedTokenAddress.value = value.address;
    } else {
      selectedTokenAddress.value = undefined;
    }
    closeModal();
  },
});
const isModalOpened = computed({
  get: () => props.opened,
  set: (value) => emit("update:opened", value),
});
const closeModal = () => {
  isModalOpened.value = false;
};
</script>

<style lang="scss">
.token-select-modal {
  .modal-card {
    @apply grid h-full grid-rows-[max-content_max-content_1fr];
  }
  .category:first-child .group-category-label {
    @apply pt-0;
  }
}
</style>
