import { computed, ref } from "vue";

import { BigNumber, ethers } from "ethers";
import { parseEther } from "ethers/lib/utils";
import useTimedCache from "@/composables/useTimedCache";

import type { Token, TokenAmount } from "@/types";
import type { PublicClient } from "@wagmi/core";
import type { BigNumberish } from "ethers";
import type { Ref } from "vue";
import type { L1Signer } from "@/zksync-web3-nova/src";

import { retry } from "@/utils/helpers";
import { calculateFee } from "@/utils/helpers";
import { useNetworkStore } from "@/store/network";
import { suggestMaxPriorityFee } from "@rainbow-me/fee-suggestions";
export type DepositFeeValues = {
  maxFeePerGas?: BigNumber;
  maxPriorityFeePerGas?: BigNumber;
  gasPrice?: BigNumber;
  baseCost?: BigNumber;
  l1GasLimit: BigNumber;
  l2GasLimit?: BigNumber;
};

export default (
  tokens: Ref<Token[]>,
  balances: Ref<TokenAmount[] | undefined>,
  getL1VoidSigner: () => L1Signer,
  getPublicClient: () => PublicClient
) => {
  let params = {
    to: undefined as string | undefined,
    tokenAddress: undefined as string | undefined,
  };
  const { selectedNetwork } = storeToRefs(useNetworkStore());
  const fee = ref<DepositFeeValues | undefined>();
  const recommendedBalance = ref<BigNumberish | undefined>();

  const totalFee = computed(() => {
    if (!fee.value) return undefined;
    // console.log(
    //   ethers.utils.formatEther( fee.value.l1GasLimit
    //   .mul(fee.value.maxFeePerGas??fee.value.gasPrice)
    //   .add(fee.value.baseCost || "0")
    //   ))
    // console.log("l1GasLimit",fee.value.l1GasLimit.toString())
    // console.log("maxFeePerGas", ethers.utils.formatUnits(fee.value.maxFeePerGas,"gwei"))
    // console.log("baseCost", ethers.utils.formatEther(fee.value.baseCost))
    if (fee.value.l1GasLimit && fee.value.maxFeePerGas && fee.value.maxPriorityFeePerGas) {
      return fee.value.l1GasLimit
        .mul(fee.value.maxFeePerGas)
        .add(fee.value.baseCost || "0")
        .toString();
    } else if (fee.value.l1GasLimit && fee.value.gasPrice) {
      return calculateFee(fee.value.l1GasLimit, fee.value.gasPrice).toString();
    }
    return undefined;
  });

  const feeToken = computed(() => {
    let res: Token | undefined = tokens.value.find((e) => e.address === ETH_TOKEN.l1Address);
    //TODO if network's gas token is not eth, we should config it here
    if (selectedNetwork.value.key === "mantle" && res && res.symbol) {
      res = {
        address: res.address,
        symbol: "MNT",
        decimals: res.decimals,
      };
    }
    return res;
  });
  const enoughBalanceToCoverFee = computed(() => {
    if (!feeToken.value || !balances.value || inProgress.value) {
      return true;
    }
    const feeTokenBalance = balances.value.find((e) => e.address === feeToken.value!.address);
    if (!feeTokenBalance) return true;
    if (totalFee.value && BigNumber.from(totalFee.value).gt(feeTokenBalance.amount)) {
      return false;
    }
    return true;
  });

  const getEthTransactionFee = async (signer: L1Signer) => {
    if (!signer) throw new Error("Signer is not available");

    return retry(async () => {
      try {
        return await signer.getFullRequiredDepositFee({
          token: ETH_TOKEN.l1Address!,
          to: params.to,
        });
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("Not enough balance for deposit.")) {
          const match = err.message.match(/([\d\\.]+) ETH/);
          if (feeToken.value && match?.length) {
            const ethAmount = match[1].split(" ")?.[0];
            recommendedBalance.value = parseEther(ethAmount);
            return;
          }
        }
        // zksync era
        if (err instanceof Error && err.message.indexOf("can't start a transaction from a non-account") > 0) {
          console.log("can't start a transaction from a non-account");
          return;
        }
        //manta
        if (err instanceof Error && err.message.indexOf("insufficient funds for intrinsic transaction cost") >= 0) {
          console.log("insufficient funds for intrinsic transaction cost");
          return;
        }

        throw err;
      }
    });
  };
  // const getERC20TransactionFee = async () => {
  //   const signer = getL1VoidSigner();
  //   return {
  //     l1GasLimit: await signer.getDepositEstimateGasForUseFee(),
  //   };
  // };
  const getGasPrice = async () => {
    return BigNumber.from(await retry(() => getPublicClient().getGasPrice()))
      .mul(110)
      .div(100);
  };
  const {
    inProgress,
    error,
    execute: executeEstimateFee,
    reset: resetEstimateFee,
  } = usePromise(
    async () => {
      recommendedBalance.value = undefined;
      if (!feeToken.value) throw new Error("Fee tokens is not available");
      const signer = getL1VoidSigner();
      fee.value = await getEthTransactionFee(signer);
      if (params.tokenAddress !== feeToken.value?.address && fee.value && fee.value.l1GasLimit) {
        // fee.value = await getERC20TransactionFee();
        // ERC20
        //TODO this is a temp fix for mantel network;
        fee.value.l1GasLimit = fee.value.l1GasLimit.mul(2);//maybe mul(3).div(2) is better
        if (selectedNetwork.value.key === "mantle") {
        } else {
        }
      }

      if (fee.value) {
        if (signer._providerL2().isLineaChain() && fee.value.maxFeePerGas && fee.value.maxPriorityFeePerGas) {
          const lineaFeeSuggest = await suggestMaxPriorityFee(signer._providerL1(), "latest");
          console.log("linea feesuggest", lineaFeeSuggest.maxPriorityFeeSuggestions);
          fee.value.maxPriorityFeePerGas = BigNumber.from(lineaFeeSuggest.maxPriorityFeeSuggestions.fast);
          fee.value.maxFeePerGas = fee.value.maxPriorityFeePerGas;
        }
      }
      /* It can be either maxFeePerGas or gasPrice */
      if (fee.value && !fee.value?.maxFeePerGas) {
        fee.value.gasPrice = await getGasPrice();
      }
    },
    { cache: false }
  );
  const cacheEstimateFee = useTimedCache<void, [typeof params]>(() => {
    resetEstimateFee();
    return executeEstimateFee();
  }, 1000 * 8);

  return {
    fee,
    result: totalFee,
    inProgress,
    error,
    recommendedBalance,
    estimateFee: async (to: string, tokenAddress: string) => {
      params = {
        to,
        tokenAddress,
      };
      await cacheEstimateFee(params);
    },
    resetFee: () => {
      fee.value = undefined;
    },

    feeToken,
    enoughBalanceToCoverFee,
  };
};
