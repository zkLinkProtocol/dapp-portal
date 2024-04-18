import { useMemoize } from "@vueuse/core";
import { BigNumber, type BigNumberish } from "ethers";

import useNetworks from "@/composables/useNetworks";

import ZkSyncL1BridgeInterface from "@/zksync-web3-nova/abi/IL1Bridge.json";
import ZkSyncContractInterface from "@/zksync-web3-nova/abi/IZkSync.json";

import type { TransactionInfo } from "@/store/zksync/transactionStatus";
import type { Hash } from "@/types";

import { useNetworkStore } from "@/store/network";
import { useOnboardStore } from "@/store/onboard";
import { useZkSyncTokensStore } from "@/store/zksync/tokens";
import { formatError } from "@/utils/formatters";
import { Provider } from "@/zksync-web3-nova/src";
import { Wallet } from "@/zksync-web3-nova/src";

export default (transactionInfo: ComputedRef<TransactionInfo>) => {
  const status = ref<"not-started" | "processing" | "waiting-for-signature" | "sending" | "done">("not-started");
  const error = ref<Error | undefined>();
  const transactionHash = ref<Hash | undefined>();
  const onboardStore = useOnboardStore();
  const tokensStore = useZkSyncTokensStore();
  const { network } = storeToRefs(onboardStore);
  const { tokens } = storeToRefs(tokensStore);
  const { primaryNetwork, zkSyncNetworks } = useNetworks();

  const getNetworkInfo = () => {
    const newNetwork = zkSyncNetworks.find(
      (item) => item.l1Gateway && item.l1Gateway.toLowerCase() === transactionInfo.value.gateway?.toLowerCase()
    );
    return newNetwork ?? primaryNetwork;
  };

  const { selectedNetwork } = storeToRefs(useNetworkStore());
  let provider: Provider | undefined;
  const request = () => {
    const eraNetwork = getNetworkInfo() || selectedNetwork.value;
    if (!provider) {
      provider = new Provider(eraNetwork.rpcUrl);
    }
    //if provider.networkKey != eraNetwork.key
    console.log(eraNetwork.key);
    provider.setContractAddresses(eraNetwork.key, {
      mainContract: eraNetwork.mainContract,
      erc20BridgeL1: eraNetwork.erc20BridgeL1,
      erc20BridgeL2: eraNetwork.erc20BridgeL2,
      l1Gateway: eraNetwork.l1Gateway,
      wethContract: eraNetwork.wethContract,
    });
    provider.setIsEthGasToken(eraNetwork.isEthGasToken ?? true);
    return provider;
  };
  const retrieveBridgeAddress = useMemoize(() =>
    request()
      .getDefaultBridgeAddresses()
      .then((e) => e.erc20L1)
  );
  const retrieveMainContractAddress = useMemoize(() => request().getMainContractAddress());

  const gasLimit = ref<BigNumberish | undefined>();
  const gasPrice = ref<BigNumberish | undefined>();
  const finalizeWithdrawalParams = ref<
    | {
        l1BatchNumber: unknown;
        l2MessageIndex: unknown;
        l2TxNumberInBlock: unknown;
        message: unknown;
        proof: unknown;
      }
    | undefined
  >();

  const totalFee = computed(() => {
    if (!gasLimit.value || !gasPrice.value) return undefined;
    return calculateFee(gasLimit.value, gasPrice.value).toString();
  });
  const feeToken = computed(() => {
    return tokens.value?.[ETH_TOKEN.address];
  });
  const usingMainContract = computed(() => transactionInfo.value.token.address === ETH_TOKEN.address);

  const getFinalizationParams = async () => {
    const provider = request();
    const wallet = new Wallet(
      // random private key cause we don't care about actual signer
      // finalizeWithdrawalParams method only exists on Wallet class
      "0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110",
      provider
    );
    const { l1BatchNumber, l2MessageIndex, l2TxNumberInBlock, message, proof } = await wallet.finalizeWithdrawalParams(
      transactionInfo.value.transactionHash
    );
    return {
      l1BatchNumber,
      l2MessageIndex,
      l2TxNumberInBlock,
      message,
      proof,
    };
  };

  const getTransactionParams = async () => {
    finalizeWithdrawalParams.value = await getFinalizationParams();
    if (usingMainContract.value) {
      return {
        address: (await retrieveMainContractAddress()) as Hash,
        abi: ZkSyncContractInterface.abi,
        account: onboardStore.account.address!,
        functionName: "finalizeEthWithdrawal",
        args: Object.values(finalizeWithdrawalParams.value!),
      };
    } else {
      return {
        address: (await retrieveBridgeAddress()) as Hash,
        abi: ZkSyncL1BridgeInterface.abi,
        account: onboardStore.account.address!,
        functionName: "finalizeWithdrawal",
        args: Object.values(finalizeWithdrawalParams.value!),
      };
    }
  };

  const {
    inProgress: estimationInProgress,
    error: estimationError,
    execute: estimateFee,
  } = usePromise(
    async () => {
      tokensStore.requestTokens();
      const publicClient = onboardStore.getPublicClient();
      if (!publicClient) return;
      const transactionParams = await getTransactionParams();
      const [price, limit] = await Promise.all([
        retry(async () => BigNumber.from((await publicClient.getGasPrice()).toString())),
        retry(async () => {
          return BigNumber.from(
            (
              await publicClient.estimateContractGas({
                ...transactionParams,
              })
            ).toString()
          );
        }),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gasPrice.value = price;
      gasLimit.value = limit;

      return {
        transactionParams,
        gasPrice: gasPrice.value,
        gasLimit: gasLimit.value,
      };
    },
    { cache: 1000 * 8 }
  );

  const commitTransaction = async () => {
    try {
      // const network = ref(getNetwork());
      error.value = undefined;

      status.value = "processing";
      if (!(network.value.chain?.id === getNetworkInfo().l1Network?.id)) {
        await onboardStore.setCorrectNetwork(getNetworkInfo().l1Network?.id);
      }
      const wallet = await onboardStore.getWallet(getNetworkInfo().l1Network?.id);
      const { transactionParams, gasLimit, gasPrice } = (await estimateFee())!;
      status.value = "waiting-for-signature";
      transactionHash.value = await wallet.writeContract({
        ...transactionParams,
        gasPrice: BigInt(gasPrice.toString()),
        gas: BigInt(gasLimit.toString()),
      });

      status.value = "sending";
      const receipt = await onboardStore.getPublicClient()!.waitForTransactionReceipt({
        hash: transactionHash.value!,
        onReplaced: (replacement) => {
          transactionHash.value = replacement.transaction.hash;
        },
      });

      status.value = "done";
      return receipt;
    } catch (err) {
      error.value = formatError(err as Error);
      status.value = "not-started";
    }
  };

  return {
    estimationError,
    estimationInProgress,
    totalFee,
    feeToken,
    estimateFee,

    status,
    error,
    transactionHash,
    commitTransaction,
  };
};
