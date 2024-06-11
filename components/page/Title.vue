<template>
  <div class="page-title">
    <PageBackButton v-if="fallbackRoute" :fallback="fallbackRoute" />
    <CommonButtonBack v-else-if="backFunction" @click="backFunction()" />
    <h1 class="title" v-bind:style="{ fontSize: pageTitleFontSize }">
      <slot />
    </h1>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import type { PropType } from "vue";
import type { RouteLocationRaw } from "vue-router";

import { useRoute } from "#app";

const route = useRoute();

const pageTitleFontSize = computed(() => {
  const size = route.query?.title_size || 40;
  return size + "px";
});

defineProps({
  fallbackRoute: {
    type: [String, Object] as PropType<string | RouteLocationRaw>,
  },
  backFunction: {
    type: Function as PropType<() => void>,
  },
});
</script>

<style lang="scss" scoped>
.page-title {
  @apply mb-block-gap-2/3 flex items-start gap-4 sm:mb-block-gap;

  .title {
    @apply h1 my-auto inline;
  }
}
</style>
