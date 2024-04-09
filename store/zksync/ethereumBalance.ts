import { getBalance, getPublicClient } from "@wagmi/core";

import type { Hash, TokenAmount } from "@/types";
import type { Config } from "@wagmi/core";
import type { Address } from "viem";
import { erc20Abi } from "viem";
import { l1Networks } from "@/data/networks";
import { useEthereumBalanceStore } from "@/store/ethereumBalance";
import { useNetworkStore } from "@/store/network";
import { useOnboardStore } from "@/store/onboard";
import { useSearchtokenStore } from "@/store/searchToken";
import { useZkSyncTokensStore } from "@/store/zksync/tokens";
export const useZkSyncEthereumBalanceStore = defineStore("zkSyncEthereumBalances", () => {
  const runtimeConfig = useRuntimeConfig();
  const onboardStore = useOnboardStore();
  const ethereumBalancesStore = useEthereumBalanceStore();
  const tokensStore = useZkSyncTokensStore();
  const { l1Network, selectedNetwork } = storeToRefs(useNetworkStore());
  const wagmiConfig = onboardStore.wagmiConfig;
  const { account, network } = storeToRefs(onboardStore);
  const { balance: ethereumBalance } = storeToRefs(ethereumBalancesStore);
  const { l1Tokens } = storeToRefs(tokensStore);
  const searchToken = useSearchtokenStore();
  const { balance: searchTokenBalance } = storeToRefs(searchToken);
  const getBalancesFromApi = async (): Promise<TokenAmount[]> => {
    await Promise.all([ethereumBalancesStore.requestBalance(), tokensStore.requestTokens()]);

    if (!ethereumBalance.value) throw new Error("Ethereum balances are not available");

    // Get balances from Ankr API and merge them with tokens data from explorer
    return [
      ...ethereumBalance.value.map((e) => {
        const tokenFromExplorer = l1Tokens.value?.[e.address];
        return {
          ...e,
          symbol: tokenFromExplorer?.symbol ?? e.symbol,
          name: tokenFromExplorer?.name ?? e.name,
          iconUrl: tokenFromExplorer?.iconUrl ?? e.iconUrl,
          price: tokenFromExplorer?.price ?? e.price,
        };
      }),
      ...Object.values(l1Tokens.value ?? []) // Add tokens that are not in Ankr API
        .filter((token) => !ethereumBalance.value?.find((e) => e.address === token.address))
        .map((e) => ({
          ...e,
          amount: "0",
        })),
    ];
  };
  const getBalancesFromRPC = async (): Promise<TokenAmount[]> => {
    await Promise.all([tokensStore.requestTokens(), searchToken.requestBalance()]);
    if (!l1Tokens.value) throw new Error("Tokens are not available");
    if (!account.value.address) throw new Error("Account is not available");

    const filterL1tokens = Object.values(l1Tokens.value ?? []).filter(
      (e) => e.networkKey === selectedNetwork.value.key || e.address === ETH_TOKEN.l1Address
    );
    if (selectedNetwork.value.key === "mantle") {
      const nativeToken = filterL1tokens.find((e) => e.address === ETH_TOKEN.l1Address);
      const wmntToken = filterL1tokens.find((e) => e.symbol === "WMNT");
      nativeToken!.symbol = "MNT";
      nativeToken!.price = wmntToken?.price ?? 0;
      nativeToken!.iconUrl = "/img/mantle.svg";
    }
    const publicClient = getPublicClient(wagmiConfig as Config, { chainId: l1Network.value?.id });

    const ethBalance = await getBalance(wagmiConfig as Config, {
      address: account.value.address!,
      chainId: l1Network.value!.id,
      token: undefined,
    });
    const erc20Tokens = filterL1tokens.filter((t) => t.address !== ETH_TOKEN.l1Address);
    const filterTokenBalances =
      (await publicClient?.multicall({
        contracts: erc20Tokens.map((item) => ({
          address: item.address as Hash,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [account.value.address!],
        })),
      })) ?? [];

    const searchTokens = (searchTokenBalance.value ?? []).filter(
      (token) => !Object.values(l1Tokens.value ?? []).find((e) => e.address === token.address)
    );
    const searchTokenBalances =
      (await publicClient?.multicall({
        contracts: searchTokens.map((item) => ({
          address: item.address as Hash,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [account.value.address!],
        })),
      })) ?? [];

    const ethToken = filterL1tokens.find((item) => item.address === ETH_TOKEN.l1Address);
    return [
      { ...ethToken!, amount: ethBalance.value.toString() },
      ...filterTokenBalances.map((item, index) => ({
        ...erc20Tokens[index],
        amount: item.result?.toString() ?? "0",
      })),
      ...searchTokenBalances.map((item, index) => ({
        ...searchTokens[index],
        amount: item.result?.toString() ?? "0",
      })),
    ];
  };
  let isSaveToken = false,
    oldBalance: TokenAmount[];
  const saveTokenRequest = async () => {
    isSaveToken = true;
    oldBalance = balance.value ?? [];
    try {
      await requestBalance({ force: true });
    } catch {}
    isSaveToken = false;
  };

  const {
    result: balance,
    inProgress: balanceInProgress,
    error: balanceError,
    execute: requestBalance,
    reset: resetBalance,
  } = usePromise<TokenAmount[]>(
    async () => {
      if (!l1Network.value) throw new Error(`L1 network is not available on ${selectedNetwork.value.name}`);
      if (isSaveToken) {
        const nt = await searchToken.requestBalance();
        const map = new Map<Address, TokenAmount>();
        const exp = (item: TokenAmount) => map.set(item.address as Address, item);
        nt?.forEach(exp);
        oldBalance.forEach(exp);
        return Array.from(map.values());
      }
      if (
        ([l1Networks.mainnet.id, l1Networks.goerli.id] as number[]).includes(l1Network.value?.id) &&
        runtimeConfig.public.ankrToken
      ) {
        return getBalancesFromApi();
      } else {
        return getBalancesFromRPC();
      }
    },
    { cache: 30000 }
  );

  onboardStore.subscribeOnAccountChange(() => {
    resetBalance();
  });

  return {
    balance,
    balanceInProgress,
    balanceError,
    requestBalance,
    saveTokenRequest,
    deductBalance: ethereumBalancesStore.deductBalance,
  };
});
