import { WITHDRAWAL_DELAY } from './../store/zksync/transactionStatus';
import type { Token } from "@/types";

export const ETH_TOKEN: Token = {
  address: "0x000000000000000000000000000000000000800A",
  l1Address: "0x0000000000000000000000000000000000000000",
  symbol: "ETH",
  name: "Ether",
  decimals: 18,
  iconUrl: "/img/eth.svg",
};

export const WITHDRAWAL_DELAY_DAYS = 14;

export const MERGE_TOKENS = [
  {
    symbol: "USDT",
    address: "0x2F8A25ac62179B31D62D7F80884AE57464699059",
    targetNetworkKeys: ["ethereum", "arbitrum", "zksync", "primary", "manta", "mantle", "optimism"],
    decimals: 6,
  },
  {
    symbol: "WBTC",
    address: "0xDa4AaEd3A53962c83B35697Cd138cc6df43aF71f",
    targetNetworkKeys: ["ethereum", "arbitrum", "zksync", "primary", "manta", "mantle", "optimism"],
    decimals: 18,
  },
  {
    symbol: "USDC",
    address: "0x1a1A3b2ff016332e866787B311fcB63928464509",
    targetNetworkKeys: ["ethereum", "arbitrum", "zksync", "primary", "manta", "mantle", "optimism", "base"],
    decimals: 6,
  },
  {
    symbol: "DAI",
    address: "0xF573fA04A73d5AC442F3DEa8741317fEaA3cDeab",
    targetNetworkKeys: ["ethereum", "arbitrum", "zksync", "primary", "optimism", "base"],
    decimals: 18,
  },
];

export const isMergeToken = (address: string) => {
  return address ? MERGE_TOKENS.some((token) => token.address.toLowerCase() === address.toLowerCase()) : false;
};

export const isSupportedMergeToken = (address: string, networkKey: string) => {
  if (address && networkKey) {
    const token = MERGE_TOKENS.find((token) => token.address.toLowerCase() === address.toLowerCase());
    return token ? token.targetNetworkKeys.includes(networkKey) : false;
  } else {
    return false;
  }
};

export const MergeTokenContractUrl = "https://explorer.zklink.io/address/0x83FD59FD58C6A5E6eA449e5400D02803875e1104";
