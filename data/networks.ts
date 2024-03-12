import {
  goerli,
  mainnet,
  sepolia,
  arbitrumSepolia,
  scrollSepolia,
  zkSyncSepoliaTestnet,
  lineaTestnet,
  linea,
  mantle,
  mantleTestnet,
  zkSync,
  arbitrum,
  manta,
  mantaTestnet,
} from "@wagmi/core/chains";

import type { Token } from "@/types";
import type { Chain } from "@wagmi/core/chains";
import { PRIMARY_CHAIN_KEY } from "@/zksync-web3-nova/src/utils";
import { Address } from "@wagmi/core";
import Hyperchains from "@/hyperchains/config.json";

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
  linea: {
    ...linea,
    name: "Linea Mainnet",
  },
  mantle: {
    ...mantle,
    name: "Mantle Mainnet",
  },
  arbitrum: {
    ...arbitrum,
    name: "Arbitrum Mainnet",
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
  zkSync: {
    ...zkSync,
    name: "zkSync Mainnet",
  },
  zkSyncSepoliaTestnet: {
    ...zkSyncSepoliaTestnet,
    name: "zkSync Sepolia Testnet",
  },
  lineaGoerliTestnet: {
    ...lineaTestnet,
    name: "Linea Goerli Testnet",
  },
  mantleGoerliTestnet: {
    ...mantleTestnet,
    name: "Mantle Goerli Testnet",
  },
  mantaGoerliTestnet: {
    ...mantaTestnet,
    name: "Manta Goerli Testnet",
  },
  manta: {
    ...manta,
    name: "Manta Mainnet",
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
  l1Gateway?: Address;
  isEthGasToken?: boolean;
  getTokens?: () => Token[] | Promise<Token[]>; // If blockExplorerApi is specified, tokens will be fetched from there. Otherwise, this function will be used.
};

export const nexusNode: ZkSyncNetwork[] = [
  {
    id: 810180,
    key: "ethereum",
    name: "zkLink Nova",
    rpcUrl: "https://rpc.zklink.io",
    logoUrl: "/img/ethereum.svg",
    blockExplorerUrl: "https://explorer.zklink.io",
    blockExplorerApi: "https://explorer-api.zklink.io",
    withdrawalFinalizerApi: "https://withdrawal-api.zklink.io",
    mainContract: "0x5fD9F73286b7E8683Bab45019C94553b93e015Cf",
    erc20BridgeL1: "0xAd16eDCF7DEB7e90096A259c81269d811544B6B6",
    erc20BridgeL2: "0x36CaABbAbfB9C09B722d9C3697C3Cb4A93650ea7",
    l1Gateway: "0x83Bc7394738A7A084081aF22EEC0051908c0055c",
    isEthGasToken: true,
    l1Network: l1Networks.mainnet,
  },
  {
    id: 810180,
    key: PRIMARY_CHAIN_KEY, //"primary"
    name: "zkLink Nova",
    rpcUrl: "https://rpc.zklink.io",
    logoUrl: "/img/linea.svg",
    blockExplorerUrl: "https://explorer.zklink.io",
    blockExplorerApi: "https://explorer-api.zklink.io",
    withdrawalFinalizerApi: "https://withdrawal-api.zklink.io",
    mainContract: "0x5Cb18b6e4e6F3b46Ce646b0f4704D53724C5Df05",
    erc20BridgeL1: "0x62cE247f34dc316f93D3830e4Bf10959FCe630f8",
    erc20BridgeL2: "0x01c3f51294494e350AD69B999Db6B382b3B510b9",
    isEthGasToken: true,
    l1Network: l1Networks.linea,
  },
  {
    id: 810180,
    key: "zksync",
    name: "zkLink Nova",
    rpcUrl: "https://rpc.zklink.io",
    logoUrl: "/img/zksync.svg",
    blockExplorerUrl: "https://explorer.zklink.io",
    blockExplorerApi: "https://explorer-api.zklink.io",
    withdrawalFinalizerApi: "https://withdrawal-api.zklink.io",
    mainContract: "0xaFe8C7Cf33eD0fee179DFF20ae174C660883273A",
    erc20BridgeL1: "0xaB3DDB86072a35d74beD49AA0f9210098ebf2D08",
    erc20BridgeL2: "0x7187DB8AB8F65450a74dD40474bE778CF468C44a",
    l1Gateway: "0xeCD189e0f390826E137496a4e4a23ACf76c942Ab",
    isEthGasToken: true,
    l1Network: l1Networks.zkSync,
  },
  {
    id: 810180,
    key: "arbitrum",
    name: "zkLink Nova",
    rpcUrl: "https://rpc.zklink.io",
    logoUrl: "/img/arbitrum-arb-logo.svg",
    blockExplorerUrl: "https://explorer.zklink.io",
    blockExplorerApi: "https://explorer-api.zklink.io",
    withdrawalFinalizerApi: "https://withdrawal-api.zklink.io",
    mainContract: "0xFF73a1a1d27951A005eb23276dc99CB7F8d5420A",
    erc20BridgeL1: "0xfB0Ad0B3C2605A7CA33d6badd0C685E11b8F5585",
    erc20BridgeL2: "0x6B7551DBbaE2fb728cF851baee5c3A52DF6F60a4",
    l1Gateway: "0x273D59aed2d793167c162E64b9162154B07583C0",
    isEthGasToken: true,
    l1Network: l1Networks.arbitrum,
  },
  {
    id: 810180,
    key: "mantle",
    name: "zkLink Nova",
    rpcUrl: "https://rpc.zklink.io",
    logoUrl: "/img/mantle.svg",
    blockExplorerUrl: "https://explorer.zklink.io",
    blockExplorerApi: "https://explorer-api.zklink.io",
    withdrawalFinalizerApi: "https://withdrawal-api.zklink.io",
    mainContract: "0xD784d7128B46B60Ca7d8BdC17dCEC94917455657",
    erc20BridgeL1: "0x62351b47e060c61868Ab7E05920Cb42bD9A5f2B2",
    erc20BridgeL2: "0x321Ce902eDFC6466B224ce5D9A7Bc16858855272",
    l1Gateway: "0xdE1Ce751405Fe6D836349226EEdCDFFE1C3BE269",
    isEthGasToken: false,
    l1Network: l1Networks.mantle,
  },
  {
    id: 810180,
    key: "manta",
    name: "zkLink Nova",
    rpcUrl: "https://rpc.zklink.io",
    logoUrl: "/img/manta.jpg",
    blockExplorerUrl: "https://explorer.zklink.io",
    blockExplorerApi: "https://explorer-api.zklink.io",
    withdrawalFinalizerApi: "https://withdrawal-api.zklink.io",
    mainContract: "0xD784d7128B46B60Ca7d8BdC17dCEC94917455657",
    erc20BridgeL1: "0x44a65dc12865A1e5249b45b4868f32b0E37168FF",
    erc20BridgeL2: "0xa898E175CfDE9C6ABfCF5948eEfBA1B852eE5B09",
    l1Gateway: "0x649Dfa2c4d09D877419fA1eDC4005BfbEF7CD82D",
    isEthGasToken: true,
    l1Network: l1Networks.manta,
  },
];

export const nexusGoerliNode: ZkSyncNetwork[] = [
  {
    id: 810182,
    key: "goerli",
    name: "zkLink Nova Testnet",
    rpcUrl: "https://goerli.rpc.zklink.io",
    logoUrl: "/img/ethereum.svg",
    blockExplorerUrl: "https://goerli.explorer.zklink.io",
    blockExplorerApi: "https://goerli.explorer-api.zklink.io",
    withdrawalFinalizerApi: "https://goerli.withdrawal-api.zklink.io",
    mainContract: "0x80e41d1801E5b7F9a9f4e55Fd37bF2F3e797aC64",
    erc20BridgeL1: "0xa403d1A5B552BC17132aAD864F90472794678712",
    erc20BridgeL2: "0x369181F0724D485c2F50E918b1beCEc078C7077C",
    l1Gateway: "0x00546F01728048Af108223C41C4FaD7b124a476f",
    isEthGasToken: true,
    l1Network: l1Networks.goerli,
  },
  {
    id: 810182,
    key: PRIMARY_CHAIN_KEY, //"primary"
    name: "zkLink Nova Testnet",
    rpcUrl: "https://goerli.rpc.zklink.io",
    logoUrl: "/img/linea.svg",
    blockExplorerUrl: "https://goerli.explorer.zklink.io",
    blockExplorerApi: "https://goerli.explorer-api.zklink.io",
    withdrawalFinalizerApi: "https://goerli.withdrawal-api.zklink.io",
    mainContract: "0xF51bdDCC3401572B193140B5326a9dEF03c56198",
    erc20BridgeL1: "0xF58Da74B65544C86F5E16A0c898Ff20718C1cb7d",
    erc20BridgeL2: "0x7cB4A4fCF09dfF32f7f6557b966a942e803C7FAD",
    isEthGasToken: true,
    l1Network: l1Networks.lineaGoerliTestnet,
  },
  {
    id: 810182,
    key: "mantle",
    name: "zkLink Nova Testnet",
    rpcUrl: "https://goerli.rpc.zklink.io",
    logoUrl: "/img/mantle.svg",
    blockExplorerUrl: "https://goerli.explorer.zklink.io",
    blockExplorerApi: "https://goerli.explorer-api.zklink.io",
    withdrawalFinalizerApi: "https://goerli.withdrawal-api.zklink.io",
    mainContract: "0x8fC6d9dE787C4299684B7b307feF44AB3D317e20",
    erc20BridgeL1: "0x0857FDf217E54954c0f4A77B62c04b246ef504CD",
    erc20BridgeL2: "0xD1b7DD1B30b218901d035C951852ae0D97834b68",
    l1Gateway: "0x7bf83D15C8f5a491B36506652A26d4bA0b6cC289",
    isEthGasToken: false,
    l1Network: l1Networks.mantleGoerliTestnet,
  },
  {
    id: 810182,
    key: "manta",
    name: "zkLink Nova Testnet",
    rpcUrl: "https://goerli.rpc.zklink.io",
    logoUrl: "/img/manta.jpg",
    blockExplorerUrl: "https://goerli.explorer.zklink.io",
    blockExplorerApi: "https://goerli.explorer-api.zklink.io",
    withdrawalFinalizerApi: "https://goerli.withdrawal-api.zklink.io",
    mainContract: "0x4Ba4e6Bd860dCDE11fabA9D36c9b03Ee89B0E8B6",
    erc20BridgeL1: "0x91E20Cb04b20132eF5906b2Fd74859F089B61B2D",
    erc20BridgeL2: "0xCDb194C84D5a456D5F155c7B99E71e3A446990d4",
    l1Gateway: "0x296B386381e4EA49EE3cc77734C7c544B51a670C",
    isEthGasToken: false,
    l1Network: l1Networks.mantaGoerliTestnet,
  },
];

export const nexusSepoliaNode: ZkSyncNetwork[] = [
  {
    id: 810181,
    key: "sepolia",
    name: "zkLink Nova Testnet",
    rpcUrl: "https://sepolia.rpc.zklink.network",
    logoUrl: "/img/ethereum.svg",
    blockExplorerUrl: "https://sepolia.explorer.zklink.network",
    blockExplorerApi: "https://sepolia.explorer-api.zklink.network",
    withdrawalFinalizerApi: "https://sepolia.withdrawal-api.zklink.network",
    mainContract: "0x53438eddeB3d3fD39c99150acA2575f73cE14198",
    erc20BridgeL1: "0x9FF541E9de225157d245Ca46cFF6868e5c289C8F",
    erc20BridgeL2: "0x3247575b4336C79956C5Df667A19C0AcBA9C62D6",
    l1Gateway: "0xABE785340e1C1ed3228BC7ec460d2fEdD82260a0",
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
    blockExplorerApi: "https://sepolia.explorer-api.zklink.network",
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

const determineChainList = (): ZkSyncNetwork[] => {
  const zkSyncNetworks: ZkSyncNetwork[] = [];
  const nodeType = process.env.NODE_TYPE || "nexus-goerli";
  console.log(process.env);
  // if (!nodeType) {
  //   throw new Error("NODE_TYPE is not set. ");
  // }
  if (nodeType === "nexus") {
    zkSyncNetworks.push(...nexusNode);
  } else if (nodeType === "nexus-goerli") {
    zkSyncNetworks.push(...nexusGoerliNode);
  } else if (nodeType === "nexus-sepolia") {
    zkSyncNetworks.push(...nexusSepoliaNode);
  } else if (nodeType === "hyperchain") {
    zkSyncNetworks.push(
      ...(Hyperchains as unknown as Array<{ network: ZkSyncNetwork; tokens: Token[] }>).map((e) => ({
        ...e.network,
        getTokens: () => e.tokens,
      }))
    );
  } else {
    zkSyncNetworks.push(...zkSyncNetworks);
  }
  return zkSyncNetworks;
};

export const chainList: ZkSyncNetwork[] = determineChainList();
