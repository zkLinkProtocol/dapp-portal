import usePaginatedRequest from "@/composables/zksync/usePaginatedRequest";

import type { Api, Token } from "@/types";

import { useOnboardStore } from "@/store/onboard";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { mapApiTransfer } from "@/utils/mappers";
import { IL2BridgeFactory } from "~/zksync-web3-nova/typechain";
import { BigNumberish } from "ethers";
import { Address, erc20Abi } from "viem";
import useNetworks from "@/composables/useNetworks";

const TRANSACTIONS_FETCH_LIMIT = 50;
type Transaction = Api.Response.Transaction;
export const useFailedDepositHistoryStore = defineStore("failedDepositHistory", () => {
  const onboardStore = useOnboardStore();
  const providerStore = useZkSyncProviderStore();
  const { eraNetwork } = storeToRefs(useZkSyncProviderStore());
  const { account } = storeToRefs(onboardStore);
  const { zkSyncNetworks } = useNetworks();
  const runtimeConfig = useRuntimeConfig();

  const {
    canLoadMore,
    loadNext,
    reset: resetPaginatedRequest,
  } = usePaginatedRequest<Api.Response.Transaction>(() => {
    if (!eraNetwork.value.blockExplorerApi)
      throw new Error(`Block Explorer API is not available on ${eraNetwork.value.name}`);
    const url = new URL(`/address/${account.value.address}/failedTransactions`, eraNetwork.value.blockExplorerApi);
    url.searchParams.set("limit", TRANSACTIONS_FETCH_LIMIT.toString());
    return url;
  });

  const transfers = ref<Transaction[]>([]);

  const formatErc20 = async (token: Address, amount: BigNumberish, networkKey: string) => {
    if (networkKey === "ethereum" && runtimeConfig.public.nodeType === "nexus-sepolia") {
      networkKey = "sepolia";
    }
    const network = zkSyncNetworks.find((item) => item.key === networkKey);
    if (!network) throw new Error("Invalid networ key: " + networkKey);
    const publicClient = onboardStore.getPublicClient(network.l1Network?.id);
    const [symbol, decimals] = await Promise.all([
      publicClient?.readContract({
        abi: erc20Abi,
        address: token,
        functionName: "symbol",
        args: [],
      }),
      publicClient?.readContract({
        abi: erc20Abi,
        address: token,
        functionName: "decimals",
        args: [],
      }),
    ]);
    return {
      address: token,
      symbol: symbol!,
      amount,
      decimals: decimals!,
      l2Address: "",
    };
  };
  const {
    inProgress: requestFailedDepositTransfersInProgress,
    error: requestFailedDepositTransfersError,
    execute: requestFailedDepositTransfers,
    reset: resetRequestFailedDepositTransfers,
    reload: reloadFailedDepositTransfers,
  } = usePromise(
    async () => {
      if (transfers.value.length) {
        resetPaginatedRequest();
      }
      const response = await loadNext();
      const mappedTransfers = response.items;

      const l2Provider = await providerStore.requestProvider();
      const tokens = mappedTransfers
        .map((tx) => {
          const l2BridgeAddress = tx.to;
          const l2Bridge = IL2BridgeFactory.connect(l2BridgeAddress, l2Provider);
          let calldata;
          try {
            calldata = l2Bridge.interface.decodeFunctionData("finalizeDepositToMerge", tx.data); // we know only these two cases for failed deposit
          } catch (e) {
            //do nothing
          }
          if (!calldata) {
            try {
              calldata = l2Bridge.interface.decodeFunctionData("finalizeDeposit", tx.data);
            } catch (e) {
              //do nothing
            }
          }
          if (!calldata) {
            return;
          }
          console.log("calldata: ", calldata);
          const amount = calldata._amount as BigNumberish;
          const token = calldata._l1Token as Address;
          return {
            hash: tx.hash,
            amount,
            token,
            networkKey: tx.networkKey,
          };
        })
        .filter((item) => !!item);
      const tokenDatas = await Promise.all(tokens.map((item) => formatErc20(item.token, item.amount, item.networkKey)));
      const result = [];
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const transfer = mappedTransfers.find((item) => item.hash === token!.hash);
        if (transfer) {
          transfer.token = tokenDatas[i];
          result.push(transfer);
        }
      }
      transfers.value = [...result];
    },
    { cache: 30000 }
  );

  onboardStore.subscribeOnAccountChange(() => {
    transfers.value = [];
    resetRequestFailedDepositTransfers();
    resetPaginatedRequest();
  });
  return {
    failedTransfers: computed(() => transfers.value),
    requestFailedDepositTransfersInProgress,
    requestFailedDepositTransfersError,
    requestFailedDepositTransfers,
    reloadFailedDepositTransfers,
    canLoadMore,
  };
});
