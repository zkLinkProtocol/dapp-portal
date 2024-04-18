<template>
  <div>
    <PageTitle>Faucet</PageTitle>
    <TypographyCategoryLabel>You can get Goerli Testnet ETH from any of the following faucets.</TypographyCategoryLabel>
    <CommonCardWithLineButtons>
      <DestinationItem v-for="(item, index) in links" :key="index" v-bind="item" :ellipsisdescription="true">
      </DestinationItem>
    </CommonCardWithLineButtons>
    <TypographyCategoryLabel>
      If you’re from an established project and need more testnet ETH, please reach out to us through telegram:
      @davidson333
    </TypographyCategoryLabel>
  </div>
</template>
<script lang="ts" setup>
const links = [
  {
    iconUrl: "/img/chainstack-faucet-logo.png",
    label: "Ethereum Goerli Faucet",
    description: "A fast and reliable Ethereum Goerli testnet faucet for blockchain developers.",
    as: "a",
    href: "https://www.alchemy.com/faucets/ethereum-goerli",
    target: "_blank",
  },
  {
    iconUrl: "/img/EthereumGoerli-Faucet-logo.png",
    label: "Ethereum Faucet for Goerli by QuickNode",
    description:
      "Easy to use Ethereum Faucet for Goerli. Claim your testnet tokens for free - one drip per network every 12 hours.",
    as: "a",
    href: "https://faucet.quicknode.com/ethereum/goerli",
    target: "_blank",
  },
  {
    iconUrl: "/img/Goerli-faucet-logo.svg",
    label: "Goerli Faucet - Get Free Goerli Testnet ETH",
    description:
      "Get free Goerli testnet tokens from Chainstack's faucet. Sign up and get free Goerli testnet ETH tokens.",
    as: "a",
    href: "https://faucet.chainstack.com/goerli-testnet-faucet",
    target: "_blank",
  },
];
</script>
<style scoped></style>
