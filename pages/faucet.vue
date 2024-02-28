<template>
  <div>
    <TypographyCategoryLabel>You can get Goerli Testnet ETH from any of the following faucets.</TypographyCategoryLabel>
    <CommonCardWithLineButtons>
      <DestinationItem v-for="(item, index) in links" :key="index" v-bind="item"> </DestinationItem>
    </CommonCardWithLineButtons>
    <TypographyCategoryLabel>
      If you’re from an established project and need more testnet ETH, please reach out to us through telegram:
      @davidson333
    </TypographyCategoryLabel>
  </div>
</template>
<script lang="ts" setup>
import { ArrowTopRightOnSquareIcon } from "@heroicons/vue/24/outline";
const links = [
  {
    iconUrl: "/img/chainstack-faucet-logo.png",
    label: "ETHEREUM GOERLI FAUCET",
    description: "",
    as: "a",
    href: "https://www.alchemy.com/faucets/ethereum-goerli",
    target: "_blank",
  },
  {
    iconUrl: "/img/EthereumGoerli-Faucet-logo.png",
    label: "Ethereum Faucet for Goerli by QuickNode",
    description: "",
    as: "a",
    href: "https://faucet.quicknode.com/ethereum/goerli",
    target: "_blank",
  },
  {
    iconUrl: "/img/Goerli-faucet-logo.svg",
    label: "Goerli Faucet - Get Free Goerli Testnet ETH",
    description: "",
    as: "a",
    href: "https://faucet.chainstack.com/goerli-testnet-faucet",
    target: "_blank",
  },
];
</script>
