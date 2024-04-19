import Hyperchains from "@/hyperchains/config.json";

import type { ZkSyncNetwork } from "@/data/networks";
import type { Token } from "@/types";

import { zkSyncNetworks as defaultEraNetworks, nexusGoerliNode, nexusSepoliaNode, nexusNode } from "@/data/networks";
import { PRIMARY_CHAIN_KEY } from "~/zksync-web3-nova/src/utils";

export default () => {
  const runtimeConfig = useRuntimeConfig();

  const isCustomNode = !!runtimeConfig.public.nodeType;
  const zkSyncNetworks: ZkSyncNetwork[] = [];

  if (runtimeConfig.public.nodeType === "nexus") {
    zkSyncNetworks.push(...nexusNode);
  } else if (runtimeConfig.public.nodeType === "nexus-goerli") {
    zkSyncNetworks.push(...nexusGoerliNode);
  } else if (runtimeConfig.public.nodeType === "nexus-sepolia") {
    zkSyncNetworks.push(...nexusSepoliaNode);
  } else if (runtimeConfig.public.nodeType === "hyperchain") {
    zkSyncNetworks.push(
      ...(Hyperchains as unknown as Array<{ network: ZkSyncNetwork; tokens: Token[] }>).map((e) => ({
        ...e.network,
        getTokens: () => e.tokens,
      }))
    );
  } else {
    zkSyncNetworks.push(...defaultEraNetworks);
  }

  const defaultNetwork = zkSyncNetworks[0];
  const primaryNetwork = zkSyncNetworks.find((e) => e.key === PRIMARY_CHAIN_KEY);
  if (!primaryNetwork) {
    throw new Error("can not find primary chain. nodeType: " + runtimeConfig.public.nodeType);
  }
  const nexusNetworks: Record<string, ZkSyncNetwork> = {};
  for (let index = 0; index < zkSyncNetworks.length; index++) {
    const element = zkSyncNetworks[index];
    nexusNetworks[element.key] = element;
  }
  const isMainnet = runtimeConfig.public.nodeType === "nexus";
  const getNetworkInfo = (transactionInfo:any) => {
    if (transactionInfo.gateway) {
      const newNetwork = zkSyncNetworks.find(
        (item) => item.l1Gateway && item.l1Gateway.toLowerCase() === transactionInfo.gateway?.toLowerCase()
      );
      return newNetwork ?? primaryNetwork;
    } else {
      let obj = zkSyncNetworks.find(
        (item) => item.key && item.key.toLowerCase() === (transactionInfo.token?.networkKey || 'primary').toLowerCase()
      )
      return obj ?? primaryNetwork;
    }
  };
  return {
    isCustomNode,
    nexusNetworks,
    zkSyncNetworks,
    defaultNetwork,
    primaryNetwork,
    isMainnet,
    getNetworkInfo,
  };
};
