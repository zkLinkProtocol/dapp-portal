<template>
  <div class="page-desc">
    <p class="desc" v-bind:style="{ fontSize: pageDescFontSize }">
      <slot />
    </p>
  </div>
</template>
  
  <script lang="ts" setup>
import { computed } from "vue";

import { useRoute } from "#app";

const route = useRoute();

const pageDescFontSize = computed(() => {
  const size = route.query?.desc_size;
  return size + "px";
});
</script>
  
  <style lang="scss" scoped>
.page-desc {
  @apply mb-block-gap-1/2 sm:mb-block-gap mt-[-20px];

  .desc {
    @apply my-auto inline;
  }
}
</style>
  