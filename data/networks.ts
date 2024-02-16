import { goerli, mainnet, sepolia, arbitrumSepolia, scrollSepolia, zkSyncSepoliaTestnet } from "@wagmi/core/chains";

import type { Token } from "@/types";
import type { Chain } from "@wagmi/core/chains";
import { PRIMARY_CHAIN_KEY } from "@/zksync-web3-nova/src/utils";
import { Address } from "@wagmi/core";

export const l1Networks = {
  mainnet: {
    ...mainnet,
    name: "Ethereum",
    network: "mainnet",
  },
  goerli: {
    ...goerli,
    name: "Ethereum Goerli Testnet",
  },
  sepolia: {
    ...sepolia,
    name: "Ethereum Sepolia Testnet",
  },

  arbitrumSepolia: {
    ...arbitrumSepolia,
    name: "Arbitrum Sepolia Testnet",
    blockExplorers: {
      default: {
        name: "Arbiscan",
        url: "https://sepolia.arbiscan.io",
      },
    },
  },
  scrollSepolia: {
    ...scrollSepolia,
    name: "Scroll Sepolia Testnet",
  },
  zkSyncSepoliaTestnet: {
    ...zkSyncSepoliaTestnet,
    name: "zkSync Sepolia Testnet",
  },
} as const;
export type L1Network = Chain;
export type ZkSyncNetwork = {
  id: number;
  key: string;
  name: string;
  rpcUrl: string;
  hidden?: boolean; // If set to true, the network will not be shown in the network selector
  l1Network?: L1Network;
  blockExplorerUrl?: string;
  blockExplorerApi?: string;
  withdrawalFinalizerApi?: string;
  logoUrl?: string;
  displaySettings?: {
    showPartnerLinks?: boolean;
  };
  mainContract?: Address;
  erc20BridgeL1?: Address;
  erc20BridgeL2?: Address;
  getTokens?: () => Token[] | Promise<Token[]>; // If blockExplorerApi is specified, tokens will be fetched from there. Otherwise, this function will be used.
};

export const nexusNode: ZkSyncNetwork[] = [
  {
    id: 810181,
    key: "sepolia",
    name: "zkLink Nova Testnet",
    rpcUrl: "https://sepolia.rpc.zklink.network",
    logoUrl: "/img/ethereum.svg",
    blockExplorerUrl: "https://sepolia.explorer.zklink.network",
    blockExplorerApi: "http://localhost:3020",
    withdrawalFinalizerApi: "https://sepolia.withdrawal-api.zklink.network",
    mainContract: "0x53438eddeB3d3fD39c99150acA2575f73cE14198",
    erc20BridgeL1: "0x9FF541E9de225157d245Ca46cFF6868e5c289C8F",
    erc20BridgeL2: "0x3247575b4336C79956C5Df667A19C0AcBA9C62D6",
    //TODO
    l1Network: l1Networks.sepolia,
  },
  {
    id: 810181,
    key: PRIMARY_CHAIN_KEY, //"primary"
    name: "zkLink Nova Testnet",
    rpcUrl: "https://sepolia.rpc.zklink.network",
    logoUrl: "/img/arbitrum-arb-logo.svg",
    blockExplorerUrl: "https://sepolia.explorer.zklink.network",
    blockExplorerApi: "http://localhost:3020",
    withdrawalFinalizerApi: "https://sepolia.withdrawal-api.zklink.network",
    mainContract: "0x788269f9353D7cbfE33c0889B7Dd1CAe833636E6",
    erc20BridgeL1: "0x72de6d167ded1ee5fba17334bdcce686f3204d38",
    erc20BridgeL2: "0x1895de0bea0eb8d8c7e6997c9be7649bb402d9e6",
    //TODO
    l1Network: l1Networks.arbitrumSepolia,
  },
  {
    id: 810181,
    key: "zksyncsepolia",
    name: "zkLink Nova Testnet",
    rpcUrl: "https://sepolia.rpc.zklink.network",
    logoUrl: "/img/era.svg",
    blockExplorerUrl: "https://sepolia.explorer.zklink.network",
    blockExplorerApi: "http://localhost:3020",
    withdrawalFinalizerApi: "https://sepolia.withdrawal-api.zklink.network",
    mainContract: "0x916aa29B23DBC0f143e1cEaE0460C874FCEc0f58",
    erc20BridgeL1: "0x",
    erc20BridgeL2: "0x",
    // TODO
    l1Network: l1Networks.zkSyncSepoliaTestnet,
  },
  {
    id: 810181,
    key: "scrollsepolia",
    name: "zkLink Nova Testne",
    rpcUrl: "https://sepolia.rpc.zklink.network",
    logoUrl: "/img/sepolia.jpg",
    blockExplorerUrl: "https://sepolia.explorer.zklink.network",
    blockExplorerApi: "http://localhost:3020",
    withdrawalFinalizerApi: "https://sepolia.withdrawal-api.zklink.network",
    mainContract: "0x939016af6140141d89C4252b0c0013F4e5F1f4D7",
    erc20BridgeL1: "0x",
    erc20BridgeL2: "0x",
    //TODO
    l1Network: l1Networks.scrollSepolia,
  },
];

export const zkSyncNetworks: ZkSyncNetwork[] = [
  {
    id: 324,
    key: "mainnet",
    name: "zkSync",
    rpcUrl: "https://mainnet.era.zksync.io",
    blockExplorerUrl: "https://explorer.zksync.io",
    blockExplorerApi: "https://block-explorer-api.mainnet.zksync.io",
    withdrawalFinalizerApi: "https://withdrawal-finalizer-api.zksync.io",
    displaySettings: {
      showPartnerLinks: true,
    },
    l1Network: l1Networks.mainnet,
  },
  {
    id: 300,
    key: "sepolia",
    name: "zkSync Sepolia Testnet",
    rpcUrl: "https://sepolia.era.zksync.dev",
    blockExplorerUrl: "https://sepolia.explorer.zksync.io",
    blockExplorerApi: "https://block-explorer-api.sepolia.zksync.dev",
    withdrawalFinalizerApi: "https://withdrawal-finalizer-api.sepolia.zksync.dev",
    displaySettings: {
      showPartnerLinks: true,
    },
    l1Network: l1Networks.sepolia,
  },
  {
    id: 280,
    key: "goerli",
    name: "zkSync Goerli Testnet",
    rpcUrl: "https://testnet.era.zksync.dev",
    blockExplorerUrl: "https://goerli.explorer.zksync.io",
    blockExplorerApi: "https://block-explorer-api.testnets.zksync.dev",
    withdrawalFinalizerApi: "https://withdrawal-finalizer-api.testnets.zksync.dev",
    displaySettings: {
      showPartnerLinks: true,
    },
    l1Network: l1Networks.goerli,
  },
  {
    id: 270,
    key: "stage",
    name: "zkSync Stage",
    rpcUrl: "https://z2-dev-api.zksync.dev",
    blockExplorerUrl: "https://goerli-beta.staging-scan-v2.zksync.dev",
    blockExplorerApi: "https://block-explorer-api.stage.zksync.dev",
    withdrawalFinalizerApi: "https://withdrawal-finalizer-api.stage.zksync.dev",
    l1Network: l1Networks.sepolia,
    hidden: true,
  },
];
