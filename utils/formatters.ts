import { BigNumber, type BigNumberish } from "ethers";
import { formatUnits, getAddress, parseUnits } from "ethers/lib/utils";
import { BaseError } from "viem";

export function shortenAddress(address: string, chars = 3): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-3)}`;
}

export function parseTokenAmount(amount: BigNumberish, decimals: number): string {
  const result = formatUnits(amount.toString(), decimals).toString();
  if (result.endsWith(".0")) {
    return result.slice(0, -2);
  }
  return result;
}

export function decimalToBigNumber(amount: string, decimals: number) {
  return parseUnits(amount, decimals);
}

export function formatRawTokenPrice(amount: BigNumberish, decimals: number, price: number): number {
  const tokenAmount = parseTokenAmount(amount, decimals);
  return parseFloat(tokenAmount) * price;
}
export function formatPricePretty(price: number): string {
  if (!price) {
    return "$0.00";
  } else if (price < 0.01) {
    return "<$0.01";
  }
  return "$" + price.toFixed(2);
}
export function formatTokenPrice(amount: BigNumberish, decimals: number, price: number): string {
  return formatPricePretty(formatRawTokenPrice(amount, decimals, price));
}

/* Might return value like "0.0000" */
export function removeSmallAmount(
  amount: BigNumberish,
  decimals: number,
  price: number,
  minTokenValue = 0.001,
  maxChars = 6
): string {
  const tokenAmount = parseTokenAmount(amount, decimals);
  // eslint-disable-next-line prefer-const
  let [whole, fractional] = tokenAmount.split(".");
  if (!fractional) {
    fractional = "0";
  }
  if (whole.length > maxChars) {
    return whole;
  }

  let acc = whole + ".";
  for (let a = 0; a < fractional.length; a++) {
    const currentDecimalAmount = "0." + "".padEnd(a, "0") + "9";
    const currentPrice = parseFloat(currentDecimalAmount) * price;
    if (currentPrice >= minTokenValue || acc.length + 1 < maxChars) {
      acc += fractional[a];
    } else {
      break;
    }
  }
  if (acc.endsWith(".0")) {
    return acc.slice(0, -2);
  } else if (acc.endsWith(".")) {
    return acc.slice(0, -1);
  }
  return acc;
}

/* Fixes value like "0.0000" with "<0.0001" */
export function removeSmallAmountPretty(
  amount: BigNumberish,
  decimals: number,
  price: number,
  minTokenValue?: number,
  maxChars?: number
): string {
  if (BigNumber.from(amount).isZero()) {
    return "0";
  }
  const withoutSmallAmount = removeSmallAmount(amount, decimals, price, minTokenValue, maxChars);
  if (isOnlyZeroes(withoutSmallAmount)) {
    return `<${withoutSmallAmount.slice(0, -1)}1`;
  }
  return withoutSmallAmount;
}

export function checksumAddress(address: string) {
  return getAddress(address);
}

export function formatError(error?: Error) {
  if (!error?.message) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof error === "object" && (error as any).code === 4001) {
      return undefined;
    }
    error = Object.assign(new Error("Unknown error"), error);
  }
  const message = error?.message;
  if (typeof message === "string") {
    if (
      message.includes("User denied") ||
      message.includes("User rejected") ||
      message.includes("Rejected by user") ||
      message.includes('"Request rejected"') ||
      message.includes("user rejected transaction") ||
      message.includes("not configured for connector")
    ) {
      return undefined;
    } else if (message.toLowerCase().includes("fee is to low")) {
      return new Error("Transaction fee was to low. Try again.");
    } else if (
      message === "Network Error" ||
      message === "Failed to fetch ()" ||
      message.includes("<no response> Failed to fetch") ||
      message.includes("noNetwork") ||
      (error instanceof BaseError && error?.details?.startsWith("Failed to fetch"))
    ) {
      return new Error("Network error. Check your internet connection and try again.");
    }
  }
  return error;
}
