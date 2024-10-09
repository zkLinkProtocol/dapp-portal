import { suggestMaxPriorityFee } from "@rainbow-me/fee-suggestions";
import { BigNumber, ethers, utils } from "ethers";
import { Interface } from "ethers/lib/utils";

import { l1EthDepositAbi } from "./abi";
import {
  BOOTLOADER_FORMAL_ADDRESS,
  checkBaseCost,
  DEFAULT_GAS_PER_PUBDATA_LIMIT,
  estimateDefaultBridgeDepositL2Gas,
  ETH_ADDRESS,
  isETH,
  L1_MESSENGER_ADDRESS,
  layer1TxDefaults,
  REQUIRED_L1_TO_L2_GAS_PER_PUBDATA_LIMIT,
  scaleGasLimit,
  undoL1ToL2Alias,
  WMNT_CONTRACT,
} from "./utils";
import { zkSyncProvider } from "./zkSyncProvider"; //TODO the filename is not accurate
import { IERC20MetadataFactory, IL1BridgeFactory, IL2BridgeFactory, IZkSyncFactory } from "../typechain";
import { L1SharedBridge__factory } from "../typechain/BridgeHub";

import { abi as primaryGetterAbi } from "../abi/GettersFacet.json";
import WrappedMNTAbi from "../abi/WrappedMNT.json";
import WethAbi from "../abi/weth.json";

import type { Provider } from "./provider";
import type {
  Address,
  BalancesMap,
  BlockTag,
  Eip712Meta,
  FullDepositFee,
  PriorityOpResponse,
  TransactionRequest,
  TransactionResponse,
} from "./types";
import type { Fee } from "./zkSyncProvider";
import type { BigNumberish, BytesLike } from "ethers";
import type { Hash } from "~/types";
type Constructor<T = unknown> = new (...args: unknown[]) => T;

interface TxSender {
  sendTransaction(tx: ethers.providers.TransactionRequest): Promise<ethers.providers.TransactionResponse>;
  getAddress(): Promise<Address>;
}

export function AdapterL1<TBase extends Constructor<TxSender>>(Base: TBase) {
  return class Adapter extends Base {
    _providerL2(): Provider {
      throw new Error("Must be implemented by the derived class!");
    }
    _providerL1(): ethers.providers.Provider {
      throw new Error("Must be implemented by the derived class!");
    }
    _signerL1(): ethers.Signer {
      throw new Error("Must be implemented by the derived class!");
    }

    async getMainContract() {
      const contractAddress = await this._providerL2().getMainContractAddress();
      return IZkSyncFactory.connect(contractAddress, this._signerL1());
    }

    async getL1BridgeContracts() {
      const addresses = await this._providerL2().getDefaultBridgeAddresses();
      return {
        erc20: IL1BridgeFactory.connect(addresses.erc20L1!, this._signerL1()),
      };
    }

    //only support secondary chain
    async getTxGasPrice(): Promise<BigNumberish> {
      const contractAddress = await this._providerL2().getMainContractAddress();
      const result = await this._providerL1().call({
        to: contractAddress,
        data: "0x534ca054", //call txGasPrice returns uint256
      });
      return BigNumber.from(utils.hexValue(result));
    }

    //only support primary chain
    async getCanonicalTxHash(forwardHash: Hash): Promise<Hash | undefined> {
      const contractAddress = await this._providerL2().getMainContractAddress();
      const iface = new Interface(primaryGetterAbi);
      const tx: TransactionRequest = {
        to: contractAddress,
        data: iface.encodeFunctionData("getCanonicalTxHash", [forwardHash]),
      };
      const ctx = (await this._providerL1().call(tx)) as Hash;

      if (ctx == "0x0000000000000000000000000000000000000000000000000000000000000000") {
        return undefined;
      }
      return ctx;
    }

    async getBalanceL1(token?: Address, blockTag?: ethers.providers.BlockTag): Promise<BigNumber> {
      token ??= ETH_ADDRESS;
      if (isETH(token)) {
        return await this._providerL1().getBalance(await this.getAddress(), blockTag);
      } else {
        const erc20contract = IERC20MetadataFactory.connect(token, this._providerL1());
        return await erc20contract.balanceOf(await this.getAddress());
      }
    }

    async getAllowanceL1(
      token: Address,
      bridgeAddress?: Address,
      blockTag?: ethers.providers.BlockTag
    ): Promise<BigNumber> {
      const erc20contract = IERC20MetadataFactory.connect(token, this._providerL1());
      bridgeAddress ??= (await this.getL1BridgeContracts()).erc20.address;
      return await erc20contract.allowance(await this.getAddress(), bridgeAddress, { blockTag });
    }

    async l2TokenAddress(token: Address) {
      if (token == ETH_ADDRESS) {
        return ETH_ADDRESS;
      } else {
        const erc20Bridge = (await this.getL1BridgeContracts()).erc20;
        return await erc20Bridge.l2TokenAddress(token);
      }
    }

    async approveERC20(
      token: Address,
      amount: BigNumberish,
      overrides?: ethers.Overrides & { bridgeAddress?: Address }
    ): Promise<ethers.providers.TransactionResponse> {
      if (isETH(token)) {
        throw new Error("ETH token can't be approved. The address of the token does not exist on L1.");
      }

      let bridgeAddress = overrides?.bridgeAddress;
      const erc20contract = IERC20MetadataFactory.connect(token, this._signerL1());

      if (bridgeAddress == null) {
        bridgeAddress = (await this._providerL2().getDefaultBridgeAddresses()).erc20L1;
      } else {
        delete overrides!.bridgeAddress;
      }

      overrides ??= {};

      return await erc20contract.approve(bridgeAddress!, amount, overrides);
    }

    async getBaseCost(params: {
      gasLimit: BigNumberish;
      gasPerPubdataByte?: BigNumberish;
      gasPrice?: BigNumberish;
    }): Promise<BigNumber> {
      const zksyncContract = await this.getMainContract();
      const parameters = { ...layer1TxDefaults(), ...params };
      if (this._providerL2().isLineaChain()) {
        const lineaFeeSuggest = await suggestMaxPriorityFee(this._providerL1() as any, "latest");
        console.log("linea feesuggest", lineaFeeSuggest.maxPriorityFeeSuggestions);
        parameters.gasPrice = BigNumber.from(lineaFeeSuggest.maxPriorityFeeSuggestions.fast);
      } else {
        parameters.gasPrice ??= (await this._providerL1().getGasPrice()).mul(2);
      }
      parameters.gasPerPubdataByte ??= REQUIRED_L1_TO_L2_GAS_PER_PUBDATA_LIMIT;
      const gasPrice = this._providerL2().isPrimaryChain() ? parameters.gasPrice : await this.getTxGasPrice();

      return BigNumber.from(
        await zksyncContract.l2TransactionBaseCost(gasPrice, parameters.gasLimit, parameters.gasPerPubdataByte)
      );
    }

    async depositMNT(amount: BigNumberish, cb?: () => void) {
      const wmntContract = new ethers.Contract(WMNT_CONTRACT, WrappedMNTAbi, this._signerL1());
      const { hash } = await wmntContract.deposit({ value: amount });
      if (cb) {
        cb();
      }
      const res = await this._providerL1().waitForTransaction(hash);
      console.log("approve mnt res: ", res);
    }

    async unwrapWETH(token: Address, amount: BigNumberish, cb?: () => void) {
      const weths = await this._providerL2().getWETHContractAddress();
      if (!weths.map((item) => item.toLowerCase().includes(token.toLowerCase()))) {
        return;
      }
      const wethContract = new ethers.Contract(token, WethAbi, this._signerL1());
      const { hash } = await wethContract.withdraw(amount);
      if (cb) {
        cb();
      }
      await this._providerL1().waitForTransaction(hash);
    }

    async deposit(transaction: {
      token: Address;
      amount: BigNumberish;
      toMerge?: boolean;
      to?: Address;
      operatorTip?: BigNumberish;
      bridgeAddress?: Address;
      approveERC20?: boolean;
      l2GasLimit?: BigNumberish;
      gasPerPubdataByte?: BigNumberish;
      overrides?: ethers.PayableOverrides;
      approveOverrides?: ethers.Overrides;
    }): Promise<PriorityOpResponse> {
      const depositTx = await this.getDepositTx(transaction);

      if (transaction.token == ETH_ADDRESS) {
        depositTx.overrides ??= {};
        console.log("depositTx.overrides", depositTx.overrides);
        if (!depositTx.overrides.gasLimit) {
          const baseGasLimit = await this.estimateGasRequestExecute(depositTx);
          depositTx.overrides.gasLimit = scaleGasLimit(baseGasLimit);
        }
        return this.requestExecute(depositTx);
      } else {
        const bridgeContracts = await this.getL1BridgeContracts();
        if (transaction.approveERC20) {
          // We only request the allowance if the current one is not enough.
          const allowance = await this.getAllowanceL1(transaction.token);
          if (allowance.lt(transaction.amount)) {
            const approveTx = await this.approveERC20(transaction.token, transaction.amount, {
              bridgeAddress: transaction.bridgeAddress ?? bridgeContracts.erc20.address,
              ...transaction.approveOverrides,
            });
            await approveTx.wait();
          }
        }
        if (!depositTx.gasLimit) {
          const baseGasLimit = await this._providerL1().estimateGas(depositTx);
          const gasLimit = scaleGasLimit(baseGasLimit);
          depositTx.gasLimit = gasLimit;
        }

        if (this._providerL2().isZkSyncChain()) {
          const fee = await zkSyncProvider.attachEstimateFee()({
            from: depositTx.from,
            to: depositTx.to,
            value: depositTx.value?.toHexString() ?? "0x",
            data: depositTx.data,
          });
          console.log("zksync chain fee for ERC20", fee);

          depositTx.maxFeePerGas = fee.maxFeePerGas;
          depositTx.maxPriorityFeePerGas = fee.maxPriorityFeePerGas;
          depositTx.gasLimit = fee.gasLimit;
        }

        // if (this._providerL2().isLineaChain()) {
        //   const fee = await LineaProvider.attachEstimateFee()({
        //     from: depositTx.from,
        //     to: depositTx.to,
        //     value: depositTx.value?.toHexString() ?? "0x",
        //     data: depositTx.data,
        //   });
        //   console.log("linea fee for ERC20", fee);
        //   // TODO will use the gas price data from @rainbow-me/fee-suggestions
        //   depositTx.gasLimit = fee.gasLimit;
        // }

        return await this._providerL2().getPriorityOpResponse(await this._signerL1().sendTransaction(depositTx));
      }
    }

    // async estimateGasDeposit(transaction: {
    //   token: Address;
    //   amount: BigNumberish;
    //   to?: Address;
    //   operatorTip?: BigNumberish;
    //   bridgeAddress?: Address;
    //   l2GasLimit?: BigNumberish;
    //   gasPerPubdataByte?: BigNumberish;
    //   overrides?: ethers.PayableOverrides;
    // }): Promise<ethers.BigNumber> {
    //   const depositTx = await this.getDepositTx(transaction);

    //   let baseGasLimit: BigNumber;
    //   depositTx.from = await this.getAddress();
    //   if (transaction.token == ETH_ADDRESS) {
    //     baseGasLimit = await this.estimateGasRequestExecute(depositTx);
    //   } else {
    //     baseGasLimit = await this._providerL1().estimateGas(depositTx);
    //   }

    //   return scaleGasLimit(baseGasLimit);
    // }

    async getDepositEstimateGasForUseFee(l2GasLimit: BigNumber, baseCost: BigNumber): Promise<Fee> {
      const dummyAmount = 0; // must be 0, cause some secondary chain does not support deposit GAS Token, suck as Mantle
      const face = new Interface([l1EthDepositAbi]);
      const calldata = face.encodeFunctionData("requestL2Transaction", [
        await this.getAddress(),
        dummyAmount,
        "0x",
        l2GasLimit,
        REQUIRED_L1_TO_L2_GAS_PER_PUBDATA_LIMIT,
        [],
        await this.getAddress(),
      ]);
      const estimateTx = {
        from: await this.getAddress(),
        to: await this._providerL2().getMainContractAddress(),
        value: baseCost.add(dummyAmount),
        data: calldata,
      };
      if (this._providerL2().isZkSyncChain()) {
        const fee = await zkSyncProvider.attachEstimateFee()({
          ...estimateTx,
          value: estimateTx.value.toHexString(),
        });
        return fee;
      }
      // if (this._providerL2().isLineaChain()) {
      //   const fee = await LineaProvider.attachEstimateFee()({
      //     ...estimateTx,
      //     value: estimateTx.value.toHexString(),
      //   });
      //   return fee;
      // }

      const baseGasLimit: BigNumber = await this._providerL1().estimateGas(estimateTx);
      return {
        gasLimit: scaleGasLimit(baseGasLimit),
        gasPerPubdataLimit: BigNumber.from(0),
        maxPriorityFeePerGas: BigNumber.from(0),
        maxFeePerGas: BigNumber.from(0),
        L1Fee: await this.getL1FeeForOp(calldata), // only for mantle and manta
      };
    }

    async getDepositTx(transaction: {
      token: Address;
      amount: BigNumberish;
      toMerge?: boolean;
      to?: Address;
      operatorTip?: BigNumberish;
      bridgeAddress?: Address;
      l2GasLimit?: BigNumberish;
      gasPerPubdataByte?: BigNumberish;
      overrides?: ethers.PayableOverrides;
    }): Promise<unknown> {
      const bridgeContracts = await this.getL1BridgeContracts();
      if (transaction.bridgeAddress) {
        bridgeContracts.erc20.attach(transaction.bridgeAddress);
      }

      const { ...tx } = transaction;
      tx.to ??= await this.getAddress();
      tx.operatorTip ??= BigNumber.from(0);
      tx.overrides ??= {};
      tx.gasPerPubdataByte ??= REQUIRED_L1_TO_L2_GAS_PER_PUBDATA_LIMIT;
      tx.l2GasLimit = await estimateDefaultBridgeDepositL2Gas(
        this._providerL1(),
        this._providerL2(),
        tx.token,
        tx.amount,
        tx.to,
        await this.getAddress(),
        tx.gasPerPubdataByte,
        tx.toMerge
      );

      const { to, token, amount, operatorTip, overrides } = tx;

      if (!this._providerL2().isZkSyncChain()) {
        await insertGasPrice(this._providerL1(), this._providerL2(), overrides);
      }

      const gasPriceForEstimation = overrides.maxFeePerGas || overrides.gasPrice;

      const zksyncContract = await this.getMainContract();
      const gasPrice = this._providerL2().isPrimaryChain()
        ? BigNumber.from(await gasPriceForEstimation!).mul(2)
        : await this.getTxGasPrice();
      const baseCost = await zksyncContract.l2TransactionBaseCost(gasPrice, tx.l2GasLimit, tx.gasPerPubdataByte);

      if (token == ETH_ADDRESS) {
        overrides.value ??= baseCost.add(operatorTip).add(amount);

        return {
          contractAddress: to,
          calldata: "0x",
          l2Value: amount,
          // For some reason typescript can not deduce that we've already set the
          // tx.l2GasLimit
          l2GasLimit: tx.l2GasLimit!,
          ...tx,
        };
      } else {
        const args: [Address, Address, BigNumberish, BigNumberish, BigNumberish, Address] = [
          to,
          token,
          amount,
          tx.l2GasLimit,
          tx.gasPerPubdataByte,
          to,
        ];
        overrides.value ??= baseCost.add(operatorTip);
        await checkBaseCost(baseCost, overrides.value);

        return tx.toMerge
          ? await bridgeContracts.erc20.populateTransaction.depositToMerge(...args, overrides)
          : await bridgeContracts.erc20.populateTransaction.deposit(...args, overrides);
      }
    }

    // Retrieves the full needed ETH fee for the deposit.
    // Returns the L1 fee and the L2 fee.
    async getFullRequiredDepositFee(transaction: {
      token: Address;
      to?: Address;
      // bridgeAddress?: Address;
      // gasPerPubdataByte?: BigNumberish;
      overrides?: ethers.PayableOverrides;
    }): Promise<FullDepositFee> {
      // It is assumed that the L2 fee for the transaction does not depend on its value.

      const { ...tx } = transaction;
      // const zksyncContract = await this.getMainContract();

      tx.overrides ??= {};
      if (!this._providerL2().isZkSyncChain() && !this._providerL2().isLineaChain()) {
        await insertGasPrice(this._providerL1(), this._providerL2(), tx.overrides);
      }
      // const gasPriceForMessages = (await tx.overrides.maxFeePerGas) || (await tx.overrides.gasPrice);

      // tx.to ??= await this.getAddress();
      // tx.gasPerPubdataByte ??= REQUIRED_L1_TO_L2_GAS_PER_PUBDATA_LIMIT;

      // const l2GasLimit = await estimateDefaultBridgeDepositL2Gas(
      //   this._providerL1(),
      //   this._providerL2(),
      //   tx.token,
      //   dummyAmount,
      //   tx.to,
      //   await this.getAddress(),
      //   tx.gasPerPubdataByte
      // );
      // const gasPrice = this._providerL2().isPrimaryChain() ? gasPriceForMessages! : await this.getTxGasPrice();
      // const baseCost = await zksyncContract.l2TransactionBaseCost(gasPrice, l2GasLimit, tx.gasPerPubdataByte);

      // const selfBalanceETH = await this.getBalanceL1();

      // // We could 0 in, because the final fee will anyway be bigger than
      // if (baseCost.gte(selfBalanceETH.add(dummyAmount))) {
      //   // const recommendedETHBalance = (await this.getDepositEstimateGasForUseFee())
      //   //   .mul(gasPriceForMessages!)
      //   //   .add(baseCost);
      //   // const formattedRecommendedBalance = ethers.utils.formatEther(recommendedETHBalance);
      //   throw new Error(
      //     // `Not enough balance for deposit. Under the provided gas price, the recommended balance to perform a deposit is ${formattedRecommendedBalance} ETH`
      //     `Not enough balance for deposit`
      //   );
      // }
      const l2GasLimit = await this._providerL2().estimateL1ToL2Execute({
        contractAddress: await this.getAddress(),
        gasPerPubdataByte: REQUIRED_L1_TO_L2_GAS_PER_PUBDATA_LIMIT,
        caller: await this.getAddress(),
        calldata: "0x",
        l2Value: 0,
      });

      const baseCost = await this.getBaseCost({
        gasLimit: l2GasLimit,
        gasPerPubdataByte: REQUIRED_L1_TO_L2_GAS_PER_PUBDATA_LIMIT,
      });
      const selfBalanceETH = await this.getBalanceL1();
      if (baseCost.gte(selfBalanceETH)) {
        throw new Error(`Not enough balance for deposit`);
      }
      // For ETH token the value that the user passes to the estimation is the one which has the
      // value for the L2 comission substracted.
      // let amountForEstimate: BigNumber;
      if (!isETH(tx.token)) {
        // amountForEstimate = BigNumber.from(dummyAmount);
        // } else {
        // amountForEstimate = BigNumber.from(dummyAmount);

        if ((await this.getAllowanceL1(tx.token)) < BigNumber.from(1)) {
          throw new Error("Not enough allowance to cover the deposit");
        }
      }

      // Deleting the explicit gas limits in the fee estimation
      // in order to prevent the situation where the transaction
      // fails because the user does not have enough balance
      const estimationOverrides = { ...tx.overrides };
      delete estimationOverrides.gasPrice;
      delete estimationOverrides.maxFeePerGas;
      delete estimationOverrides.maxPriorityFeePerGas;

      let l1GasLimit,
        extraCost = BigNumber.from(0);

      if (this._providerL2().isEthereumChain()) {
        if (isETH(tx.token)) {
          l1GasLimit = BigNumber.from(180000);
        } else {
          /**
           * // from useFee.ts
           * if (params.tokenAddress !== feeToken.value?.address && fee.value && fee.value.l1GasLimit) {
                // fee.value = await getERC20TransactionFee();
                fee.value.l1GasLimit = fee.value.l1GasLimit.mul(3).div(2);
              }
           */
          l1GasLimit = BigNumber.from(300000); //TODO never access here
        }
      } else {
        // l1GasLimit = await this.estimateGasDeposit({
        //   ...tx,
        //   amount: amountForEstimate,
        //   overrides: estimationOverrides,
        //   l2GasLimit,
        // });
        const fee = await this.getDepositEstimateGasForUseFee(l2GasLimit, baseCost);
        extraCost = fee.L1Fee;
        l1GasLimit = fee.gasLimit;
        if (this._providerL2().isZkSyncChain() || this._providerL2().isLineaChain()) {
          tx.overrides.maxFeePerGas = fee.maxFeePerGas; //if Linea, will be rewrite by @rainbow-me/fee-suggestions in useFee.ts
          tx.overrides.maxPriorityFeePerGas = fee.maxPriorityFeePerGas; // if Linea, will be rewrite by @rainbow-me/fee-suggestions in useFee.ts
          tx.overrides.gasLimit = fee.gasLimit;
        }
      }

      const fullCost: FullDepositFee = {
        baseCost,
        l1GasLimit,
        l2GasLimit,
        extraCost, // only for manta and mantle
      };
      console.log("tx.overrides", tx.overrides.maxFeePerGas?.toString(), tx.overrides.gasLimit?.toString());
      if (tx.overrides.gasPrice) {
        fullCost.gasPrice = BigNumber.from(await tx.overrides.gasPrice);
      } else {
        fullCost.maxFeePerGas = BigNumber.from(await tx.overrides.maxFeePerGas);
        fullCost.maxPriorityFeePerGas = BigNumber.from(await tx.overrides.maxPriorityFeePerGas);
      }

      return fullCost;
    }

    async _getWithdrawalLog(withdrawalHash: BytesLike, index = 0) {
      const hash = ethers.utils.hexlify(withdrawalHash);
      const receipt = await this._providerL2().getTransactionReceipt(hash);
      const log = receipt.logs.filter(
        (log) =>
          log.address == L1_MESSENGER_ADDRESS &&
          log.topics[0] == ethers.utils.id("L1MessageSent(address,bytes32,bytes)")
      )[index];

      return {
        log,
        l1BatchTxId: receipt.l1BatchTxIndex,
      };
    }

    //for mantle and manta
    async getL1FeeForOp(calldata: string): Promise<BigNumber> {
      if (
        !this._providerL2().isMantleChain() &&
        !this._providerL2().isMantaChain() &&
        !this._providerL2().isBlastChain()
      ) {
        return BigNumber.from(0);
      }
      const abi = [
        {
          type: "function",
          stateMutability: "view",
          outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
          name: "getL1Fee",
          inputs: [{ type: "bytes", name: "_data", internalType: "bytes" }],
        },
      ];
      const contract = new ethers.Contract("0x420000000000000000000000000000000000000F", abi, this._providerL1());
      const l1Fee = await contract.getL1Fee(calldata);
      return BigNumber.from(l1Fee);
    }

    async _getWithdrawalL2ToL1Log(withdrawalHash: BytesLike, index = 0) {
      const hash = ethers.utils.hexlify(withdrawalHash);
      const receipt = await this._providerL2().getTransactionReceipt(hash);
      const messages = Array.from(receipt.l2ToL1Logs.entries()).filter(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([_, log]) => log.sender == L1_MESSENGER_ADDRESS
      );
      const [l2ToL1LogIndex, l2ToL1Log] = messages[index];

      return {
        l2ToL1LogIndex,
        l2ToL1Log,
      };
    }

    async finalizeWithdrawalParams(withdrawalHash: BytesLike, index = 0) {
      const { log, l1BatchTxId } = await this._getWithdrawalLog(withdrawalHash, index);
      const { l2ToL1LogIndex } = await this._getWithdrawalL2ToL1Log(withdrawalHash, index);
      const sender = ethers.utils.hexDataSlice(log.topics[1], 12);
      const proof = await this._providerL2().getLogProof(withdrawalHash, l2ToL1LogIndex);
      const message = ethers.utils.defaultAbiCoder.decode(["bytes"], log.data)[0];
      return {
        l1BatchNumber: log.l1BatchNumber,
        l2MessageIndex: proof!.id,
        l2TxNumberInBlock: l1BatchTxId,
        message,
        sender,
        proof: proof!.proof,
      };
    }

    async finalizeWithdrawal(withdrawalHash: BytesLike, index = 0, overrides?: ethers.Overrides) {
      const { l1BatchNumber, l2MessageIndex, l2TxNumberInBlock, message, sender, proof } =
        await this.finalizeWithdrawalParams(withdrawalHash, index);

      if (isETH(sender)) {
        const contractAddress = await this._providerL2().getMainContractAddress();
        const zksync = IZkSyncFactory.connect(contractAddress, this._signerL1());

        return await zksync.finalizeEthWithdrawal(
          l1BatchNumber,
          l2MessageIndex,
          l2TxNumberInBlock,
          message,
          proof,
          overrides ?? {}
        );
      }

      const l2Bridge = IL2BridgeFactory.connect(sender, this._providerL2());
      const l1Bridge = IL1BridgeFactory.connect(await l2Bridge.l1Bridge(), this._signerL1());
      return await l1Bridge.finalizeWithdrawal(
        l1BatchNumber,
        l2MessageIndex,
        l2TxNumberInBlock,
        message,
        proof,
        overrides ?? {}
      );
    }

    async isWithdrawalFinalized(withdrawalHash: BytesLike, index = 0) {
      const { log } = await this._getWithdrawalLog(withdrawalHash, index);
      const { l2ToL1LogIndex } = await this._getWithdrawalL2ToL1Log(withdrawalHash, index);
      const sender = ethers.utils.hexDataSlice(log.topics[1], 12);
      // `getLogProof` is called not to get proof but
      // to get the index of the corresponding L2->L1 log,
      // which is returned as `proof.id`.
      const proof = await this._providerL2().getLogProof(withdrawalHash, l2ToL1LogIndex);

      const bridgeHubUpgradeBatch = process.env.NODE_TYPE === "nexus" ? 100000 : 16888; //TODO: update batch for mainnet
      const HubContract = process.env.NODE_TYPE === "nexus" ? "" : "0x0A001c26192C54f7EdaA031ab9063d274519f19d";
      if (log.l1BatchNumber > bridgeHubUpgradeBatch && this._providerL2().isPrimaryChain() && HubContract) {
        const hub = L1SharedBridge__factory.connect(HubContract, this._signerL1());

        return await hub.isWithdrawalFinalized(this._providerL2().network.chainId, log.l1BatchNumber, proof!.id);
      }

      if (isETH(sender)) {
        const contractAddress = await this._providerL2().getMainContractAddress();
        const zksync = IZkSyncFactory.connect(contractAddress, this._signerL1());

        return await zksync.isEthWithdrawalFinalized(log.l1BatchNumber, proof!.id);
      }

      const l2Bridge = IL2BridgeFactory.connect(sender, this._providerL2());
      const l1Bridge = IL1BridgeFactory.connect(await l2Bridge.l1Bridge(), this._providerL1());

      return await l1Bridge.isWithdrawalFinalized(log.l1BatchNumber, proof!.id);
    }

    async claimFailedDeposit(depositHash: BytesLike, overrides?: ethers.Overrides) {
      const receipt = await this._providerL2().getTransactionReceipt(ethers.utils.hexlify(depositHash));
      const successL2ToL1LogIndex = receipt.l2ToL1Logs.findIndex(
        (l2ToL1log) => l2ToL1log.sender == BOOTLOADER_FORMAL_ADDRESS && l2ToL1log.key == depositHash
      );
      const successL2ToL1Log = receipt.l2ToL1Logs[successL2ToL1LogIndex];
      if (successL2ToL1Log.value != ethers.constants.HashZero) {
        throw new Error("Cannot claim successful deposit");
      }

      const tx = await this._providerL2().getTransaction(ethers.utils.hexlify(depositHash));

      // Undo the aliasing, since the Mailbox contract set it as for contract address.
      const l1BridgeAddress = undoL1ToL2Alias(receipt.from);
      const l2BridgeAddress = receipt.to;

      const l1Bridge = IL1BridgeFactory.connect(l1BridgeAddress, this._signerL1());
      const l2Bridge = IL2BridgeFactory.connect(l2BridgeAddress, this._providerL2());

      const calldata = l2Bridge.interface.decodeFunctionData("finalizeDeposit", tx.data);

      const proof = await this._providerL2().getLogProof(depositHash, successL2ToL1LogIndex);
      return await l1Bridge.claimFailedDeposit(
        calldata["_l1Sender"],
        calldata["_l1Token"],
        depositHash,
        receipt.l1BatchNumber,
        proof!.id,
        receipt.l1BatchTxIndex,
        proof!.proof,
        overrides ?? {}
      );
    }

    //only for eth
    async requestExecute(transaction: {
      contractAddress: Address;
      calldata: BytesLike;
      l2GasLimit?: BigNumberish;
      l2Value?: BigNumberish;
      factoryDeps?: ethers.BytesLike[];
      operatorTip?: BigNumberish;
      gasPerPubdataByte?: BigNumberish;
      refundRecipient?: Address;
      overrides?: ethers.PayableOverrides;
    }): Promise<PriorityOpResponse> {
      const requestExecuteTx = await this.getRequestExecuteTx(transaction);

      if (this._providerL2().isZkSyncChain()) {
        const fee = await zkSyncProvider.attachEstimateFee()({
          from: requestExecuteTx.from,
          to: requestExecuteTx.to,
          value: requestExecuteTx.value?.toHexString() ?? "0x",
          data: requestExecuteTx.data,
        });
        console.log("zksync chain fee", fee);

        requestExecuteTx.maxFeePerGas = fee.maxFeePerGas;
        requestExecuteTx.maxPriorityFeePerGas = fee.maxPriorityFeePerGas;
        requestExecuteTx.gasLimit = fee.gasLimit;
      }

      // if (this._providerL2().isLineaChain()) {
      //   const fee = await LineaProvider.attachEstimateFee()({
      //     from: requestExecuteTx.from,
      //     to: requestExecuteTx.to,
      //     value: requestExecuteTx.value?.toHexString() ?? "0x",
      //     data: requestExecuteTx.data,
      //   });
      //   console.log("linea fee", fee);
      //   // TODO will use the gas price data from @rainbow-me/fee-suggestions
      //   requestExecuteTx.gasLimit = fee.gasLimit;
      // }

      return this._providerL2().getPriorityOpResponse(await this._signerL1().sendTransaction(requestExecuteTx));
    }

    async estimateGasRequestExecute(transaction: {
      contractAddress: Address;
      calldata: BytesLike;
      l2GasLimit?: BigNumberish;
      l2Value?: BigNumberish;
      factoryDeps?: ethers.BytesLike[];
      operatorTip?: BigNumberish;
      gasPerPubdataByte?: BigNumberish;
      refundRecipient?: Address;
      overrides?: ethers.PayableOverrides;
    }): Promise<ethers.BigNumber> {
      const requestExecuteTx = await this.getRequestExecuteTx(transaction);

      delete requestExecuteTx.gasPrice;
      delete requestExecuteTx.maxFeePerGas;
      delete requestExecuteTx.maxPriorityFeePerGas;

      return this._providerL1().estimateGas(requestExecuteTx);
    }

    async getRequestExecuteTx(transaction: {
      contractAddress: Address;
      calldata: BytesLike;
      l2GasLimit?: BigNumberish;
      l2Value?: BigNumberish;
      factoryDeps?: ethers.BytesLike[];
      operatorTip?: BigNumberish;
      gasPerPubdataByte?: BigNumberish;
      refundRecipient?: Address;
      overrides?: ethers.PayableOverrides;
    }): Promise<ethers.PopulatedTransaction> {
      const zksyncContract = await this.getMainContract();

      const { ...tx } = transaction;
      tx.l2Value ??= BigNumber.from(0);
      tx.operatorTip ??= BigNumber.from(0);
      tx.factoryDeps ??= [];
      tx.overrides ??= {};
      tx.gasPerPubdataByte ??= REQUIRED_L1_TO_L2_GAS_PER_PUBDATA_LIMIT;
      tx.refundRecipient ??= await this.getAddress();
      tx.l2GasLimit ??= await this._providerL2().estimateL1ToL2Execute(transaction);

      const {
        contractAddress,
        l2Value,
        calldata,
        l2GasLimit,
        factoryDeps,
        operatorTip,
        overrides,
        gasPerPubdataByte,
        refundRecipient,
      } = tx;

      if (!this._providerL2().isZkSyncChain()) {
        await insertGasPrice(this._providerL1(), this._providerL2(), overrides);
      }
      const gasPriceForEstimation = overrides.maxFeePerGas || overrides.gasPrice;

      const baseCost = await this.getBaseCost({
        gasPrice: await gasPriceForEstimation,
        gasPerPubdataByte,
        gasLimit: l2GasLimit,
      });

      overrides.value ??= baseCost.add(operatorTip).add(l2Value);

      await checkBaseCost(baseCost, overrides.value);

      return await zksyncContract.populateTransaction.requestL2Transaction(
        contractAddress,
        l2Value,
        calldata,
        l2GasLimit,
        REQUIRED_L1_TO_L2_GAS_PER_PUBDATA_LIMIT,
        factoryDeps,
        refundRecipient,
        overrides
      );
    }
  };
}

export function AdapterL2<TBase extends Constructor<TxSender>>(Base: TBase) {
  return class Adapter extends Base {
    _providerL2(): Provider {
      throw new Error("Must be implemented by the derived class!");
    }
    _signerL2(): ethers.Signer {
      throw new Error("Must be implemented by the derived class!");
    }

    async getBalance(token?: Address, blockTag: BlockTag = "committed") {
      return await this._providerL2().getBalance(await this.getAddress(), blockTag, token);
    }

    async getAllBalances(): Promise<BalancesMap> {
      return await this._providerL2().getAllAccountBalances(await this.getAddress());
    }

    async getL2BridgeContracts() {
      const addresses = await this._providerL2().getDefaultBridgeAddresses();
      return {
        erc20: IL2BridgeFactory.connect(addresses.erc20L2!, this._signerL2()),
      };
    }

    _fillCustomData(data: Eip712Meta): Eip712Meta {
      const customData = { ...data };
      customData.gasPerPubdata ??= DEFAULT_GAS_PER_PUBDATA_LIMIT;
      customData.factoryDeps ??= [];
      return customData;
    }

    async withdraw(transaction: {
      token: Address;
      amount: BigNumberish;
      isMergeToken?: boolean;
      to?: Address;
      bridgeAddress?: Address;
      overrides?: ethers.Overrides;
    }): Promise<TransactionResponse> {
      const withdrawTx = await this._providerL2().getWithdrawTx({
        from: await this.getAddress(),
        ...transaction,
      });
      const txResponse = await this.sendTransaction(withdrawTx);
      return this._providerL2()._wrapTransaction(txResponse);
    }

    async transfer(transaction: {
      to: Address;
      amount: BigNumberish;
      token?: Address;
      overrides?: ethers.Overrides;
    }): Promise<TransactionResponse> {
      const transferTx = await this._providerL2().getTransferTx({
        from: await this.getAddress(),
        ...transaction,
      });
      const txResponse = await this.sendTransaction(transferTx);
      return this._providerL2()._wrapTransaction(txResponse);
    }
  };
}

/// @dev This method checks if the overrides contain a gasPrice (or maxFeePerGas), if not it will insert
/// the maxFeePerGas
async function insertGasPrice(
  l1Provider: ethers.providers.Provider,
  l2Provider: Provider,
  overrides: ethers.PayableOverrides
) {
  if (!overrides.gasPrice && !overrides.maxFeePerGas) {
    if (
      l2Provider.isArbitrumChain() ||
      l2Provider.isMantaChain() ||
      l2Provider.isMantleChain() ||
      l2Provider.isBlastChain()
    ) {
      //if arbitrum
      console.log("arbitrum chain");
      console.log("manta chain, mantle chain, arbitrum chain, only support gasPrice");
      overrides.gasPrice = await l1Provider.getGasPrice();
      return;
    }

    if (l2Provider.isZkSyncChain() || l2Provider.isLineaChain()) {
      throw new Error("not support zkSync Era and Linea");
    }

    //only for Ethereum

    const l1FeeData = await l1Provider.getFeeData();

    // Sometimes baseFeePerGas is not available, so we use gasPrice instead.
    const baseFee = l1FeeData.lastBaseFeePerGas || l1FeeData.gasPrice;

    if (l1FeeData.maxFeePerGas && l1FeeData.maxPriorityFeePerGas) {
      // ethers.js by default uses multiplcation by 2, but since the price for the L2 part
      // will depend on the L1 part, doubling base fee is typically too much.
      const maxFeePerGas = baseFee!.add(l1FeeData.maxPriorityFeePerGas || 0);
      // const maxFeePerGas = baseFee!.mul(3).div(2).add(l1FeeData.maxPriorityFeePerGas!);

      overrides.maxFeePerGas = maxFeePerGas;
      overrides.maxPriorityFeePerGas = l1FeeData.maxPriorityFeePerGas!;
    } else {
      overrides.gasPrice = baseFee!;
    }
  }
}
