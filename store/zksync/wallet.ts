import { BigNumber, ethers, VoidSigner } from "ethers";
import { $fetch } from "ofetch";
import { L1Signer, L1VoidSigner, Web3Provider } from "@/zksync-web3-nova/src";

import useScreening from "@/composables/useScreening";

import type { Api, TokenAmount } from "@/types";
import type { BigNumberish } from "ethers";

import { useOnboardStore } from "@/store/onboard";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { useZkSyncTokensStore } from "@/store/zksync/tokens";
import useNetworks from "@/composables/useNetworks";
import { getPublicClient } from "@wagmi/core";
import { ContractAddresses } from "~/zksync-web3-nova/src/provider";
export const useZkSyncWalletStore = defineStore("zkSyncWallet", () => {
  const onboardStore = useOnboardStore();
  const providerStore = useZkSyncProviderStore();
  const tokensStore = useZkSyncTokensStore();
  const { eraNetwork } = storeToRefs(providerStore);
  const { tokens } = storeToRefs(tokensStore);
  const { account, network } = storeToRefs(onboardStore);
  const { validateAddress } = useScreening();
  const { primaryNetwork } = useNetworks();

  const { execute: getSigner, reset: resetSigner } = usePromise(async () => {
    const walletNetworkId = network.value.chain?.id;
    if (walletNetworkId !== eraNetwork.value.id) {
      throw new Error(
        `Incorrect wallet network selected: #${walletNetworkId} (expected: ${eraNetwork.value.name} #${eraNetwork.value.id})`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const web3Provider = new Web3Provider(
      (await onboardStore.getWallet(eraNetwork.value.id)) as any,
      "any",
      eraNetwork.value.key,
      eraNetwork.value as ContractAddresses
    );
    const eraL2Signer = web3Provider.getSigner();
    return eraL2Signer;
  });
  const { execute: getL1Signer, reset: resetL1Signer } = usePromise(async () => {
    if (!eraNetwork.value.l1Network) throw new Error(`L1 network is not available on ${eraNetwork.value.name}`);

    const walletNetworkId = network.value.chain?.id;
    console.log("walletNetworkId", network.value);
    console.log("eraNetwork.value.l1Network.id", eraNetwork.value.l1Network.id);
    if (walletNetworkId !== eraNetwork.value.l1Network.id) {
      throw new Error(
        `Incorrect wallet network selected: #${walletNetworkId} (expected: ${eraNetwork.value.l1Network.name} #${eraNetwork.value.l1Network.id})`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const web3Provider = new ethers.providers.Web3Provider((await onboardStore.getWallet()) as any, "any");
    const eraL1Signer = L1Signer.from(web3Provider.getSigner(), providerStore.requestProvider());
    return eraL1Signer;
  });
  const getL1VoidSigner = (anyAddress = false,chainId = '',provider:any = null) => {
    if (!account.value.address && !anyAddress) throw new Error("Address is not available");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const web3Provider = new ethers.providers.Web3Provider(onboardStore.getPublicClient(chainId) as any, "any");
    const voidSigner = new VoidSigner(account.value.address || ETH_TOKEN.address, web3Provider);
    return L1VoidSigner.from(voidSigner, provider) as unknown as L1Signer;
  };

  const getPrimaryL1VoidSigner = () => {
    const web3Provider = new ethers.providers.Web3Provider(
      getPublicClient({ chainId: primaryNetwork.l1Network?.id }) as any,
      "any"
    );
    const voidSigner = new VoidSigner(account.value.address || ETH_TOKEN.address, web3Provider);
    return L1VoidSigner.from(voidSigner, providerStore.requestPrimaryProvider()) as unknown as L1Signer;
  };
  const {
    result: accountState,
    execute: requestAccountState,
    reset: resetAccountState,
  } = usePromise<Api.Response.Account | Api.Response.Contract>(async () => {
    if (!account.value.address) throw new Error("Account is not available");
    if (!eraNetwork.value.blockExplorerApi)
      throw new Error(`Block Explorer API is not available on ${eraNetwork.value.name}`);

    return await $fetch(`${eraNetwork.value.blockExplorerApi}/address/${account.value.address}`);
  });

  const getBalancesFromBlockExplorerApi = async (): Promise<TokenAmount[]> => {
    await Promise.all([requestAccountState({ force: true }), tokensStore.requestTokens()]);
    if (!accountState.value) throw new Error("Account state is not available");
    if (!tokens.value) throw new Error("Tokens are not available");
    return Object.entries(accountState.value.balances)
      .filter(([, { token }]) => token)
      .map(([, { balance, token }]) => {
        return {
          address: token!.l2Address,
          l1Address: token!.l1Address || undefined,
          name: token!.name || undefined,
          symbol: token!.symbol!,
          decimals: token!.decimals,
          amount: balance,
        };
      });
  };
  const getBalancesFromRPC = async (): Promise<TokenAmount[]> => {
    await tokensStore.requestTokens();
    if (!tokens.value) throw new Error("Tokens are not available");
    if (!account.value.address) throw new Error("Account is not available");

    const provider = providerStore.requestProvider();
    const balances = await Promise.all(
      Object.entries(tokens.value).map(async ([, token]) => {
        const amount = await provider.getBalance(onboardStore.account.address!, undefined, token.address);
        return {
          ...token,
          amount: amount.toString(),
        };
      })
    );

    return balances;
  };
  const {
    result: balancesResult,
    inProgress: balanceInProgress,
    error: balanceError,
    execute: requestBalance,
    reset: resetBalance,
  } = usePromise<TokenAmount[]>(
    async () => {
      if (eraNetwork.value.blockExplorerApi) {
        return await getBalancesFromBlockExplorerApi();
      } else {
        return await getBalancesFromRPC();
      }
    },
    { cache: 30000 }
  );

  const balance = computed<TokenAmount[]>(() => {
    if (!balancesResult.value) return [];

    const knownTokens: TokenAmount[] = Object.entries(tokens.value ?? {}).map(([, token]) => {
      const amount = balancesResult.value!.find((e) => e.address === token.address)?.amount ?? "0";
      return { ...token, amount };
    });
    const knownTokenAddresses = new Set(knownTokens.map((token) => token.address));

    // Filter out the tokens in `balancesResult` that are not in `tokens`
    const otherTokens = balancesResult.value
      .filter((token) => !knownTokenAddresses.has(token.address))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));

    return [...knownTokens, ...otherTokens];
  });

  const deductBalance = (tokenAddress: string, amount: BigNumberish) => {
    if (!balance.value) return;
    const tokenBalance = balance.value.find((balance) => balance.address === tokenAddress);
    if (!tokenBalance) return;
    const newBalance = BigNumber.from(tokenBalance.amount).sub(amount);
    tokenBalance.amount = newBalance.isNegative() ? "0" : newBalance.toString();
  };

  const isCorrectNetworkSet = computed(() => {
    const walletNetworkId = network.value.chain?.id;
    return walletNetworkId === eraNetwork.value.id;
  });
  const {
    inProgress: switchingNetworkInProgress,
    error: switchingNetworkError,
    execute: switchNetwork,
  } = usePromise(
    async () => {
      return await onboardStore.switchNetworkById(eraNetwork.value.id, eraNetwork.value.name);
    },
    { cache: false }
  );
  const setCorrectNetwork = async () => {
    return await switchNetwork().catch(() => undefined);
  };

  const { execute: walletAddressValidate, reload: reloadWalletAddressValidation } = usePromise(async () => {
    if (!account.value.address) throw new Error("Account is not available");
    await validateAddress(account.value.address); // Throws an error if the address is not valid
  });
  walletAddressValidate().catch(() => undefined);

  onboardStore.subscribeOnAccountChange(() => {
    resetSigner();
    resetL1Signer();
    resetAccountState();
    resetBalance();
    reloadWalletAddressValidation().catch(() => undefined);
  });

  return {
    getSigner,
    getL1Signer,
    getL1VoidSigner,
    getPrimaryL1VoidSigner,

    balance,
    balanceInProgress: computed(() => balanceInProgress.value),
    balanceError: computed(() => balanceError.value),
    requestBalance,
    deductBalance,

    isCorrectNetworkSet,
    switchingNetworkInProgress,
    switchingNetworkError,
    setCorrectNetwork,

    walletAddressValidate,
  };
});
