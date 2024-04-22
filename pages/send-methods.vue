<template>
  <div>
    <PageTitle :fallback-route="{ name: 'assets' }">Send</PageTitle>

    <div class="space-y-4">
      <CommonCardWithLineButtons size="sm">
        <DestinationItem
          v-bind="destinations.era"
          :label="`Send to another account on ${destinations.era.label}`"
          as="RouterLink"
          :to="{ name: 'send', query: $route.query }"
        />
      </CommonCardWithLineButtons>
      <!-- <CommonCardWithLineButtons>
        <DestinationItem
          v-if="eraNetwork.l1Network"
          v-bind="destinations.arbitrum"
          :label="`Bridge to ${destinations.arbitrum.label}`"
          as="RouterLink"
          :to="{ name: 'withdraw', query: $route.query }"
        />
      </CommonCardWithLineButtons> -->
      <!-- <CommonCardWithLineButtons>
        <DestinationItem
          v-if="eraNetwork.displaySettings?.showPartnerLinks"
          :label="`Bridge to other networks`"
          :description="`Explore ecosystem of third party bridges`"
          :icon="ArrowTopRightOnSquareIcon"
          as="a"
          href="https://zksync.dappradar.com/ecosystem?category-de=bridges"
          target="_blank"
        >
          <template #image>
            <DestinationIconContainer>
              <Squares2X2Icon aria-hidden="true" />
            </DestinationIconContainer>
          </template>
        </DestinationItem>
      </CommonCardWithLineButtons> -->
    </div>
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from "pinia";

import { useDestinationsStore } from "@/store/destinations";

const { destinations } = storeToRefs(useDestinationsStore());
</script>

<style lang="scss" scoped></style>
