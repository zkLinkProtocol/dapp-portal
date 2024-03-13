import { type Chain, zkSync, zkSyncSepoliaTestnet } from "@wagmi/core/chains";
import { defaultWagmiConfig } from "@web3modal/wagmi";
import { chainList, type ZkSyncNetwork } from "./networks";

const metadata = {
  name: "zkLink Nova Portal",
  description: "zkLink Nova Portal - view balances, transfer and bridge tokens",
  url: "https://portal.zklink.io",
  icons: ["../public/img/icon.png"],
};

if (!process.env.WALLET_CONNECT_PROJECT_ID) {
  throw new Error("WALLET_CONNECT_PROJECT_ID is not set. Please set it in .env file");
}

const useExistingEraChain = (network: ZkSyncNetwork) => {
  const existingNetworks = [zkSync, zkSyncSepoliaTestnet];
  return existingNetworks.find((existingNetwork) => existingNetwork.id === network.id);
};
const createEraChain = (network: ZkSyncNetwork) => {
  return {
    id: network.id,
    name: network.name,
    network: network.key,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [network.rpcUrl] },
      public: { http: [network.rpcUrl] },
    },
    blockExplorers: { default: { url: network.blockExplorerUrl } },
  };
};
const getAllChains = () => {
  const chains: Chain[] = [];
  const addUniqueChain = (chain: Chain) => {
    if (!chains.find((existingChain) => existingChain.id === chain.id)) {
      chains.push(chain);
    }
  };
  for (const network of chainList) {
    if (network.l1Network) {
      addUniqueChain(network.l1Network);
    }
    addUniqueChain(useExistingEraChain(network) ?? createEraChain(network));
  }

  return chains;
};

export const getWagmiConfig = () => {
  return defaultWagmiConfig({
    chains: getAllChains() as any,
    projectId: process.env.WALLET_CONNECT_PROJECT_ID!,
    metadata,
    enableCoinbase: false,
  });
};

// export const wagmiConfig = getWagmiConfig();
