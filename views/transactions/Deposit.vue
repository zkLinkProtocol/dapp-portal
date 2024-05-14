<template>
  <div>
    <div class="cryptopeida-tips okx-cryptopeida mb-[10px]" v-if="route.query?.s === 'okx'">
      <div class="cryptopeida-tips-cover"></div>
      <!-- <img src="/img/okx-cryptopedia.svg" class="h-[64px] w-[64px] rounded-[8px]" /> -->
      <div class="z-2">
        <a
          href="https://www.okx.com/web3/discover/cryptopedia/event/28"
          target="_blank"
          class="cryptopeida-tips-title z-2 relative flex cursor-pointer items-center gap-[4px]"
        >
          <span>OKX Cryptopedia</span>
          <img :src="launchIcon" />
        </a>
        <div class="mt-[5px]">
          <p class="cryptopeida-tips-desc">
            Withdrawals from Nova are locked until April 14th, 10am UTC. During this time, you can use a third-party
            bridge to withdraw your assets.
          </p>
          <p class="cryptopeida-tips-desc">
            Please wait a few minutes for deposits to arrive before verifying the task on OKX Cryptopedia.
          </p>
        </div>
      </div>
    </div>

    <div class="mb-[10px]" v-else-if="route.query?.s === 'binance'">
      <!-- <img src="/img/okx-cryptopedia.svg" class="h-[64px] w-[64px] rounded-[8px]" /> -->
      <div class="z-2">
        <img src="/img/banner-binance@2x.png" class="block hidden w-full md:block" />
        <img src="/img/banner-binance-mobile@2x.png" class="block block w-full md:hidden" />
      </div>
    </div>

    <PageTitle v-if="step === 'form'">{{ pageTitle }}</PageTitle>
    <PageDesc v-if="step === 'form' && pageDesc">{{ pageDesc }}</PageDesc>
    <PageTitle
      v-else-if="step === 'confirm'"
      :back-function="
        () => {
          step = 'form';
        }
      "
    >
      Confirm transaction
    </PageTitle>

    <NetworkSelectModal
      v-model:opened="fromNetworkModalOpened"
      title="From"
      :network-key="selectedNetwork.key"
      @update:network-key="fromNetworkSelected($event)"
    />

    <CommonErrorBlock v-if="tokensRequestError" @try-again="fetchBalances">
      Getting tokens error: {{ tokensRequestError.message }}
    </CommonErrorBlock>
    <CommonErrorBlock v-else-if="balanceError" @try-again="fetchBalances">
      Getting balances error: {{ balanceError.message }}
    </CommonErrorBlock>

    <form v-else @submit.prevent="">
      <template v-if="step === 'form'">
        <TransactionWithdrawalsAvailableForClaimAlert v-if="!props.isIntegrate" />
        <EcosystemBlock
          v-if="eraNetwork.displaySettings?.showPartnerLinks && ecosystemBannerVisible"
          show-close-button
          class="mb-block-padding-1/2 sm:mb-block-gap"
        />
        <CommonInputTransactionWithdraw
          v-model="amount"
          v-model:error="amountError"
          v-model:token-address="amountInputTokenAddress"
          label="From"
          :from="'deposit'"
          :tokens="availableTokens"
          :balances="availableBalances"
          :max-amount="maxAmount"
          :approve-required="!enoughAllowance"
          :loading="tokensRequestInProgress || balanceInProgress || fetchErc20WithRouteParamInProgress"
          :merge-limit-exceeds="mergeLimitExceeds"
          class="mb-block-padding-1/2 sm:mb-block-gap"
          :is-integrate="props.isIntegrate"
        >
          <template #dropdown>
            <CommonButtonDropdown
              :toggled="fromNetworkModalOpened"
              size="xs"
              variant="light"
              @click="fromNetworkModalOpened = props.isIntegrate ? false : true"
              :no-chevron="props.isIntegrate"
            >
              <template #left-icon>
                <img :src="selectedNetwork.logoUrl" class="h-full w-full rounded-full" />
              </template>
              <span>{{ selectedNetwork.l1Network?.name }}</span>
            </CommonButtonDropdown>
          </template>
        </CommonInputTransactionWithdraw>
        <CommonInputTransactionAddress
          v-model="address"
          label="To"
          :default-label="`To your account ${account.address ? shortenAddress(account.address) : ''}`"
          :address-input-hidden="!!tokenCustomBridge"
        >
          <template #dropdown>
            <CommonButtonDropdown
              :toggled="toNetworkModalOpened"
              :noChevron="true"
              size="xs"
              variant="light"
              style="cursor: default"
            >
              <template #left-icon>
                <img :src="destination.iconUrl" class="h-full w-full rounded-full" />
              </template>
              <span>{{ destination.label }}</span>
            </CommonButtonDropdown>
          </template>
          <template #input-body v-if="tokenCustomBridge">
            <div class="mt-4">
              Depositing {{ tokenCustomBridge.symbol }} token to {{ destination.label }} requires custom deposit. Please
              use
              <a :href="tokenCustomBridge.bridgeUrlDeposit" target="_blank" class="underline underline-offset-2">
                {{ tokenCustomBridge.bridgeName }} </a
              >.
            </div>
          </template>
        </CommonInputTransactionAddress>
        <CommonButton
          v-if="tokenCustomBridge"
          type="submit"
          as="a"
          target="_blank"
          :href="tokenCustomBridge?.bridgeUrlDeposit"
          variant="primary"
          class="mt-4 w-full gap-1"
        >
          Open {{ tokenCustomBridge?.bridgeName }}
          <ArrowTopRightOnSquareIcon class="h-6 w-6" aria-hidden="true" />
        </CommonButton>
      </template>
      <template v-else-if="step === 'confirm'">
        <CommonCardWithLineButtons>
          <TransactionSummaryTokenEntry label="You deposit" :token="transaction!.token" />
          <TransactionSummaryAddressEntry
            v-if="mergeSupported && isMerge"
            label="You Receive"
            :address="mergeTokenInfo?.mergeToken"
            :destination="{iconUrl: transaction!.token.iconUrl}"
            :addressLabel="transaction!.token.symbol"
          />
          <TransactionSummaryAddressEntry
            label="From"
            :address="transaction!.from.address"
            :destination="transaction!.from.destination"
          />
          <TransactionSummaryAddressEntry
            label="To"
            :address="transaction!.to.address"
            :destination="transaction!.to.destination"
          />
        </CommonCardWithLineButtons>

        <CommonErrorBlock v-if="transactionError" :retry-button="false" class="mt-4">
          {{ transactionError.message }}
        </CommonErrorBlock>
      </template>
      <template v-else-if="step === 'submitted'">
        <DepositSubmitted :transaction="transactionInfo!" :make-another-transaction="resetForm" />
      </template>

      <template v-if="!tokenCustomBridge && (step === 'form' || step === 'confirm')">
        <CommonErrorBlock v-if="feeError" class="mt-2" @try-again="estimate">
          Fee estimation error: {{ feeError.message }}
        </CommonErrorBlock>
        <div class="mt-4 flex items-center gap-4">
          <transition v-bind="TransitionOpacity()">
            <TransactionFeeDetails
              v-if="!feeError && (fee || feeLoading)"
              label="Fee:"
              :fee-token="feeToken"
              :fee-amount="fee"
              :loading="feeLoading"
            />
          </transition>
          <CommonButtonLabel as="span" class="ml-auto text-right"
            >~ {{ getWaitTime(eraNetwork.l1Network?.id)[1] }} minutes</CommonButtonLabel
          >
        </div>
        <transition v-bind="TransitionAlertScaleInOutTransition">
          <CommonAlert v-if="!enoughBalanceToCoverFee" class="mt-4" variant="error" :icon="ExclamationTriangleIcon">
            <p>
              Insufficient <span class="font-medium">{{ feeToken?.symbol }}</span> balance on
              <span class="font-medium">{{ destinations.arbitrum.label }}</span> to cover the fee
            </p>
            <NuxtLink :to="{ name: 'receive-methods' }" class="alert-link">Receive funds</NuxtLink>
          </CommonAlert>
        </transition>
        <transition v-bind="TransitionAlertScaleInOutTransition">
          <CommonAlert
            v-if="recommendedBalance && feeToken"
            class="mt-4"
            variant="error"
            :icon="ExclamationTriangleIcon"
          >
            <p>
              Insufficient <span class="font-medium">{{ feeToken?.symbol }}</span> balance on
              {{ destinations.arbitrum.label }} to cover the fee. We recommend having at least
              <span class="font-medium"
                >{{
                  feeToken?.price
                    ? removeSmallAmountPretty(recommendedBalance, feeToken?.decimals, feeToken?.price)
                    : parseTokenAmount(recommendedBalance, ETH_TOKEN.decimals)
                }}
                {{ feeToken?.symbol }}</span
              >
              on {{ eraNetwork.l1Network?.name ?? "L1" }} for deposit.
            </p>
            <NuxtLink :to="{ name: 'receive-methods' }" class="alert-link">Receive funds</NuxtLink>
          </CommonAlert>
        </transition>
        <div class="mb-1 flex justify-between gap-3 sm:mt-2" v-if="mergeSupported">
          <CommonButtonLabel as="span" class="showTip relative text-left">
            Merge Token <img src="/img/Shape.svg" class="ml-1 inline-block h-3 w-3" alt="" />
            <div class="tooltip">
              All supported source tokens with the same entity from different networks can be merged into a single
              merged token. Holding or using merged token to engage with supported dApps could receive higher
              multipliers. <a href="https://docs.zklink.io/how-it-works/token-merge" target="_blank">Learn More</a>.
            </div>
          </CommonButtonLabel>
          <CommonButtonLabel as="span" class="text-right">
            <span v-if="isMerge">Merge</span>
            <Switch
              v-model="isMerge"
              :class="isMerge ? 'bg-blue-900' : 'bg-gray-500'"
              class="relative inline-flex h-4 w-10 items-center rounded-full align-middle"
            >
              <span
                :class="isMerge ? 'translate-x-0 bg-blue-600' : 'translate-x-4 bg-slate-600'"
                class="inline-block h-6 w-6 transform rounded-full bg-[#888C91] transition"
              />
            </Switch>
          </CommonButtonLabel>
        </div>
        <CommonErrorBlock v-if="allowanceRequestError" class="mt-2" @try-again="requestAllowance">
          Checking allowance error: {{ allowanceRequestError.message }}
        </CommonErrorBlock>
        <CommonErrorBlock v-else-if="setAllowanceError" class="mt-2" @try-again="setTokenAllowance">
          Allowance approval error: {{ setAllowanceError.message }}
        </CommonErrorBlock>

        <!--MNT and WETH Tips-->
        <CommonHeightTransition v-if="step === 'form'" :opened="!!isMNTOrWETH && enoughAllowance">
          <CommonCardWithLineButtons class="mt-4">
            <DestinationItem as="div">
              <template #label>
                {{ warpTipsTitle }}
              </template>
              <template #underline> {{ warpTipsDesc }} </template>
              <template #image>
                <div class="aspect-square h-full w-full rounded-full bg-warning-400 p-3 text-black">
                  <LockClosedIcon aria-hidden="true" />
                </div>
              </template>
            </DestinationItem>
          </CommonCardWithLineButtons>
        </CommonHeightTransition>
        <!-- MNT and WETH Tips end-->

        <CommonHeightTransition
          v-if="step === 'form'"
          :opened="(!enoughAllowance && !continueButtonDisabled) || !!setAllowanceReceipt"
        >
          <CommonCardWithLineButtons class="mt-4">
            <DestinationItem
              v-if="enoughAllowance && setAllowanceReceipt"
              as="div"
              :description="`You can now proceed to deposit`"
            >
              <template #label>
                {{ selectedToken?.symbol }} allowance approved
                <a
                  v-if="l1BlockExplorerUrl"
                  :href="`${l1BlockExplorerUrl}/tx/${setAllowanceReceipt.transactionHash}`"
                  target="_blank"
                  class="inline-flex items-center gap-1 underline underline-offset-2"
                >
                  View on Explorer
                  <ArrowTopRightOnSquareIcon class="h-6 w-6" aria-hidden="true" />
                </a>
              </template>
              <template #image>
                <div class="aspect-square h-full w-full rounded-full bg-success-400 p-3 text-black">
                  <CheckIcon aria-hidden="true" />
                </div>
              </template>
            </DestinationItem>
            <DestinationItem v-else as="div">
              <template #label>
                Approve {{ selectedToken?.symbol }} allowance
                <a
                  v-if="l1BlockExplorerUrl && setAllowanceTransactionHash"
                  :href="`${l1BlockExplorerUrl}/tx/${setAllowanceTransactionHash}`"
                  target="_blank"
                  class="inline-flex items-center gap-1 underline underline-offset-2"
                >
                  View on Explorer
                  <ArrowTopRightOnSquareIcon class="h-6 w-6" aria-hidden="true" />
                </a>
              </template>
              <template #underline>
                Before depositing you need to give our deposit permission to spend specified amount of
                {{ selectedToken?.symbol }}.
                <span v-if="allowance && !allowance.isZero()"
                  >You can deposit up to
                  <CommonButtonLabel variant="light" @click="setAmountToCurrentAllowance()">
                    {{ parseTokenAmount(allowance!, selectedToken!.decimals) }}
                  </CommonButtonLabel>
                  {{ selectedToken!.symbol }} without approving a new allowance.
                </span>
                <CommonButtonLabel variant="light" as="a" :href="TOKEN_ALLOWANCE" target="_blank">
                  Learn more
                </CommonButtonLabel>
              </template>
              <template #image>
                <div class="aspect-square h-full w-full rounded-full bg-warning-400 p-3 text-black">
                  <LockClosedIcon aria-hidden="true" />
                </div>
              </template>
            </DestinationItem>
          </CommonCardWithLineButtons>
        </CommonHeightTransition>

        <EthereumTransactionFooter :transaction="transactionHasGateway!">
          <template #after-checks>
            <template v-if="step === 'form'">
              <template v-if="!enoughAllowance && !continueButtonDisabled">
                <CommonButton
                  type="submit"
                  :disabled="continueButtonDisabled || setAllowanceInProgress"
                  variant="primary"
                  class="w-full"
                  @click="setTokenAllowance()"
                >
                  <transition v-bind="TransitionPrimaryButtonText" mode="out-in">
                    <span v-if="setAllowanceStatus === 'processing'">Processing...</span>
                    <span v-else-if="setAllowanceStatus === 'waiting-for-signature'"
                      >Waiting for allowance approval confirmation</span
                    >
                    <span class="flex items-center" v-else-if="setAllowanceStatus === 'sending'">
                      <CommonSpinner class="mr-2 h-6 w-6" />
                      Approving allowance...
                    </span>
                    <span v-else>Approve {{ selectedToken?.symbol }} allowance</span>
                  </transition>
                </CommonButton>
                <TransactionButtonUnderlineConfirmTransaction
                  :opened="setAllowanceStatus === 'waiting-for-signature'"
                />
              </template>
              <CommonButton
                v-else-if="!!isMNTOrWETH"
                type="submit"
                :disabled="continueButtonDisabled || wrapStatus !== 'not-started'"
                variant="primary"
                class="w-full"
                @click="buttonWrap()"
              >
                <transition v-bind="TransitionPrimaryButtonText" mode="out-in">
                  <span v-if="wrapStatus === 'processing'">Processing...</span>
                  <span v-else-if="wrapStatus === 'waiting-for-signature'">Waiting for confirmation</span>
                  <span class="flex items-center" v-else-if="wrapStatus === 'sending'">
                    <CommonSpinner class="mr-2 h-6 w-6" />
                    {{ isMNTSelected ? "Wrapping..." : "Unwrapping..." }}
                  </span>
                  <span v-else> {{ wrapBtnText }}</span>
                </transition>
              </CommonButton>
              <CommonButton
                v-else
                type="submit"
                :disabled="continueButtonDisabled"
                variant="primary"
                class="w-full"
                @click="buttonContinue()"
              >
                Continue
              </CommonButton>
            </template>
            <template v-else-if="step === 'confirm'">
              <transition v-bind="TransitionAlertScaleInOutTransition">
                <div v-if="!enoughBalanceForTransaction" class="mb-4">
                  <CommonAlert
                    v-if="amountError === 'exceeds_max_amount'"
                    variant="error"
                    :icon="ExclamationTriangleIcon"
                  >
                    <p>
                      The inputted amount is higher than the recommended maximum amount. This means your transaction
                      might fail.
                    </p>
                    <button type="button" class="alert-link" @click="step = 'form'">Go back</button>
                  </CommonAlert>
                  <CommonAlert v-else-if="continueButtonDisabled" variant="error" :icon="ExclamationTriangleIcon">
                    <p>
                      The fee has changed since the last estimation. Insufficient
                      <span class="font-medium">{{ selectedToken?.symbol }}</span> balance to pay for transaction.
                      Please go back and adjust the amount to proceed.
                    </p>
                    <button type="button" class="alert-link" @click="step = 'form'">Go back</button>
                  </CommonAlert>
                </div>
              </transition>
              <CommonButton
                :disabled="continueButtonDisabled || transactionStatus !== 'not-started'"
                class="w-full"
                variant="primary"
                @click="buttonContinue()"
              >
                <transition v-bind="TransitionPrimaryButtonText" mode="out-in">
                  <span v-if="transactionStatus === 'processing'">Processing...</span>
                  <span v-else-if="transactionStatus === 'waiting-for-signature'">Waiting for confirmation</span>
                  <span v-else>Deposit now</span>
                </transition>
              </CommonButton>
              <TransactionButtonUnderlineConfirmTransaction :opened="transactionStatus === 'waiting-for-signature'" />
            </template>
          </template>
        </EthereumTransactionFooter>
        <DepositThirdPartyBridge v-if="!props.isIntegrate" />
      </template>
    </form>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { Switch } from "@headlessui/vue";
import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
} from "@heroicons/vue/24/outline";
import { useRouteQuery } from "@vueuse/router";
import { BigNumber } from "ethers";
import { isAddress } from "ethers/lib/utils";
import { storeToRefs } from "pinia";

import EthereumTransactionFooter from "@/components/transaction/EthereumTransactionFooter.vue";

import useAllowance from "@/composables/transaction/useAllowance";
import useMergeToken from "@/composables/transaction/useMergeToken";
import useInterval from "@/composables/useInterval";
import useNetworks from "@/composables/useNetworks";
import useEcosystemBanner from "@/composables/zksync/deposit/useEcosystemBanner";
import useFee from "@/composables/zksync/deposit/useFee";
import useMntAndWeth from "@/composables/zksync/deposit/useMntAndWeth";
import useTransaction from "@/composables/zksync/deposit/useTransaction";

import type { TransactionDestination } from "@/store/destinations";
import type { TransactionInfo } from "@/store/zksync/transactionStatus";
import type { Token, TokenAmount } from "@/types";
import type { BigNumberish } from "ethers";
import type { Address } from "viem";

import { useRoute, useRouter } from "#app";
import { customBridgeTokens } from "@/data/customBridgeTokens";
import { getWaitTime } from "@/data/networks";
import { useDestinationsStore } from "@/store/destinations";
import { useNetworkStore } from "@/store/network";
import { useOnboardStore } from "@/store/onboard";
import { useSearchtokenStore } from "@/store/searchToken";
import { usePreferencesStore } from "@/store/preferences";
import { useZkSyncEthereumBalanceStore } from "@/store/zksync/ethereumBalance";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { useZkSyncTokensStore } from "@/store/zksync/tokens";
import { useZkSyncTransactionStatusStore } from "@/store/zksync/transactionStatus";
import { useZkSyncTransfersHistoryStore } from "@/store/zksync/transfersHistory";
import { useZkSyncWalletStore } from "@/store/zksync/wallet";
import { ETH_TOKEN } from "@/utils/constants";
import { TOKEN_ALLOWANCE } from "@/utils/doc-links";
import { checksumAddress, decimalToBigNumber, formatRawTokenPrice, parseTokenAmount } from "@/utils/formatters";
import { silentRouterChange } from "@/utils/helpers";
import { TransitionAlertScaleInOutTransition, TransitionOpacity } from "@/utils/transitions";
import DepositSubmitted from "@/views/transactions/DepositSubmitted.vue";
import { ETH_ADDRESS, WMNT_CONTRACT, isSameAddress, fetchErc20 } from "@/zksync-web3-nova/src/utils";

import DepositThirdPartyBridge from "@/components/transaction/DepositThirdPartyBridge.vue";

const props = defineProps({
  isIntegrate: {
    type: Boolean,
    default: false,
  },
});

// const okxIcon = "/img/okx-cryptopedia.svg";
const launchIcon = "/img/launch.svg";
const { zkSyncNetworks } = useNetworks();

const route = useRoute();
const router = useRouter();

const onboardStore = useOnboardStore();
const tokensStore = useZkSyncTokensStore();
const providerStore = useZkSyncProviderStore();
const zkSyncEthereumBalance = useZkSyncEthereumBalanceStore();
const eraWalletStore = useZkSyncWalletStore();
const { account, isConnected } = storeToRefs(onboardStore);
const { eraNetwork } = storeToRefs(providerStore);
const { destinations } = storeToRefs(useDestinationsStore());
const { l1BlockExplorerUrl, selectedNetwork, selectedNetworkKey } = storeToRefs(useNetworkStore());
const { l1Tokens, tokensRequestInProgress, tokensRequestError } = storeToRefs(tokensStore);
const { balance, balanceInProgress, balanceError } = storeToRefs(zkSyncEthereumBalance);
const searchtokenStore = useSearchtokenStore();
const fetchErc20WithRouteParamInProgress = ref(false);
const toNetworkModalOpened = ref(false);
const fromNetworkModalOpened = ref(false);
const fromNetworkSelected = (networkKey?: string) => {
  if (destinations.value.nova.key === networkKey) {
    router.replace({ name: "withdraw", query: route.query });
  }
};

const pageTitle = computed(() => {
  const titleParam = route.query.title;
  return props.isIntegrate ? titleParam : "Deposit";
});

const pageDesc = computed(() => {
  const desc = route.query.desc;
  return props.isIntegrate ? desc : "";
});

const step = ref<"form" | "confirm" | "submitted">("form");
const isMerge = ref<true | false>(true);
const destination = computed(() => destinations.value.nova);
const availableTokens = computed<Token[]>(() => {
  if (balance.value) return balance.value;

  const filterL1tokens = Object.values(l1Tokens.value ?? []).filter(
    (e) => e.networkKey === eraNetwork.value.key || e.address === ETH_TOKEN.l1Address
  );
  return filterL1tokens;
  // return Object.values(l1Tokens.value ?? []);
});
const availableBalances = computed<TokenAmount[]>(() => {
  return balance.value ?? [];
});
const routeTokenAddress = computed(() => {
  if (!route.query.token || Array.isArray(route.query.token) || !isAddress(route.query.token)) {
    return;
  }
  return checksumAddress(route.query.token);
});
const tokenWithHighestBalancePrice = computed(() => {
  const tokenWithHighestBalancePrice = [...availableBalances.value].sort((a, b) => {
    const aPrice = typeof a.price === "number" ? formatRawTokenPrice(a.amount, a.decimals, a.price) : 0;
    const bPrice = typeof b.price === "number" ? formatRawTokenPrice(b.amount, b.decimals, b.price) : 0;
    return bPrice - aPrice;
  });
  return tokenWithHighestBalancePrice[0] ? tokenWithHighestBalancePrice[0] : undefined;
});

const defaultToken = computed(() => availableTokens.value[0] ?? undefined);
const selectedTokenAddress = ref<string | undefined>(
  routeTokenAddress.value ?? tokenWithHighestBalancePrice.value?.address ?? defaultToken.value?.address
);
const selectedToken = computed<Token | undefined>(() => {
  if (!selectedTokenAddress.value) {
    if (!selectedNetwork.value.isEthGasToken && defaultToken.value?.address === ETH_ADDRESS) {
      return availableTokens.value[1];
    }
    return defaultToken.value;
  }
  const res =
    availableTokens.value.find((e) => e.address === selectedTokenAddress.value) ||
    availableBalances.value.find((e) => e.address === selectedTokenAddress.value) ||
    defaultToken.value;

  if (!selectedNetwork.value.isEthGasToken && res.address === ETH_ADDRESS) {
    return availableTokens.value[1];
  }
  return res;
});

const { isMNTSelected, isWETHSelected, isMNTOrWETH, warpTipsTitle, warpTipsDesc, wrapBtnText } =
  useMntAndWeth(selectedToken);

const tokenCustomBridge = computed(() => {
  if (!selectedToken.value) {
    return undefined;
  }
  return customBridgeTokens.find(
    (e) => eraNetwork.value.l1Network?.id === e.chainId && e.l1Address === selectedToken.value?.address
  );
});
const amountInputTokenAddress = computed({
  get: () => selectedToken.value?.address,
  set: (address) => {
    selectedTokenAddress.value = address;
  },
});
const tokenBalance = computed<BigNumberish | undefined>(() => {
  return balance.value?.find((e) => e.address === selectedToken.value?.address)?.amount;
});
const { result: mergeTokenInfo, reloadMergeTokenInfo } = useMergeToken(computed(() => selectedToken.value?.l2Address));

const {
  result: allowance,
  inProgress: allowanceRequestInProgress,
  error: allowanceRequestError,
  requestAllowance,

  setAllowanceTransactionHash,
  setAllowanceReceipt,
  setAllowanceStatus,
  setAllowanceInProgress,
  setAllowanceError,
  setAllowance,
  resetSetAllowance,
} = useAllowance(
  computed(() => account.value.address),
  computed(() => selectedToken.value?.address),
  async () => (await providerStore.requestProvider().getDefaultBridgeAddresses()).erc20L1,
  onboardStore.getWallet,
  onboardStore.getPublicClient
);
const enoughAllowance = computed(() => {
  if (!allowance.value || !selectedToken.value) {
    return true;
  }
  return !allowance.value.isZero() && allowance.value.gte(totalComputeAmount.value);
});
const setAmountToCurrentAllowance = () => {
  if (!allowance.value || !selectedToken.value) {
    return;
  }
  amount.value = parseTokenAmount(allowance.value, selectedToken.value.decimals);
};
const setTokenAllowance = async () => {
  await setAllowance(totalComputeAmount.value);
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for balances to be updated on API side
  await fetchBalances(true);
};
const unsubscribe = onboardStore.subscribeOnAccountChange(() => {
  step.value = "form";
});

const {
  fee: feeValues,
  result: fee,
  inProgress: feeInProgress,
  error: feeError,
  recommendedBalance,
  feeToken,
  enoughBalanceToCoverFee,
  estimateFee,
  resetFee,
  resetFeeImmediately,
} = useFee(availableTokens, balance, eraWalletStore.getL1Signer, onboardStore.getPublicClient);

const queryAddress = useRouteQuery<string | undefined>("address", undefined, {
  transform: String,
  mode: "replace",
});
const address = ref((queryAddress.value !== "undefined" && queryAddress.value) || "");
const isAddressInputValid = computed(() => {
  if (address.value) {
    return isAddress(address.value);
  }
  return true; // Own address by default
});
watch(address, (_address) => {
  queryAddress.value = !_address.length ? undefined : _address;
});

const amount = ref("");
const amountError = ref<string | undefined>();
const maxAmount = computed(() => {
  if (!selectedToken.value || !tokenBalance.value) {
    return undefined;
  }
  if (feeToken.value?.address === selectedToken.value.address) {
    if (BigNumber.from(tokenBalance.value).isZero()) {
      return "0";
    }
    if (!fee.value) {
      return undefined;
    }
    if (BigNumber.from(fee.value).gt(tokenBalance.value)) {
      return "0";
    }
    return BigNumber.from(tokenBalance.value).sub(fee.value).toString();
  }
  return tokenBalance.value.toString();
});
const totalComputeAmount = computed(() => {
  try {
    if (!amount.value || !selectedToken.value) {
      return BigNumber.from("0");
    }
    return decimalToBigNumber(amount.value, selectedToken.value.decimals);
  } catch (error) {
    return BigNumber.from("0");
  }
});
const enoughBalanceForTransaction = computed(() => !amountError.value);

const mergeSupported = computed(() => {
  return mergeTokenInfo.value?.isSupported && !mergeTokenInfo.value?.isLocked;
});

const mergeLimitExceeds = computed(() => {
  if (!selectedToken.value || !mergeTokenInfo.value || !amount.value) return false;
  try {
    const amountVal = decimalToBigNumber(amount.value, selectedToken.value.decimals);
    const exceeds = amountVal.add(mergeTokenInfo.value?.balance).gt(mergeTokenInfo.value?.depositLimit);
    console.log("exceeds: ", exceeds);
    return mergeSupported.value && isMerge.value && exceeds;
  } catch (e) {
    // may throw exception when amount exceeds decimals
    return false;
  }
});

const transaction = computed<
  | {
      token: TokenAmount;
      from: { address: string; destination: TransactionDestination };
      to: { address: string; destination: TransactionDestination };
      toMerge?: boolean;
    }
  | undefined
>(() => {
  const toAddress = isAddress(address.value) ? address.value : account.value.address;
  if (!toAddress || !selectedToken.value) {
    return undefined;
  }
  return {
    token: {
      ...selectedToken.value!,
      amount: totalComputeAmount.value.toString(),
    },
    from: {
      address: account.value.address!,
      destination: destinations.value.arbitrum,
    },
    to: {
      address: toAddress,
      destination: destination.value,
    },
    toMerge: isMerge.value,
  };
});
const transactionHasGateway = ref<TransactionInfo>();
transactionHasGateway.value = {
  type: "deposit",
  transactionHash: "",
  timestamp: new Date().toISOString(),
  token: null,
  from: "",
  to: "",
  fromChainKey: selectedNetwork.value.key,
  gateway: selectedNetwork.value.l1Gateway,
  info: {
    expectedCompleteTimestamp: new Date(
      new Date().getTime() + getWaitTime(eraNetwork.value.l1Network?.id)[0]
    ).toISOString(),
    completed: false,
  },
};

const feeLoading = computed(() => feeInProgress.value || (!fee.value && balanceInProgress.value));
const estimate = async () => {
  if (!transaction.value?.from.address || !transaction.value?.to.address || !selectedToken.value) {
    return;
  }
  await estimateFee(transaction.value.to.address, selectedToken.value.address);
};
watch(
  [() => selectedToken.value?.address, () => transaction.value?.from.address],
  () => {
    resetFee();
    estimate();
  },
  { immediate: true }
);

const autoUpdatingFee = computed(() => !feeError.value && fee.value && !feeLoading.value);
const { reset: resetAutoUpdateEstimate, stop: stopAutoUpdateEstimate } = useInterval(async () => {
  if (!autoUpdatingFee.value) return;
  await estimate();
}, 60000);
watch(
  autoUpdatingFee,
  (updatingFee) => {
    if (!updatingFee) {
      stopAutoUpdateEstimate();
    } else {
      resetAutoUpdateEstimate();
    }
  },
  { immediate: true }
);

const continueButtonDisabled = computed(() => {
  if (
    !transaction.value ||
    !enoughBalanceToCoverFee.value ||
    !(!amountError.value || amountError.value === "exceeds_max_amount") ||
    BigNumber.from(transaction.value.token.amount).isZero()
  )
    return true;
  if ((allowanceRequestInProgress.value && !allowance.value) || allowanceRequestError.value) return true;
  if (!enoughAllowance.value) return false; // When allowance approval is required we can proceed to approve stage even if deposit fee is not loaded
  if (!isAddressInputValid.value) return true;
  if (feeLoading.value || !fee.value) return true;
  if (mergeLimitExceeds.value) return true;
  return false;
});

const buttonContinue = () => {
  if (continueButtonDisabled.value) {
    return;
  }
  if (step.value === "form") {
    step.value = "confirm";
  } else if (step.value === "confirm") {
    makeTransaction();
  }
};

const buttonWrap = () => {
  if (continueButtonDisabled.value) {
    return;
  }
  if (step.value === "form") {
    makeTransactionWrap();
  }
};

/* Transaction signing and submitting */
const transfersHistoryStore = useZkSyncTransfersHistoryStore();
const { previousTransactionAddress } = storeToRefs(usePreferencesStore());
const {
  wrapStatus,
  status: transactionStatus,
  error: transactionError,
  commitTransaction,
  wrapTransaction,
} = useTransaction(eraWalletStore.getL1Signer);
const { recentlyBridged, ecosystemBannerVisible } = useEcosystemBanner();
const { saveTransaction, waitForCompletion } = useZkSyncTransactionStatusStore();

watch(step, (newStep) => {
  if (newStep === "form") {
    transactionError.value = undefined;
  }
});

const transactionInfo = ref<TransactionInfo | undefined>();
const makeTransaction = async () => {
  if (continueButtonDisabled.value) return;
  const { selectedNetwork } = storeToRefs(useNetworkStore());

  const tx = await commitTransaction(
    {
      to: transaction.value!.to.address,
      tokenAddress: transaction.value!.token.address,
      amount: transaction.value!.token.amount,
      toMerge: mergeSupported.value && transaction.value!.toMerge,
    },
    feeValues.value!
  );

  if (transactionStatus.value === "done") {
    step.value = "submitted";
    previousTransactionAddress.value = transaction.value!.to.address;
    recentlyBridged.value = true;
    reloadMergeTokenInfo();
  }

  if (tx) {
    zkSyncEthereumBalance.deductBalance(feeToken.value!.address!, fee.value!);
    zkSyncEthereumBalance.deductBalance(transaction.value!.token.address!, transaction.value!.token.amount);
    transactionInfo.value = {
      type: "deposit",
      transactionHash: tx.hash,
      timestamp: new Date().toISOString(),
      token: transaction.value!.token,
      from: transaction.value!.from,
      to: transaction.value!.to,
      fromChainKey: selectedNetwork.value.key,
      gateway: selectedNetwork.value.l1Gateway,
      info: {
        expectedCompleteTimestamp: new Date(
          new Date().getTime() + getWaitTime(eraNetwork.value.l1Network?.id)[0]
        ).toISOString(),
        completed: false,
      },
    };

    saveTransaction(transactionInfo.value);
    silentRouterChange(
      router.resolve({
        name: "transaction-hash",
        params: { hash: transactionInfo.value.transactionHash },
        query: { network: eraNetwork.value.key },
      }).href
    );
    waitForCompletion(transactionInfo.value)
      .then(async (completedTransaction) => {
        transactionInfo.value = completedTransaction;
        setTimeout(() => {
          transfersHistoryStore.reloadRecentTransfers().catch(() => undefined);
          fetchBalances(true).catch(() => undefined);
        }, 2000);
      })
      .catch((err) => {
        console.log(err);
        transactionError.value = err as Error;
        transactionStatus.value = "not-started";
      });
  }
};

const makeTransactionWrap = async () => {
  if (continueButtonDisabled.value) return;

  await wrapTransaction({
    to: transaction.value!.to.address,
    tokenAddress: transaction.value!.token.address,
    amount: transaction.value!.token.amount,
  });

  if (wrapStatus.value === "done") {
    if (isMNTSelected) {
      selectedTokenAddress.value = WMNT_CONTRACT;
    } else if (isWETHSelected) {
      selectedTokenAddress.value = ETH_ADDRESS;
    }
    wrapStatus.value = "not-started";
    fetchBalances(true).catch(() => undefined);
    console.log("wrap done");
  }
};

const resetForm = () => {
  address.value = "";
  amount.value = "";
  step.value = "form";
  transactionStatus.value = "not-started";
  wrapStatus.value = "not-started";
  transactionInfo.value = undefined;
  resetSetAllowance();
  requestAllowance();
  silentRouterChange((route as unknown as { href: string }).href);
};

const fetchBalances = async (force = false) => {
  tokensStore.requestTokens();
  if (!isConnected.value) return;

  await zkSyncEthereumBalance.requestBalance({ force }).then(() => {
    if (!selectedToken.value) {
      selectedTokenAddress.value = tokenWithHighestBalancePrice.value?.address;
    }
  });
  // fetch token with address in route params when is integrate
  if (props.isIntegrate && route.query.token) {
    if (!balance.value?.find((item) => isSameAddress(item.address, route.query.token as string))) {
      fetchErc20WithRouteParamInProgress.value = true;
      fetchErc20(
        route.query.token as Address,
        onboardStore.getPublicClient(selectedNetwork.value.l1Network?.id),
        account.value.address
      )
        .then((token) => {
          if (token) {
            searchtokenStore.saveSearchToken(token);
            setTimeout(() => {
              zkSyncEthereumBalance.saveTokenRequest().then();
            }, 1);
          }
        })
        .finally(() => {
          fetchErc20WithRouteParamInProgress.value = false;
        });
    }
  }
};
fetchBalances();

const unsubscribeFetchBalance = onboardStore.subscribeOnAccountChange((newAddress: string | undefined) => {
  if (!newAddress) return;
  estimate();
  fetchBalances();
});

onBeforeUnmount(() => {
  unsubscribe();
  unsubscribeFetchBalance();
});

onboardStore.subscribeOnNetworkChange((newchainId) => {
  if (!newchainId) return;
  resetFeeImmediately();
});

onMounted(() => {
  if (selectedNetworkKey.value === "blast") {
    selectedNetworkKey.value = zkSyncNetworks[0].key;
  }
});
</script>

<style lang="scss" scoped>
.warnBox1 {
  display: flex;
  a {
    color: #0bc48f;
  }
}
.warnBox {
  display: inline-flex;
  padding: 0 0 16px 0;
  justify-content: center;
  color: #f29914;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
  img {
    width: 21px;
    height: 21px;
    margin-right: 5px;
  }
  a {
    color: #0bc48f;
  }
}
.waitTime {
  width: 100%;
  text-align: right;
  padding: 20px 20px 0 0;
  color: #555;
  position: absolute;
  right: 10px;
  top: -30px;
}

.cryptopeida-tips {
  position: relative;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #262b33;
  background: #000;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  &.okx-cryptopeida {
    background-image: url("/img/okx-tips-bg.svg");
  }

  .cryptopeida-tips-cover {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: block;
    background: rgba($color: #000000, $alpha: 0.7);
    z-index: 0;
  }

  &-title {
    color: #fff;
    font-size: 14px;
    font-style: normal;
    font-weight: 700;
    line-height: normal;
    letter-spacing: -0.07px;
  }
  &-desc {
    position: relative;
    padding-left: 10px;
    color: #fff;
    font-size: 12px;
    font-style: normal;
    font-weight: 400;
    line-height: normal;
    letter-spacing: -0.06px;
    &::after {
      display: block;
      content: "";
      position: absolute;
      top: 5px;
      left: 0;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #fff;
    }
  }
}
.merge {
  border-radius: 16px;
  background: rgba(3, 212, 152, 0.5) !important;
}
.notMerge {
  border-radius: 16px;
  background: rgba(23, 85, 244, 0.25) !important;
}
.showTip:hover {
  .tooltip {
    display: block;
    z-index: 100;
  }
}
.tooltip {
  display: none;
  position: absolute;
  padding: 12px 20px 12px 24px;
  top: -7.5rem;
  width: 35rem;
  left: -10rem;
  border-radius: 8px;
  background: #1f2127;
  a {
    color: #1755f4;
  }
}
</style>
