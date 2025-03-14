<template>
  <CommonModal v-model:opened="isModalOpened" class="network-select-modal" :title="title" @after-leave="search = ''">
    <Combobox v-model="selectedNetworkKey">
      <!-- Temporarily hidden -->
      <!-- <CommonInputSearch
        v-model.trim="search"
        class="mb-block-padding-1/4"
        placeholder="Network name"
        autofocus="desktop"
      >
        <template #icon>
          <MagnifyingGlassIcon aria-hidden="true" />
        </template>
      </CommonInputSearch> -->
      <div class="over -mx-block-padding-1/2 overflow-auto px-block-padding-1/2">
        <div v-for="(group, groupIndex) in arr" :key="groupIndex" class="category">
          <!-- <TypographyCategoryLabel size="sm" variant="darker" class="group-category-label">
              {{ group.title }}
            </TypographyCategoryLabel> -->
          <div class="-mx-block-padding-1/4 sm:-mx-block-padding-1/2">
            <DestinationItem
              v-bind="group"
              :key="groupIndex"
              :icon="group.key === selectedNetworkKey ? CheckIcon : undefined"
              variant="light"
              size="sm"
              @click="handleClick(group)"
            />
          </div>
        </div>
        <p v-if="search && !arr.length" class="mt-block-padding-1/2 text-center">No chains found for "{{ search }}"</p>
        <slot name="body-bottom" />
      </div>
    </Combobox>
  </CommonModal>

  <CommonModal
    v-model:opened="isPausedNetworkModalOpen"
    title="Network Deposit Paused"
    closable
    @close="isPausedNetworkModalOpen = false"
  >
    <div class="p-4">
      <p class="mb-4">Deposit paused for {{ selectedPausedNetwork?.label }} chain, Withdrawals still available.</p>
      <div class="flex justify-end gap-4">
        <CommonButton variant="secondary" @click="isPausedNetworkModalOpen = false"> Ok </CommonButton>
      </div>
    </div>
  </CommonModal>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import { Combobox } from "@headlessui/vue";
import { CheckIcon } from "@heroicons/vue/24/outline";
import { storeToRefs } from "pinia";

import useNetworks from "@/composables/useNetworks";

import type { ZkSyncNetwork } from "@/data/networks";

import { useRoute } from "#app";
import { useNetworkStore } from "@/store/network";
import { getNetworkUrl } from "@/utils/helpers";

const route = useRoute();
const router = useRouter();
const props = defineProps({
  title: {
    type: String,
    default: "Choose network",
  },
  opened: {
    type: Boolean,
    default: false,
  },
  networkKey: {
    type: String,
    required: true,
  },
});

const emit = defineEmits<{
  (eventName: "update:opened", value: boolean): void;
  (eventName: "update:networkKey", networkKey?: string): void;
}>();

const { zkSyncNetworks } = useNetworks();
const zkSyncNetwork = zkSyncNetworks.filter((e) => !e.hidden);
let arr: any[] = [];
zkSyncNetwork.map((i) => {
  if (route.path === "/" && i.key === "blast") return; // hide blast on deposit
  const obj = {
    iconUrl: i.logoUrl,
    key: i.key,
    label: i.l1Network?.name,
  };
  arr.push(obj);
});

const isPausedNetworkModalOpen = ref(false);
const selectedPausedNetwork = ref<{ key: string; label: string } | null>(null);

const showPausedNetworkWarning = (network: { key: string; label: string }) => {
  selectedPausedNetwork.value = network;
  isPausedNetworkModalOpen.value = true;
  closeModal();
};

const { selectedNetwork } = storeToRefs(useNetworkStore());
const isNetworkSelected = (network: ZkSyncNetwork) => selectedNetwork.value.key === network.key;
const buttonClicked = (network: ZkSyncNetwork) => {
  if (isNetworkSelected(network)) {
    return;
  }
  window.location.href = getNetworkUrl(network, route.fullPath);
};
const search = ref("");
// const filterDestinations = (networks: TransactionDestination[]) => {
//   const lowercaseSearch = search.value.toLowerCase();
//   return networks.filter(({ label }) =>
//     Object.values({ label })
//       .filter((e) => typeof e === "string")
//       .some((value) => value.toLowerCase().includes(lowercaseSearch))
//   );
// };
// const destinationGroups = computed(() => [
//   {
//     title: "Chains",
//     destinations: [destinations.value.nova, destinations.value.arbitrum],
//   },
// ]);
// const displayedGroups = computed(() =>
//   destinationGroups.value
//     .map((e) => ({
//       title: e.title,
//       destinations: filterDestinations(e.destinations),
//     }))
//     .filter((e) => e.destinations.length)
// );
const selectedNetworkKey = computed({
  get: () => props.networkKey,
  set: (value) => {
    closeModal();
    emit("update:networkKey", value);
  },
});

const isModalOpened = computed({
  get: () => props.opened,
  set: (value) => emit("update:opened", value),
});
const closeModal = () => {
  isModalOpened.value = false;
};
const handleClick = (group: any) => {
  if (route.path === "/" && ["optimism", "arbitrum", "base", "mantle", "manta"].includes(group.key)) {
    showPausedNetworkWarning(group);
    return;
  }
  buttonClicked(zkSyncNetwork.find((item) => item.key === group.key)!);
};
</script>

<style lang="scss">
.network-select-modal {
  .modal-card {
    @apply h-full;
  }
  .category:first-child .group-category-label {
    @apply pt-0;
  }
}
.over {
  height: calc(100% - 50px);
}
</style>
