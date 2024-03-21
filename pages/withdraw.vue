<template>
  <ModalTransactionWithdrawalUnavailable />

  <TransferView type="withdrawal">
    <template #title>
      <PageTitle>Withdraw</PageTitle>
    </template>
  </TransferView>
</template>

<script lang="ts" setup>
import TransferView from "@/views/transactions/Withdraw.vue";
</script>

<style lang="scss" scoped></style>
