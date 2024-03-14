<template>
  <CommonButtonLineWithImg :as="as" :icon="icon" class="destination-item" :class="{ 'disable': disabled }" v-tooltip="'Withdrawal from Nova will be enable in April.'">
    <template #image>
      <slot name="image">
        <CommonImageLoader class="destination-item-icon" :src="iconUrl" />
      </slot>
    </template>
    <template #default>
      <CommonButtonLineBodyInfo class="text-left">
        <template #label v-if="label || $slots['label']">
          <slot name="label">{{ label }}</slot>
          <!-- <span class="marginLeft" v-if="disabled">Coming soon</span> -->
        </template>
        <template #underline v-if="description || $slots['underline']">
          <slot name="underline">
            <div :class="ellipsisdescription ? 'ellipsis' : ''">{{ description }}</div>
          </slot>
        </template>
      </CommonButtonLineBodyInfo>
    </template>
    <template #right v-if="$slots.right">
      <slot name="right" />
    </template>
  </CommonButtonLineWithImg>
</template>

<script lang="ts" setup>
import type { Component, PropType } from "vue";

defineProps({
  as: {
    type: [String, Object] as PropType<string | Component>,
  },
  label: {
    type: String,
  },
  iconUrl: {
    type: String,
  },
  description: {
    type: String,
  },
  icon: {
    type: [Object, Function] as PropType<Component>,
  },
  ellipsisdescription: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  }
});
</script>

<style lang="scss">
.marginLeft{
  display: inline-block;
  position: absolute;
  right: 10px;
  color: #999a9c;
}
.disable{
  background: #252628 !important;
  color: #999a9c !important;
  position: relative;
}
.destination-item {
  .destination-item-icon {
    @apply aspect-square h-auto w-full rounded-full border border-neutral-950/10 dark:border-white/10;

    .image-loader-image {
      @apply box-content;
    }
  }
  .ellipsis {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>
