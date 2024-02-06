import {  ethers } from 'ethers';
import type { BytesLike } from 'ethers';

import { Address, ApprovalBasedPaymasterInput, GeneralPaymasterInput, PaymasterInput, PaymasterParams } from './types';

import paymasterFlowAbi from "../abi/IPaymasterFlow.json"

export const IPaymasterFlow = new ethers.utils.Interface(paymasterFlowAbi.abi);

export function getApprovalBasedPaymasterInput(paymasterInput: ApprovalBasedPaymasterInput): BytesLike {
    return IPaymasterFlow.encodeFunctionData('approvalBased', [
        paymasterInput.token,
        paymasterInput.minimalAllowance,
        paymasterInput.innerInput
    ]);
}

export function getGeneralPaymasterInput(paymasterInput: GeneralPaymasterInput): BytesLike {
    return IPaymasterFlow.encodeFunctionData('general', [paymasterInput.innerInput]);
}

export function getPaymasterParams(paymasterAddress: Address, paymasterInput: PaymasterInput): PaymasterParams {
    if (paymasterInput.type == 'General') {
        return {
            paymaster: paymasterAddress,
            paymasterInput: getGeneralPaymasterInput(paymasterInput)
        };
    } else {
        return {
            paymaster: paymasterAddress,
            paymasterInput: getApprovalBasedPaymasterInput(paymasterInput)
        };
    }
}
