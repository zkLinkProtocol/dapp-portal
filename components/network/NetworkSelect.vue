<template>
  <CommonModal v-model:opened="isModalOpened" class="network-select-modal" :title="title" @after-leave="search = ''">
    <Combobox v-model="selectedNetworkKey">
      <div class="-mx-block-padding-1/2 h-full overflow-auto px-block-padding-1/2">
        <div class="category">
          <div class="-mx-block-padding-1/4 sm:-mx-block-padding-1/2">
            <DestinationItem
              v-for="(item, itemIndex) in displayedGroup"
              v-bind="item"
              :key="itemIndex"
              :icon="item.key === selectedNetworkKey ? CheckIcon : undefined"
              variant="light"
              size="sm"
              @click="selectedNetworkKey = item.key!"
            />
          </div>
        </div>
        <p v-if="search && !displayedGroup.length" class="mt-block-padding-1/2 text-center">
          No chains found for "{{ search }}"
        </p>
        <slot name="body-bottom" />
      </div>
    </Combobox>
  </CommonModal>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";

import { Combobox } from "@headlessui/vue";
import { CheckIcon } from "@heroicons/vue/24/outline";
import { storeToRefs } from "pinia";

import type { TransactionDestination } from "@/store/destinations";

import { useDestinationsStore } from "@/store/destinations";

import useNetworks from "@/composables/useNetworks";

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

const { destinations } = storeToRefs(useDestinationsStore());

const search = ref("");
const filterDestinations = (networks: TransactionDestination[]) => {
  const lowercaseSearch = search.value.toLowerCase();
  return networks.filter(({ label }) =>
    Object.values({ label })
      .filter((e) => typeof e === "string")
      .some((value) => value.toLowerCase().includes(lowercaseSearch))
  );
};
const { zkSyncNetworksDisplay: displayedGroup } = useNetworks();
console.log(displayedGroup);

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
</script>

<style lang="scss">
.network-select-modal {
  .modal-card {
    @apply grid h-full grid-rows-[max-content_max-content_1fr];
  }
  .category:first-child .group-category-label {
    @apply pt-0;
  }
}
</style>
