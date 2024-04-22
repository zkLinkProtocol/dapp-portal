import { useStorage } from "@vueuse/core";

import type { TokenAmount } from "@/types";

import { useNetworkStore } from "@/store/network";
import { useOnboardStore } from "@/store/onboard";
import { useZkSyncEthereumBalanceStore } from "@/store/zksync/ethereumBalance";

type SearchToken = { networkKey: string } & TokenAmount;
export const useSearchtokenStore = defineStore("searchToken", () => {
  const onboardStore = useOnboardStore();
  const { selectedNetwork } = storeToRefs(useNetworkStore());
  const searchTokenStorage = useStorage("useSearchtokenStore", [] as SearchToken[]);
  const zkSyncEthereumBalanceStore = useZkSyncEthereumBalanceStore();
  const saveSearchToken = (token: TokenAmount) => {
    if (!searchTokenStorage.value.some((e) => e.address === token.address)) {
      searchTokenStorage.value.push({
        ...token,
        networkKey: selectedNetwork.value.key,
      });
      zkSyncEthereumBalanceStore.requestBalance();
    }
  };

  const {
    result: balance,
    inProgress: balanceInProgress,
    error: balanceError,
    execute: requestBalance,
    reset: resetBalance,
  } = usePromise<TokenAmount[]>(
    async () => {
      searchTokenStorage.value = JSON.parse(localStorage.getItem("useSearchtokenStore") || "[]");
      return Object.values(searchTokenStorage.value).filter((e) => e.networkKey === selectedNetwork.value.key);
    },
    { cache: false }
  );

  onboardStore.subscribeOnAccountChange(() => {
    resetBalance();
  });

  return {
    balance,
    balanceInProgress,
    balanceError,
    requestBalance,
    saveSearchToken,
  };
});
