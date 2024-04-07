import { getBalance, multicall } from "@wagmi/core";

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
    console.log("chain: ", l1Network.value, network.value);
    if (l1Network.value?.id === network.value.chainId) {
      const ethBalance = await getBalance(wagmiConfig as Config, {
        address: account.value.address!,
        chainId: l1Network.value!.id,
        token: undefined,
      });
      const erc20Tokens = filterL1tokens.filter((t) => t.address !== ETH_TOKEN.l1Address);
      const filterTokenBalances = await multicall(wagmiConfig as Config, {
        contracts: erc20Tokens.map((item) => ({
          address: item.address as Hash,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [account.value.address!],
        })),
      });
      console.log("filterTokenBalances: ", filterTokenBalances);
      const searchTokens = (searchTokenBalance.value ?? []).filter(
        (token) => !Object.values(l1Tokens.value ?? []).find((e) => e.address === token.address)
      );
      const searchTokenBalances = await multicall(wagmiConfig as Config, {
        contracts: searchTokens.map((item) => ({
          address: item.address as Hash,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [account.value.address!],
        })),
      });
      console.log("searchTokenBalances: ", searchTokenBalances);
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
    } else {
      return await Promise.all([
        ...filterL1tokens.map(async (token) => {
          const amount = await getBalance(wagmiConfig as Config, {
            address: account.value.address!,
            chainId: l1Network.value!.id,
            token: token.address === ETH_TOKEN.l1Address ? undefined : (token.address! as Hash),
          });
          return {
            ...token,
            amount: amount.value.toString(),
          };
        }),
        ...(searchTokenBalance.value ?? [])
          .filter((token) => !Object.values(l1Tokens.value ?? []).find((e) => e.address === token.address))
          .map(async (e) => {
            const amount = await getBalance(wagmiConfig as Config, {
              address: account.value.address!,
              chainId: l1Network.value!.id,
              token: e.address === ETH_TOKEN.l1Address ? undefined : (e.address! as Hash),
            });
            return {
              ...e,
              amount: amount.value.toString(),
            };
          }),
      ]);
    }
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
