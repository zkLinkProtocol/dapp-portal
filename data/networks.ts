import { goerli, mainnet, sepolia, arbitrumSepolia, scrollSepolia, zkSyncSepoliaTestnet } from "@wagmi/core/chains";

import type { Token } from "@/types";
import type { Chain } from "@wagmi/core/chains";

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
  mainContract?: string;
  getTokens?: () => Token[] | Promise<Token[]>; // If blockExplorerApi is specified, tokens will be fetched from there. Otherwise, this function will be used.
};

// See the official documentation on running a local zkSync node: https://era.zksync.io/docs/tools/testing/
// Also see the guide in the README.md file in the root of the repository.

// In-memory node default config. Docs: https://era.zksync.io/docs/tools/testing/era-test-node.html
export const inMemoryNode: ZkSyncNetwork = {
  id: 260,
  key: "in-memory-node",
  name: "In-memory node",
  rpcUrl: "http://localhost:8011",
};

// Dockerized local setup default config. Docs: https://era.zksync.io/docs/tools/testing/dockerized-testing.html
export const dockerizedNode: ZkSyncNetwork = {
  id: 270,
  key: "dockerized-node",
  name: "zkLink Nova Testnet",
  rpcUrl: "http://3.85.245.224:3050",
  l1Network: {
    id: 9,
    name: "Arbitrum Sepolia",
    network: "ethereum-node",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: ["http://3.85.245.224:8545"] },
      public: { http: ["http://3.85.245.224:8545"] },
    },
  },
};

export const nexusNode: ZkSyncNetwork[] = [
  {
    id: 810181,
    key: "sepolia",
    name: "zkLink Nova Testnet",
    rpcUrl: "https://sepolia.rpc.zklink.network",
    logoUrl: "/img/ethereum.svg",
    blockExplorerUrl: "https://sepolia.explorer.zklink.network",
    blockExplorerApi: "https://sepolia.explorer-api.zklink.network",
    withdrawalFinalizerApi: "http://3.85.245.224:3000",
    mainContract: "0x53438eddeB3d3fD39c99150acA2575f73cE14198",
    //TODO
    l1Network: l1Networks.sepolia,
  },
  {
    id: 810181,
    key: "primary",
    name: "zkLink Nova Testnet",
    rpcUrl: "https://sepolia.rpc.zklink.network",
    logoUrl: "/img/arbitrum-arb-logo.svg",
    blockExplorerUrl: "https://sepolia.explorer.zklink.network",
    blockExplorerApi: "https://sepolia.explorer-api.zklink.network",
    withdrawalFinalizerApi: "http://3.85.245.224:3000",
    mainContract: "0x788269f9353D7cbfE33c0889B7Dd1CAe833636E6",
    //TODO
    l1Network: l1Networks.arbitrumSepolia,
  },
  /*
  {
    id: 810181,
    key: "zksyncsepolia",
    name: "zkLink Nova Testnet",
    rpcUrl: "https://sepolia.rpc.zklink.network",
    logoUrl: "/img/era.svg",
    blockExplorerUrl: "https://sepolia.explorer.zklink.network",
    blockExplorerApi: "https://sepolia.explorer-api.zklink.network",
    withdrawalFinalizerApi: "",
    mainContract: "0x916aa29B23DBC0f143e1cEaE0460C874FCEc0f58",
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
    blockExplorerApi: "https://sepolia.explorer-api.zklink.network",
    withdrawalFinalizerApi: "",
    mainContract: "0x939016af6140141d89C4252b0c0013F4e5F1f4D7",
    //TODO
    l1Network: l1Networks.scrollSepolia,
  },*/
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
