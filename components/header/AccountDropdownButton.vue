<template>
  <CommonButtonDropdown>
    <template #left-icon>
      <AddressAvatar :address="account.address!" class="h-full w-full" />
    </template>
    <span ref="addressEl">{{ walletName }}-{{ shortenAddress(account.address!) }}</span>
  </CommonButtonDropdown>
</template>

<script lang="ts" setup>
import { storeToRefs } from "pinia";

import { useOnboardStore } from "@/store/onboard";

const onboardStore = useOnboardStore();
const { account, walletName } = storeToRefs(onboardStore);
</script>
