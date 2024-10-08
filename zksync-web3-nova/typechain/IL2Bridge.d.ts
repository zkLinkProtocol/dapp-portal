/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { ethers, EventFilter, Signer, BigNumber, BigNumberish, PopulatedTransaction } from "ethers";
import { Contract, ContractTransaction, Overrides, PayableOverrides, CallOverrides } from "@ethersproject/contracts";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";

interface L2ERC20BridgeInterface extends ethers.utils.Interface {
  functions: {
    "MERGE_TOKEN_PORTAL()": FunctionFragment;
    "depositToMerge(address,uint256,address)": FunctionFragment;
    "finalizeDeposit(address,address,address,uint256,bytes)": FunctionFragment;
    "finalizeDepositToMerge(address,address,address,uint256,bytes)": FunctionFragment;
    "initialize(address,bytes32,address)": FunctionFragment;
    "l1Bridge()": FunctionFragment;
    "l1TokenAddress(address)": FunctionFragment;
    "l2TokenAddress(address)": FunctionFragment;
    "l2TokenBeacon()": FunctionFragment;
    "withdraw(address,address,uint256)": FunctionFragment;
    "withdrawFromMerge(address,address,uint256)": FunctionFragment;
  };

  encodeFunctionData(functionFragment: "MERGE_TOKEN_PORTAL", values?: undefined): string;
  encodeFunctionData(functionFragment: "depositToMerge", values: [string, BigNumberish, string]): string;
  encodeFunctionData(
    functionFragment: "finalizeDeposit",
    values: [string, string, string, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "finalizeDepositToMerge",
    values: [string, string, string, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "initialize", values: [string, BytesLike, string]): string;
  encodeFunctionData(functionFragment: "l1Bridge", values?: undefined): string;
  encodeFunctionData(functionFragment: "l1TokenAddress", values: [string]): string;
  encodeFunctionData(functionFragment: "l2TokenAddress", values: [string]): string;
  encodeFunctionData(functionFragment: "l2TokenBeacon", values?: undefined): string;
  encodeFunctionData(functionFragment: "withdraw", values: [string, string, BigNumberish]): string;
  encodeFunctionData(functionFragment: "withdrawFromMerge", values: [string, string, BigNumberish]): string;

  decodeFunctionResult(functionFragment: "MERGE_TOKEN_PORTAL", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "depositToMerge", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "finalizeDeposit", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "finalizeDepositToMerge", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "initialize", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "l1Bridge", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "l1TokenAddress", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "l2TokenAddress", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "l2TokenBeacon", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "withdraw", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "withdrawFromMerge", data: BytesLike): Result;

  events: {
    "FinalizeDeposit(address,address,address,uint256)": EventFragment;
    "FinalizeDepositToMerge(address,address,address,address,uint256)": EventFragment;
    "Initialized(uint8)": EventFragment;
    "WithdrawalInitiated(address,address,address,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "FinalizeDeposit"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "FinalizeDepositToMerge"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Initialized"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "WithdrawalInitiated"): EventFragment;
}

export class L2ERC20Bridge extends Contract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  on(event: EventFilter | string, listener: Listener): this;
  once(event: EventFilter | string, listener: Listener): this;
  addListener(eventName: EventFilter | string, listener: Listener): this;
  removeAllListeners(eventName: EventFilter | string): this;
  removeListener(eventName: any, listener: Listener): this;

  interface: L2ERC20BridgeInterface;

  functions: {
    MERGE_TOKEN_PORTAL(overrides?: CallOverrides): Promise<{
      0: string;
    }>;

    "MERGE_TOKEN_PORTAL()"(overrides?: CallOverrides): Promise<{
      0: string;
    }>;

    depositToMerge(
      _l2Token: string,
      _amount: BigNumberish,
      _l2Receiver: string,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "depositToMerge(address,uint256,address)"(
      _l2Token: string,
      _amount: BigNumberish,
      _l2Receiver: string,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    finalizeDeposit(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: PayableOverrides
    ): Promise<ContractTransaction>;

    "finalizeDeposit(address,address,address,uint256,bytes)"(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: PayableOverrides
    ): Promise<ContractTransaction>;

    finalizeDepositToMerge(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: PayableOverrides
    ): Promise<ContractTransaction>;

    "finalizeDepositToMerge(address,address,address,uint256,bytes)"(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: PayableOverrides
    ): Promise<ContractTransaction>;

    initialize(
      _l1Bridge: string,
      _l2TokenProxyBytecodeHash: BytesLike,
      _governor: string,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "initialize(address,bytes32,address)"(
      _l1Bridge: string,
      _l2TokenProxyBytecodeHash: BytesLike,
      _governor: string,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    l1Bridge(overrides?: CallOverrides): Promise<{
      0: string;
    }>;

    "l1Bridge()"(overrides?: CallOverrides): Promise<{
      0: string;
    }>;

    l1TokenAddress(
      l2TokenAddress: string,
      overrides?: CallOverrides
    ): Promise<{
      l1TokenAddress: string;
      0: string;
    }>;

    "l1TokenAddress(address)"(
      l2TokenAddress: string,
      overrides?: CallOverrides
    ): Promise<{
      l1TokenAddress: string;
      0: string;
    }>;

    l2TokenAddress(
      _l1Token: string,
      overrides?: CallOverrides
    ): Promise<{
      0: string;
    }>;

    "l2TokenAddress(address)"(
      _l1Token: string,
      overrides?: CallOverrides
    ): Promise<{
      0: string;
    }>;

    l2TokenBeacon(overrides?: CallOverrides): Promise<{
      0: string;
    }>;

    "l2TokenBeacon()"(overrides?: CallOverrides): Promise<{
      0: string;
    }>;

    withdraw(
      _l1Receiver: string,
      _l2Token: string,
      _amount: BigNumberish,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "withdraw(address,address,uint256)"(
      _l1Receiver: string,
      _l2Token: string,
      _amount: BigNumberish,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    withdrawFromMerge(
      _l1Receiver: string,
      _l2Token: string,
      _amount: BigNumberish,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "withdrawFromMerge(address,address,uint256)"(
      _l1Receiver: string,
      _l2Token: string,
      _amount: BigNumberish,
      overrides?: Overrides
    ): Promise<ContractTransaction>;
  };

  MERGE_TOKEN_PORTAL(overrides?: CallOverrides): Promise<string>;

  "MERGE_TOKEN_PORTAL()"(overrides?: CallOverrides): Promise<string>;

  depositToMerge(
    _l2Token: string,
    _amount: BigNumberish,
    _l2Receiver: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "depositToMerge(address,uint256,address)"(
    _l2Token: string,
    _amount: BigNumberish,
    _l2Receiver: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  finalizeDeposit(
    _l1Sender: string,
    _l2Receiver: string,
    _l1Token: string,
    _amount: BigNumberish,
    _data: BytesLike,
    overrides?: PayableOverrides
  ): Promise<ContractTransaction>;

  "finalizeDeposit(address,address,address,uint256,bytes)"(
    _l1Sender: string,
    _l2Receiver: string,
    _l1Token: string,
    _amount: BigNumberish,
    _data: BytesLike,
    overrides?: PayableOverrides
  ): Promise<ContractTransaction>;

  finalizeDepositToMerge(
    _l1Sender: string,
    _l2Receiver: string,
    _l1Token: string,
    _amount: BigNumberish,
    _data: BytesLike,
    overrides?: PayableOverrides
  ): Promise<ContractTransaction>;

  "finalizeDepositToMerge(address,address,address,uint256,bytes)"(
    _l1Sender: string,
    _l2Receiver: string,
    _l1Token: string,
    _amount: BigNumberish,
    _data: BytesLike,
    overrides?: PayableOverrides
  ): Promise<ContractTransaction>;

  initialize(
    _l1Bridge: string,
    _l2TokenProxyBytecodeHash: BytesLike,
    _governor: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "initialize(address,bytes32,address)"(
    _l1Bridge: string,
    _l2TokenProxyBytecodeHash: BytesLike,
    _governor: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  l1Bridge(overrides?: CallOverrides): Promise<string>;

  "l1Bridge()"(overrides?: CallOverrides): Promise<string>;

  l1TokenAddress(l2TokenAddress: string, overrides?: CallOverrides): Promise<string>;

  "l1TokenAddress(address)"(l2TokenAddress: string, overrides?: CallOverrides): Promise<string>;

  l2TokenAddress(_l1Token: string, overrides?: CallOverrides): Promise<string>;

  "l2TokenAddress(address)"(_l1Token: string, overrides?: CallOverrides): Promise<string>;

  l2TokenBeacon(overrides?: CallOverrides): Promise<string>;

  "l2TokenBeacon()"(overrides?: CallOverrides): Promise<string>;

  withdraw(
    _l1Receiver: string,
    _l2Token: string,
    _amount: BigNumberish,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "withdraw(address,address,uint256)"(
    _l1Receiver: string,
    _l2Token: string,
    _amount: BigNumberish,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  withdrawFromMerge(
    _l1Receiver: string,
    _l2Token: string,
    _amount: BigNumberish,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "withdrawFromMerge(address,address,uint256)"(
    _l1Receiver: string,
    _l2Token: string,
    _amount: BigNumberish,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  callStatic: {
    MERGE_TOKEN_PORTAL(overrides?: CallOverrides): Promise<string>;

    "MERGE_TOKEN_PORTAL()"(overrides?: CallOverrides): Promise<string>;

    depositToMerge(
      _l2Token: string,
      _amount: BigNumberish,
      _l2Receiver: string,
      overrides?: CallOverrides
    ): Promise<void>;

    "depositToMerge(address,uint256,address)"(
      _l2Token: string,
      _amount: BigNumberish,
      _l2Receiver: string,
      overrides?: CallOverrides
    ): Promise<void>;

    finalizeDeposit(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    "finalizeDeposit(address,address,address,uint256,bytes)"(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    finalizeDepositToMerge(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    "finalizeDepositToMerge(address,address,address,uint256,bytes)"(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    initialize(
      _l1Bridge: string,
      _l2TokenProxyBytecodeHash: BytesLike,
      _governor: string,
      overrides?: CallOverrides
    ): Promise<void>;

    "initialize(address,bytes32,address)"(
      _l1Bridge: string,
      _l2TokenProxyBytecodeHash: BytesLike,
      _governor: string,
      overrides?: CallOverrides
    ): Promise<void>;

    l1Bridge(overrides?: CallOverrides): Promise<string>;

    "l1Bridge()"(overrides?: CallOverrides): Promise<string>;

    l1TokenAddress(l2TokenAddress: string, overrides?: CallOverrides): Promise<string>;

    "l1TokenAddress(address)"(l2TokenAddress: string, overrides?: CallOverrides): Promise<string>;

    l2TokenAddress(_l1Token: string, overrides?: CallOverrides): Promise<string>;

    "l2TokenAddress(address)"(_l1Token: string, overrides?: CallOverrides): Promise<string>;

    l2TokenBeacon(overrides?: CallOverrides): Promise<string>;

    "l2TokenBeacon()"(overrides?: CallOverrides): Promise<string>;

    withdraw(_l1Receiver: string, _l2Token: string, _amount: BigNumberish, overrides?: CallOverrides): Promise<void>;

    "withdraw(address,address,uint256)"(
      _l1Receiver: string,
      _l2Token: string,
      _amount: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    withdrawFromMerge(
      _l1Receiver: string,
      _l2Token: string,
      _amount: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    "withdrawFromMerge(address,address,uint256)"(
      _l1Receiver: string,
      _l2Token: string,
      _amount: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    FinalizeDeposit(
      l1Sender: string | null,
      l2Receiver: string | null,
      l2Token: string | null,
      amount: null
    ): EventFilter;

    FinalizeDepositToMerge(
      l1Sender: string | null,
      l2Receiver: string | null,
      l2Token: string | null,
      mergeToken: null,
      amount: null
    ): EventFilter;

    Initialized(version: null): EventFilter;

    WithdrawalInitiated(
      l2Sender: string | null,
      l1Receiver: string | null,
      l2Token: string | null,
      amount: null
    ): EventFilter;
  };

  estimateGas: {
    MERGE_TOKEN_PORTAL(overrides?: CallOverrides): Promise<BigNumber>;

    "MERGE_TOKEN_PORTAL()"(overrides?: CallOverrides): Promise<BigNumber>;

    depositToMerge(
      _l2Token: string,
      _amount: BigNumberish,
      _l2Receiver: string,
      overrides?: Overrides
    ): Promise<BigNumber>;

    "depositToMerge(address,uint256,address)"(
      _l2Token: string,
      _amount: BigNumberish,
      _l2Receiver: string,
      overrides?: Overrides
    ): Promise<BigNumber>;

    finalizeDeposit(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: PayableOverrides
    ): Promise<BigNumber>;

    "finalizeDeposit(address,address,address,uint256,bytes)"(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: PayableOverrides
    ): Promise<BigNumber>;

    finalizeDepositToMerge(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: PayableOverrides
    ): Promise<BigNumber>;

    "finalizeDepositToMerge(address,address,address,uint256,bytes)"(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: PayableOverrides
    ): Promise<BigNumber>;

    initialize(
      _l1Bridge: string,
      _l2TokenProxyBytecodeHash: BytesLike,
      _governor: string,
      overrides?: Overrides
    ): Promise<BigNumber>;

    "initialize(address,bytes32,address)"(
      _l1Bridge: string,
      _l2TokenProxyBytecodeHash: BytesLike,
      _governor: string,
      overrides?: Overrides
    ): Promise<BigNumber>;

    l1Bridge(overrides?: CallOverrides): Promise<BigNumber>;

    "l1Bridge()"(overrides?: CallOverrides): Promise<BigNumber>;

    l1TokenAddress(l2TokenAddress: string, overrides?: CallOverrides): Promise<BigNumber>;

    "l1TokenAddress(address)"(l2TokenAddress: string, overrides?: CallOverrides): Promise<BigNumber>;

    l2TokenAddress(_l1Token: string, overrides?: CallOverrides): Promise<BigNumber>;

    "l2TokenAddress(address)"(_l1Token: string, overrides?: CallOverrides): Promise<BigNumber>;

    l2TokenBeacon(overrides?: CallOverrides): Promise<BigNumber>;

    "l2TokenBeacon()"(overrides?: CallOverrides): Promise<BigNumber>;

    withdraw(_l1Receiver: string, _l2Token: string, _amount: BigNumberish, overrides?: Overrides): Promise<BigNumber>;

    "withdraw(address,address,uint256)"(
      _l1Receiver: string,
      _l2Token: string,
      _amount: BigNumberish,
      overrides?: Overrides
    ): Promise<BigNumber>;

    withdrawFromMerge(
      _l1Receiver: string,
      _l2Token: string,
      _amount: BigNumberish,
      overrides?: Overrides
    ): Promise<BigNumber>;

    "withdrawFromMerge(address,address,uint256)"(
      _l1Receiver: string,
      _l2Token: string,
      _amount: BigNumberish,
      overrides?: Overrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    MERGE_TOKEN_PORTAL(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "MERGE_TOKEN_PORTAL()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    depositToMerge(
      _l2Token: string,
      _amount: BigNumberish,
      _l2Receiver: string,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "depositToMerge(address,uint256,address)"(
      _l2Token: string,
      _amount: BigNumberish,
      _l2Receiver: string,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    finalizeDeposit(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: PayableOverrides
    ): Promise<PopulatedTransaction>;

    "finalizeDeposit(address,address,address,uint256,bytes)"(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: PayableOverrides
    ): Promise<PopulatedTransaction>;

    finalizeDepositToMerge(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: PayableOverrides
    ): Promise<PopulatedTransaction>;

    "finalizeDepositToMerge(address,address,address,uint256,bytes)"(
      _l1Sender: string,
      _l2Receiver: string,
      _l1Token: string,
      _amount: BigNumberish,
      _data: BytesLike,
      overrides?: PayableOverrides
    ): Promise<PopulatedTransaction>;

    initialize(
      _l1Bridge: string,
      _l2TokenProxyBytecodeHash: BytesLike,
      _governor: string,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "initialize(address,bytes32,address)"(
      _l1Bridge: string,
      _l2TokenProxyBytecodeHash: BytesLike,
      _governor: string,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    l1Bridge(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "l1Bridge()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    l1TokenAddress(l2TokenAddress: string, overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "l1TokenAddress(address)"(l2TokenAddress: string, overrides?: CallOverrides): Promise<PopulatedTransaction>;

    l2TokenAddress(_l1Token: string, overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "l2TokenAddress(address)"(_l1Token: string, overrides?: CallOverrides): Promise<PopulatedTransaction>;

    l2TokenBeacon(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "l2TokenBeacon()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    withdraw(
      _l1Receiver: string,
      _l2Token: string,
      _amount: BigNumberish,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "withdraw(address,address,uint256)"(
      _l1Receiver: string,
      _l2Token: string,
      _amount: BigNumberish,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    withdrawFromMerge(
      _l1Receiver: string,
      _l2Token: string,
      _amount: BigNumberish,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "withdrawFromMerge(address,address,uint256)"(
      _l1Receiver: string,
      _l2Token: string,
      _amount: BigNumberish,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;
  };
}
