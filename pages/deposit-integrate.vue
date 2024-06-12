<template>
  <ModalTransactionDepositUnavailable />

  <DepositView :is-integrate="true" />
</template>
  
  <script lang="ts" setup>
import { computed } from "vue";

import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";
import DepositView from "@/views/transactions/Deposit.vue";

</script>
  
  <style lang="scss" scoped></style>
  