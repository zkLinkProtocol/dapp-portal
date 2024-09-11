import { BigNumber } from "ethers";

import type { ZkSyncNetwork } from "@/data/networks";
import type { TokenAmount } from "@/types";
import type { BigNumberish } from "ethers";

import { parseTokenAmount } from "@/utils/formatters";

export function isOnlyZeroes(value: string) {
  return value.replace(/0/g, "").replace(/\./g, "").length === 0;
}

export function calculateFee(gasLimit: BigNumberish, gasPrice: BigNumberish) {
  return BigNumber.from(gasLimit).mul(gasPrice);
}

export const getNetworkUrl = (network: ZkSyncNetwork, routePath: string) => {
  const url = new URL(routePath, window.location.origin);
  url.searchParams.set("network", network.key);
  return url.toString();
};

export const isMobile = () => {
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
};

export const calculateTotalTokensPrice = (tokens: TokenAmount[]) => {
  return tokens.reduce((acc, { amount, decimals, price }) => {
    if (typeof price !== "number") return acc;
    return acc + parseFloat(parseTokenAmount(amount, decimals)) * price;
  }, 0);
};

// Changes URL without changing actual router view
export const silentRouterChange = (location: string, mode: "push" | "replace" = "push") => {
  window.history[mode === "push" ? "pushState" : "replaceState"]({}, "", location);
};

interface RetryOptions {
  retries?: number;
}
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  retries: 2,
};
export async function retry<T>(func: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries } = Object.assign({}, DEFAULT_RETRY_OPTIONS, options);
  try {
    return await func();
  } catch (error) {
    if (retries && retries > 0) {
      return retry(func, { retries: retries - 1 });
    } else {
      throw error;
    }
  }
}

export async function sleep(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
export const getEstimateWithdrawalDelayDays = (txTime: string | number) => {
  const transactionTime = new Date(txTime).getTime();
  if (transactionTime < LAST_BLAST_SYNCL2_TIME) {
    return 14;
  } else {
    const gap = Math.ceil(14 - (transactionTime - LAST_BLAST_SYNCL2_TIME) / (24 * 3600 * 1000));
    return gap >= 8 ? gap : 8.5;
  }
};
