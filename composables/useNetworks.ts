import Hyperchains from "@/hyperchains/config.json";

import type { ZkSyncNetwork } from "@/data/networks";
import type { Token } from "@/types";

import { zkSyncNetworks as defaultEraNetworks, nexusNode } from "@/data/networks";
import { PRIMARY_CHAIN_KEY } from "~/zksync-web3-nova/src/utils";

export default () => {
  const runtimeConfig = useRuntimeConfig();

  const isCustomNode = !!runtimeConfig.public.nodeType;
  const zkSyncNetworks: ZkSyncNetwork[] = [];
  if (runtimeConfig.public.nodeType === "nexus") {
    zkSyncNetworks.push(...nexusNode);
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
  return {
    isCustomNode,

    zkSyncNetworks,
    defaultNetwork,
    primaryNetwork,
  };
};
