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
           <template v-if="showLoading">
            <div class="-mx-block-padding-1/2">
              <TokenBalanceLoader v-for="index in 2" variant="light" :key="index" />
            </div>
          </template>
          <template v-else>
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
import { Contract, ethers } from "ethers";

import { Combobox } from "@headlessui/vue";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";

import type { Token, TokenAmount } from "@/types";
import type { PropType } from "vue";

import { groupBalancesByAmount } from "@/utils/mappers";
import { Address, erc20ABI } from "@wagmi/core";
import { useNetworkStore } from "@/store/network";
import { getPublicClient } from "@wagmi/core";
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
const search = ref("");
const showLoading=ref(false)
const hasBalances = computed(() => props.balances.length > 0);
const fetchErc20=  async (contractAddress: Address, chainId: number, userAddress: Address): Promise<TokenAmount|undefined>=>{
  const web3Provider = new ethers.providers.Web3Provider(
    getPublicClient({ chainId: chainId }) as any,
    "any"
  );
  const erc20Contract = new Contract(contractAddress, erc20ABI, web3Provider)
  let name, symbol, balance, decimals;
  try {
    name = await erc20Contract.name();
    symbol = await erc20Contract.symbol();
    decimals = await erc20Contract.decimals();
    balance = await erc20Contract.balanceOf(userAddress);
  } catch {
    return undefined
  }
  return {
    address: contractAddress,
    name: name,
    symbol: symbol,
    amount: balance,
    decimals: decimals
  } as TokenAmount;
}
const filterTokens = (tokens: Token[], type: string) => {
  const lowercaseSearch = search.value.toLowerCase();
  let newTokens= tokens.filter(({ address, name, symbol }) =>
    Object.values({ address, name, symbol })
      .filter((e) => typeof e === "string")
      .some((value) => value!.toLowerCase().includes(lowercaseSearch))
  );
  if(newTokens.length==0){
    let contractAddress;
    try{
      contractAddress = ethers.utils.getAddress(lowercaseSearch);
    }catch{
      return []
    }
    showLoading.value = true;
    fetchErc20(contractAddress as Address, selectedNetwork.value.l1Network?.id!,"0x8DAe26f3eA96E3f36F11DAD7d630d8A66B56C660").then((token)=>{
      if(token){
        console.log("token---->",token)
        if("displayedTokens"===type){
          displayedTokens.value = [token];
        }else{
          displayedBalances.value = [token]
        }
      }
    }).finally(()=>{
      showLoading.value=false;
    })
  }
  return newTokens;
  
};
const displayedTokens = computed({
  get(){
    return filterTokens(props.tokens,"displayedTokens")
  },
  set(){
  }
})
const displayedBalances = computed({
  get(){
    return filterTokens(props.balances,"");
  },
  set(){

  }
})
// const displayedTokens2 = computed(() => filterTokens(props.tokens));
// const displayedBalances2 = computed(() => filterTokens(props.balances));
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
    return props.tokens.find((e) => e.address === selectedTokenAddress.value);
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
