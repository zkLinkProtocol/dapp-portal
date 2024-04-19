import useScreening from "@/composables/useScreening";

import type { DepositFeeValues } from "@/composables/zksync/deposit/useFee";
import type { L1Signer } from "@/zksync-web3-nova/src";
import type { BigNumberish } from "ethers";

import { useZkSyncWalletStore } from "@/store/zksync/wallet";
import { formatError } from "@/utils/formatters";
import { ETH_ADDRESS } from "@/zksync-web3-nova/src/utils";

export default (getL1Signer: () => Promise<L1Signer | undefined>) => {
  const status = ref<"not-started" | "processing" | "waiting-for-signature" | "done">("not-started");
  const wrapStatus = ref<"not-started" | "processing" | "waiting-for-signature" | "sending" | "done">("not-started");
  const error = ref<Error | undefined>();
  const ethTransactionHash = ref<string | undefined>();
  const eraWalletStore = useZkSyncWalletStore();

  const { validateAddress } = useScreening();

  const commitTransaction = async (
    transaction: {
      to: string;
      tokenAddress: string;
      amount: BigNumberish;
      toMerge?: boolean;
    },
    fee: DepositFeeValues
  ) => {
    try {
      error.value = undefined;

      status.value = "processing";
      const wallet = await getL1Signer();
      if (!wallet) throw new Error("Wallet is not available");

      await eraWalletStore.walletAddressValidate();
      await validateAddress(transaction.to);

      const overrides = {
        gasPrice: fee.gasPrice,
        gasLimit: fee.l1GasLimit,
        maxFeePerGas: fee.maxFeePerGas,
        maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
      };
      if (overrides.gasPrice && overrides.maxFeePerGas) {
        overrides.gasPrice = undefined;
      }

      status.value = "waiting-for-signature";
      const depositResponse = await wallet.deposit({
        to: transaction.to,
        token: transaction.tokenAddress,
        amount: transaction.amount,
        toMerge: transaction.toMerge,
        l2GasLimit: fee.l2GasLimit,
        overrides,
      });

      ethTransactionHash.value = depositResponse.hash;
      status.value = "done";
      return depositResponse;
    } catch (err) {
      error.value = formatError(err as Error);
      status.value = "not-started";
    }
  };

  const wrapTransaction = async (transaction: { to: string; tokenAddress: string; amount: BigNumberish }) => {
    try {
      error.value = undefined;

      wrapStatus.value = "processing";
      const wallet = await getL1Signer();
      if (!wallet) throw new Error("Wallet is not available");

      await eraWalletStore.walletAddressValidate();
      await validateAddress(transaction.to);

      wrapStatus.value = "waiting-for-signature";
      const cb = () => {
        wrapStatus.value = "sending";
      };

      if (wallet._providerL2().isMantleChain() && transaction.tokenAddress == ETH_ADDRESS) {
        await wallet.depositMNT(transaction.amount, cb);
      }
      const weths = await wallet._providerL2().getWETHContractAddress();
      if (weths.map((item) => item.toLowerCase()).includes(transaction.tokenAddress.toLowerCase())) {
        console.log("test isWETH");
        await wallet.unwrapWETH(transaction.tokenAddress, transaction.amount, cb);
      }
      wrapStatus.value = "done";
    } catch (err) {
      error.value = formatError(err as Error);
      wrapStatus.value = "not-started";
    }
  };

  return {
    wrapStatus,
    status,
    error,
    ethTransactionHash,
    commitTransaction,
    wrapTransaction,
  };
};
