/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemoize } from "@vueuse/core";
import { type BigNumberish } from "ethers";

import useScreening from "@/composables/useScreening";

import type { TokenAmount } from "@/types";
import type { Provider, Signer } from "@/zksync-web3-nova/src";

import { useOnboardStore } from "@/store/onboard";
import { useZkSyncWalletStore } from "@/store/zksync/wallet";
import { formatError } from "@/utils/formatters";
import { sleep } from "@/utils/helpers";

type TransactionParams = {
  type: "transfer" | "withdrawal";
  to: string;
  tokenAddress: string;
  amount: BigNumberish;
  isMergeToken?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const isWithdrawalManualFinalizationRequired = (token: TokenAmount, l1NetworkId: number) => {
  return true;
  //TODO force manual finalization
  // return token.address === ETH_TOKEN.address && BigNumber.from(token.amount).lt(parseEther("0.01"));
};

export default (getSigner: () => Promise<Signer | undefined>, getProvider: () => Provider) => {
  const status = ref<"not-started" | "processing" | "waiting-for-signature" | "done">("not-started");
  const error = ref<Error | undefined>();
  const transactionHash = ref<string | undefined>();
  const eraWalletStore = useZkSyncWalletStore();
  const onboardStore = useOnboardStore();
  const publicClient = onboardStore.getPublicClient(onboardStore.network.chainId);

  const retrieveBridgeAddresses = useMemoize(() => getProvider().getDefaultBridgeAddresses());
  const { validateAddress } = useScreening();

  const commitTransaction = async (
    transaction: TransactionParams,
    fee: { gasPrice: BigNumberish; gasLimit: BigNumberish }
  ) => {
    try {
      error.value = undefined;

      status.value = "processing";
      const signer = await getSigner();
      if (!signer) throw new Error("zkSync Signer is not available");

      const getRequiredBridgeAddress = async () => {
        if (transaction.tokenAddress === ETH_TOKEN.address) return undefined;
        const bridgeAddresses = await retrieveBridgeAddresses();
        return bridgeAddresses.erc20L2;
      };
      const bridgeAddress = transaction.type === "withdrawal" ? await getRequiredBridgeAddress() : undefined;

      await eraWalletStore.walletAddressValidate();
      await validateAddress(transaction.to);

      status.value = "waiting-for-signature";
      const tx = await signer[transaction.type === "transfer" ? "transfer" : "withdraw"]({
        to: transaction.to,
        token: transaction.tokenAddress === ETH_TOKEN.address ? ETH_TOKEN.l1Address! : transaction.tokenAddress,
        amount: transaction.amount,
        isMergeToken: transaction.isMergeToken,
        bridgeAddress,
        overrides: {
          gasPrice: fee.gasPrice,
          gasLimit: fee.gasLimit,
        },
      });

      transactionHash.value = tx.hash;
      await sleep(1500);
      await publicClient?.getTransactionReceipt({ hash: tx.hash as `0x${string}` });
      status.value = "done";

      return tx;
    } catch (err) {
      error.value = formatError(err as Error);
      status.value = "not-started";
    }
  };

  return {
    status,
    error,
    transactionHash,
    commitTransaction,
  };
};
