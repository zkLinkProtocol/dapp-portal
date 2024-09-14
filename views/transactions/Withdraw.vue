<template>
  <div>
    <slot v-if="step === 'form'" name="title" />
    <PageTitle
      v-else-if="step === 'withdrawal-finalization-warning'"
      :back-function="
        () => {
          step = 'form';
        }
      "
    >
      Withdrawal claim required
    </PageTitle>
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
    <div class="tab">
      <div class="box" :class="{ active: showBridge }" @click="showBridge = true">
        <div class="name">Use the official Bridge</div>
        <div class="time">Up to 8.5 days, no additional fee</div>
      </div>
      <div class="box" :class="{ active: !showBridge }" @click="showBridge = false">
        <div class="name">Use a third party bridge</div>
        <div class="time">Usually takes under 20 mins</div>
      </div>
    </div>
    <div class="warnBox flex" v-if="!route.query.s || route.query.s !== 'okx'">
      <div>
        Note: All LRT points will continue to be calculated after you request a withdrawal. They will appear in the next
        few days in dashboard due to the data synchronization process.
      </div>
    </div>

    <div v-if="showBridge">
      <NetworkSelectModal
        v-model:opened="fromNetworkModalOpened"
        title="From"
        :network-key="destinations.era.key"
        @update:network-key="fromNetworkSelected($event)"
      />
      <NetworkSelectModal
        v-model:opened="toNetworkModalOpened"
        title="To"
        :network-key="selectedNetwork.key"
        @update:network-key="toNetworkSelected($event)"
      />

      <CommonErrorBlock v-if="tokensRequestError" @try-again="fetchBalances">
        Getting tokens error: {{ tokensRequestError.message }}
      </CommonErrorBlock>
      <CommonErrorBlock v-else-if="balanceError" @try-again="fetchBalances">
        Getting balances error: {{ balanceError.message }}
      </CommonErrorBlock>
      <form v-else @submit.prevent="">
        <template v-if="step === 'form'">
          <TransactionWithdrawalsAvailableForClaimAlert />
          <CommonInputTransactionWithdraw
            v-model="amount"
            v-model:error="amountError"
            v-model:token-address="amountInputTokenAddress"
            :label="type === 'withdrawal' ? 'From' : undefined"
            :from="'withdraw'"
            :tokens="availableTokens"
            :balances="availableBalances"
            :max-amount="maxAmount"
            :loading="tokensRequestInProgress || balanceInProgress"
            :merge-withdrawal-limit-exceeds="mergeTokenWithdrawalLimitExceeds"
            :merge-withdrawal-limit="mergeTokenLockedBalance"
          >
            <template #token-dropdown-bottom v-if="type === 'withdrawal' && account.address">
              <CommonAlert class="bottom-0 mt-3" variant="neutral" :icon="InformationCircleIcon">
                <p>Only tokens available for withdrawal are displayed</p>
              </CommonAlert>
            </template>
            <template #dropdown v-if="type === 'withdrawal'">
              <CommonButtonDropdown
                :toggled="fromNetworkModalOpened"
                size="xs"
                variant="light"
                class="overflow-hidden"
                :noChevron="true"
                style="cursor: default"
              >
                <template #left-icon>
                  <img :src="destinations.nova.iconUrl" class="h-full w-full rounded-full" />
                </template>
                <span class="truncate">{{ destinations.nova.label }}</span>
              </CommonButtonDropdown>
            </template>
          </CommonInputTransactionWithdraw>

          <CommonInputTransactionAddress
            v-if="type === 'withdrawal'"
            v-model="address"
            label="To"
            :default-label="`To your account ${account.address ? shortenAddress(account.address) : ''}`"
            :address-input-hidden="!!tokenCustomBridge"
            class="mt-6"
          >
            <template #dropdown>
              <CommonButtonDropdown
                :toggled="toNetworkModalOpened"
                size="xs"
                variant="light"
                class="overflow-hidden"
                @click="toNetworkModalOpened = true"
              >
                <template #left-icon>
                  <img :src="destination.iconUrl" class="h-full w-full rounded-full" />
                </template>
                <span class="truncate">{{ destination.label }}</span>
              </CommonButtonDropdown>
            </template>
            <template #input-body v-if="tokenCustomBridge">
              <div class="mt-4">
                Bridging {{ tokenCustomBridge.symbol }} token to {{ destination.label }} requires custom bridge. Please
                use
                <a :href="tokenCustomBridge.bridgeUrlWithdraw" target="_blank" class="underline underline-offset-2">
                  {{ tokenCustomBridge.bridgeName }} </a
                >.
              </div>
            </template>
          </CommonInputTransactionAddress>
          <CommonInputTransactionAddress v-else v-model="address" class="mt-6" />
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
        <template v-else-if="step === 'withdrawal-finalization-warning'">
          <CommonAlert variant="warning" :icon="ExclamationTriangleIcon" class="mb-block-padding-1/2 sm:mb-block-gap">
            <p>
              Once your withdrawal is processed and available on
              {{ eraNetwork.l1Network?.name }}, you will need to manually claim your funds which requires paying another
              transaction fee on {{ eraNetwork.l1Network?.name }}.
            </p>
          </CommonAlert>
          <!--         //TODO forced manual withdraw
          <CommonAlert variant="warning" :icon="ExclamationTriangleIcon" class="mb-block-padding-1/2 sm:mb-block-gap">
            <p>
              You are withdrawing less than 0.01 ETH. Once your withdrawal is processed and available on
              {{ eraNetwork.l1Network?.name }}, you will need to manually claim your funds which requires paying another
              transaction fee on {{ eraNetwork.l1Network?.name }}. Transactions of 0.01 ETH or more are finalized
              automatically.
              <br />
              <br />
              To withdraw smaller amounts you can use
              <span class="inline-flex items-center gap-1">
                <a
                  href="https://zksync.dappradar.com/ecosystem?category-de=bridges"
                  target="_blank"
                  class="underline underline-offset-2"
                  >third-party bridges</a
                >
              </span>
            </p>
          </CommonAlert>
          <CommonButton
            as="a"
            href="https://zksync.dappradar.com/ecosystem?category-de=bridges"
            target="_blank"
            type="submit"
            variant="primary"
            class="mt-block-gap w-full gap-1"
          >
            See third-party bridges
            <ArrowTopRightOnSquareIcon class="h-6 w-6" aria-hidden="true" />
          </CommonButton> -->

          <CommonButton size="sm" class="mx-auto mt-block-gap w-max" @click="buttonContinue()">
            I understand, proceed to withdrawal
          </CommonButton>
        </template>
        <template v-else-if="step === 'confirm'">
          <CommonAlert
            v-if="type === 'withdrawal'"
            variant="warning"
            :icon="ExclamationTriangleIcon"
            class="mb-block-padding-1/2 sm:mb-block-gap"
          >
            <p v-if="withdrawalManualFinalizationRequired">
              You can claim your withdrawal after a minimum delay of 8 days. (On average, it takes around 8.5 days.)
              <!-- <a class="underline underline-offset-2" :href="ZKSYNC_WITHDRAWAL_DELAY" target="_blank">Learn more</a> -->
            </p>
            <p v-else>
              You will receive funds only after a maximum {{ displayEstimateWithdrawalDelayDays }}-day withdrawal delay.
              <!-- <a class="underline underline-offset-2" :href="ZKSYNC_WITHDRAWAL_DELAY" target="_blank">Learn more</a> -->
            </p>
          </CommonAlert>

          <CommonCardWithLineButtons>
            <TransactionSummaryTokenEntry label="You send" :token="transaction!.token" />
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
          <TransferSubmitted
            v-if="transactionInfo!.type === 'transfer'"
            :transaction="transactionInfo!"
            :make-another-transaction="resetForm"
          />
          <WithdrawalSubmitted
            v-else-if="transactionInfo!.type === 'withdrawal'"
            :transaction="transactionInfo!"
            :make-another-transaction="resetForm"
          />
        </template>

        <template v-if="!tokenCustomBridge && (step === 'form' || step === 'confirm')">
          <CommonErrorBlock
            v-if="feeError"
            class="mt-2"
            @try-again="isMergeTokenSelected ? estiamteForMergeToken : estimate"
          >
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
            <CommonButtonLabel
              v-if="type === 'withdrawal' && !isCustomNode"
              as="a"
              :href="ZKSYNC_WITHDRAWAL_DELAY"
              target="_blank"
              class="ml-auto text-right"
            >
              Up to 24 hours
            </CommonButtonLabel>
            <CommonButtonLabel v-else-if="type === 'transfer'" as="span" class="ml-auto text-right">
              Almost instant
            </CommonButtonLabel>
          </div>
          <transition v-bind="TransitionAlertScaleInOutTransition">
            <CommonAlert v-if="!enoughBalanceToCoverFee" class="mt-4" variant="error" :icon="ExclamationTriangleIcon">
              <p>
                Insufficient <span class="font-medium">{{ feeToken?.symbol }}</span> balance on
                {{ destinations.era.label }} to cover the fee
              </p>
              <NuxtLink :to="{ name: 'receive-methods' }" class="alert-link">Receive funds</NuxtLink>
            </CommonAlert>
          </transition>

          <!-- <CommonHeightTransition v-if="step === 'form'" :opened="enoughAllowance && isMergeTokenSelected">
            <CommonCardWithLineButtons class="mt-4">
            <DestinationItem as="div">
              <template #label>
                Withdrawal of Merged {{ selectedToken?.symbol }} to {{ selectedNetwork.l1Network?.name }}
              </template>
              <template #underline>
                Please be aware that there are currently {{ mergeTokenLockedBalance }} {{ selectedToken?.symbol }}.{{
                  selectedNetwork.l1Network?.name.split(' ')[0]
                }}
                tokens locked in the
                <a :href="MergeTokenContractUrl" target="_blacnk" class="underline underline-offset-2"
                  >token merge contract</a
                >
                . Therefore, the available withdrawal amount for merged {{ selectedToken?.symbol }} to {{ selectedNetwork.l1Network?.name }} is {{ mergeTokenLockedBalance }}
                <p class="warnNote">
                  Note: All LRT points will continue to be calculated after you request a withdrawal. They will appear in the next few days in dashboard due to the data synchronization process.
                </p>
              </template>
              <template #image>
                <div class="aspect-square h-full w-full rounded-full bg-warning-400 p-3 text-black">
                  <LockClosedIcon aria-hidden="true" />
                </div>
              </template>
            </DestinationItem>
          </CommonCardWithLineButtons>
          </CommonHeightTransition> -->

          <CommonHeightTransition
            v-if="isMergeTokenSelected && step === 'form'"
            :opened="(!enoughAllowance && !continueButtonDisabled) || !!setAllowanceReceipt"
          >
            <CommonCardWithLineButtons class="mt-4">
              <DestinationItem
                v-if="enoughAllowance && setAllowanceReceipt"
                as="div"
                :description="`You can now proceed to withdraw`"
              >
                <template #label>
                  {{ selectedToken?.symbol }} allowance approved
                  <a
                    v-if="selectedNetwork"
                    :href="`${selectedNetwork.blockExplorerUrl}/tx/${setAllowanceReceipt.transactionHash}`"
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
                    v-if="selectedNetwork.blockExplorerUrl && setAllowanceTransactionHash"
                    :href="`${selectedNetwork.blockExplorerUrl}/tx/${setAllowanceTransactionHash}`"
                    target="_blank"
                    class="inline-flex items-center gap-1 underline underline-offset-2"
                  >
                    View on Explorer
                    <ArrowTopRightOnSquareIcon class="h-6 w-6" aria-hidden="true" />
                  </a>
                </template>
                <template #underline>
                  Before withdrawing you need to give our permission to spend specified amount of
                  {{ selectedToken?.symbol }}.
                  <span v-if="allowance && !allowance.isZero()"
                    >You can withdraw up to
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

          <TransactionFooter>
            <template #after-checks>
              <template v-if="step === 'form'">
                <template v-if="isMergeTokenSelected && !enoughAllowance && !continueButtonDisabled">
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
                  v-else
                  type="submit"
                  :disabled="continueButtonDisabled"
                  variant="primary"
                  class="w-full"
                  @click="buttonContinue()"
                >
                  {{ "Continue" }}
                </CommonButton>
              </template>
              <template v-else-if="step === 'confirm'">
                <transition v-bind="TransitionAlertScaleInOutTransition">
                  <div v-if="!enoughBalanceForTransaction" class="mb-4">
                    <CommonAlert variant="error" :icon="ExclamationTriangleIcon">
                      <p>
                        {{
                          selectedToken?.address === ETH_TOKEN.address
                            ? "The fee has changed since the last estimation. "
                            : ""
                        }}Insufficient <span class="font-medium">{{ selectedToken?.symbol }}</span> balance to pay for
                        transaction. Please go back and adjust the amount to proceed.
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
                    <span v-else>
                      {{ type === "withdrawal" ? "Bridge now" : "Send now" }}
                    </span>
                  </transition>
                </CommonButton>
                <TransactionButtonUnderlineConfirmTransaction :opened="transactionStatus === 'waiting-for-signature'" />
              </template>
            </template>
          </TransactionFooter>
        </template>
      </form>
    </div>
    <div class="mt-6 flex flex-col gap-block-gap" v-else>
      <CommonCardWithLineButtons v-for="(item, index) in thirdChainMethods" :key="index" class="relative">
        <DestinationItem v-bind="item.props">
          <template #image v-if="item.icon">
            <DestinationIconContainer>
              <component :is="item.icon" aria-hidden="true" />
            </DestinationIconContainer>
          </template>
        </DestinationItem>
        <ArrowTopRightOnSquareIcon
          class="transaction-hash-button-icon absolute right-8 top-11 w-6 text-slate-400"
          aria-hidden="true"
        />
      </CommonCardWithLineButtons>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";

import {
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LockClosedIcon,
} from "@heroicons/vue/24/outline";
import { useRouteQuery } from "@vueuse/router";
import { BigNumber } from "ethers";
import { isAddress } from "ethers/lib/utils";
import { storeToRefs } from "pinia";

import useAllowance from "@/composables/transaction/useAllowance";
import useMergeToken from "@/composables/transaction/useMergeToken";
import useInterval from "@/composables/useInterval";
import useNetworks from "@/composables/useNetworks";
import useFee from "@/composables/zksync/useFee";
import useTransaction, { isWithdrawalManualFinalizationRequired } from "@/composables/zksync/useTransaction";

import type { FeeEstimationParams } from "@/composables/zksync/useFee";
import type { TransactionDestination } from "@/store/destinations";
import type { TransactionInfo } from "@/store/zksync/transactionStatus";
import type { Token, TokenAmount } from "@/types";
import type { BigNumberish } from "ethers";
import type { PropType } from "vue";
import type { FunctionalComponent } from "vue";

import { useRoute, useRouter } from "#app";
import { customBridgeTokens } from "@/data/customBridgeTokens";
import { useDestinationsStore } from "@/store/destinations";
import { useNetworkStore } from "@/store/network";
import { useOnboardStore } from "@/store/onboard";
import { usePreferencesStore } from "@/store/preferences";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import { useZkSyncTokensStore } from "@/store/zksync/tokens";
import { useZkSyncTransactionStatusStore } from "@/store/zksync/transactionStatus";
import { useZkSyncTransfersHistoryStore } from "@/store/zksync/transfersHistory";
import { useZkSyncWalletStore } from "@/store/zksync/wallet";
import { ETH_TOKEN, isMergeToken, isSupportedMergeToken } from "@/utils/constants";
import { ZKSYNC_WITHDRAWAL_DELAY } from "@/utils/doc-links";
import { checksumAddress, decimalToBigNumber, formatRawTokenPrice, parseTokenAmount } from "@/utils/formatters";
import { calculateFee, getEstimateWithdrawalDelayDays } from "@/utils/helpers";
import { silentRouterChange } from "@/utils/helpers";
import { TransitionAlertScaleInOutTransition, TransitionOpacity } from "@/utils/transitions";
import TransferSubmitted from "@/views/transactions/TransferSubmitted.vue";
import WithdrawalSubmitted from "@/views/transactions/WithdrawalSubmitted.vue";
import { ETH_ADDRESS } from "~/zksync-web3-nova/src/utils";
const showBridge = ref(true);
const chainList = [
  {
    name: "zkJump",
    logo: "zkJump.svg",
    url: "https://zkjump.io/app",
    description: "Bridge your $ZKL from Nova to Ethereum in minutes",
  },
  {
    name: "Orbiter Finance",
    logo: "orbiter.svg",
    url: "https://www.orbiter.finance/?source=zkLink%20Nova&dest=Ethereum&token=ETH",
    description: "https://www.orbiter.finance/",
  },
  {
    name: "Meson Finance",
    description: "https://meson.fi/",
    logo: "Meson.svg",
    bannerImg: "Meson.jpg",
    type: "Infra",
    url: "https://meson.fi/",
    tiwwerUrl: "https://twitter.com/mesonfi",
    discordUrl: "https://discord.com/invite/meson",
  },
  {
    name: "Symbiosis",
    description: "https://symbiosis.finance/",
    logo: "Symbiosys.svg",
    bannerImg: "Symbiosys.jpg",
    type: "Defi",
    url: "https://symbiosis.finance/",
    tiwwerUrl: "https://twitter.com/symbiosis_fi",
    discordUrl: "https://discord.com/invite/YHgDSJ42eG",
  },
  {
    name: "Owlto Finance",
    description: "https://owlto.finance/",
    logo: "owlto.svg",
    bannerImg: "owlto.jpeg",
    type: "Infra",
    url: "https://owlto.finance/",
    tiwwerUrl: "https://twitter.com/Owlto_Finance",
    discordUrl: "https://discord.com/invite/owlto",
    status: "Live",
  },
];
const thirdChainMethods = computed(() => {
  const methods: { props: Record<string, unknown>; icon?: FunctionalComponent }[] = [];
  chainList.map((i) => {
    const obj = {
      props: {
        iconUrl: `/img/${i.logo}`,
        label: i.name,
        description: i.description,
        as: "a",
        target: "_blank",
        href: i.url,
      },
    };
    methods.push(obj);
  });
  return methods;
});
const props = defineProps({
  type: {
    type: String as PropType<FeeEstimationParams["type"]>,
    required: true,
  },
});

const { selectedNetwork } = storeToRefs(useNetworkStore());
const route = useRoute();
const router = useRouter();
const onboardStore = useOnboardStore();
const walletStore = useZkSyncWalletStore();
const tokensStore = useZkSyncTokensStore();
const providerStore = useZkSyncProviderStore();
const { account, isConnected } = storeToRefs(onboardStore);
const { eraNetwork } = storeToRefs(providerStore);
const { destinations } = storeToRefs(useDestinationsStore());
const { tokens, tokensRequestInProgress, tokensRequestError } = storeToRefs(tokensStore);
const { balance, balanceInProgress, balanceError } = storeToRefs(walletStore);
const { isCustomNode } = useNetworks();

const toNetworkModalOpened = ref(false);
const toNetworkSelected = (networkKey?: string) => {
  if (destinations.value.era.key === networkKey) {
    router.replace({ name: "index", query: route.query });
  }
};
const fromNetworkModalOpened = ref(false);
const fromNetworkSelected = (networkKey?: string) => {
  if (destinations.value.arbitrum.key === networkKey) {
    router.replace({ name: "index", query: route.query });
  }
};

const step = ref<"form" | "withdrawal-finalization-warning" | "confirm" | "submitted">("form");
const destination = computed(() => (props.type === "transfer" ? destinations.value.nova : destinations.value.arbitrum));

const displayEstimateWithdrawalDelayDays = getEstimateWithdrawalDelayDays(Date.now());

const availableTokens = computed(() => {
  if (!tokens.value) return [];
  if (props.type === "withdrawal") {
    return Object.values(tokens.value).filter((e) => {
      if (isSupportedMergeToken(e.address, selectedNetwork.value.key)) {
        return true;
      }
      if (!e.l1Address) {
        return false;
      }
      if (selectedNetwork.value.key === "mantle" && e.l1Address === ETH_ADDRESS) {
        return false;
      } else if (e.l1Address === ETH_ADDRESS) {
        return true;
      }
      if (e.networkKey === eraNetwork.value.key) {
        return true;
      }
      return false;
    });
  }
  return Object.values(tokens.value);
});
console.log("availableTokens: ", availableTokens);
const availableBalances = computed(() => {
  if (props.type === "withdrawal") {
    if (!tokens.value) return [];
    return balance.value.filter((e) => {
      if (isSupportedMergeToken(e.address, selectedNetwork.value.key)) {
        return true;
      }
      if (!e.l1Address) {
        return false;
      }
      if (selectedNetwork.value.key === "mantle" && e.l1Address === ETH_ADDRESS) {
        return false;
      } else if (e.l1Address === ETH_ADDRESS) {
        return true;
      }
      if (e.networkKey === eraNetwork.value.key) {
        return true;
      }
      return false;
    });
  }
  return balance.value;
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
  return tokenWithHighestBalancePrice[0] ?? undefined;
});
const defaultToken = computed(() => availableTokens.value?.[0] ?? undefined);
const selectedTokenAddress = ref<string | undefined>(
  route.query.tokenAddress ??
    routeTokenAddress.value ??
    tokenWithHighestBalancePrice.value?.address ??
    defaultToken.value?.address
);
const selectedToken = computed<Token | undefined>(() => {
  if (!tokens.value) {
    return undefined;
  }
  if (!selectedTokenAddress.value) {
    if (!selectedNetwork.value.isEthGasToken && defaultToken.value?.l1Address === ETH_ADDRESS) {
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

const tokenCustomBridge = computed(() => {
  if (props.type !== "withdrawal" && selectedToken.value) {
    return undefined;
  }
  return customBridgeTokens.find(
    (e) => eraNetwork.value.l1Network?.id === e.chainId && e.l1Address === selectedToken.value?.l1Address
  );
});
const amountInputTokenAddress = computed({
  get: () => selectedToken.value?.address,
  set: (address) => {
    selectedTokenAddress.value = address;
  },
});
const tokenBalance = computed<BigNumberish | undefined>(() => {
  return balance.value.find((e) => e.address === selectedToken.value?.address)?.amount;
});
const selectedTokenZeroBalance = computed(() => {
  if (!tokenBalance.value) {
    return true;
  }
  return BigNumber.from(tokenBalance.value).isZero();
});

const unsubscribe = onboardStore.subscribeOnAccountChange(() => {
  step.value = "form";
});

const {
  gasLimit,
  gasPrice,
  result: fee,
  inProgress: feeInProgress,
  error: feeError,
  feeToken,
  enoughBalanceToCoverFee,
  estimateFee,
  resetFee,
} = useFee(providerStore.requestProvider, tokens, balance);

const queryAddress = useRouteQuery<string | undefined>("address", undefined, {
  transform: String,
  mode: "replace",
});
const address = ref((queryAddress.value !== "undefined" && queryAddress.value) || "");
const isAddressInputValid = computed(() => {
  if (address.value) {
    return isAddress(address.value);
  }
  if (props.type === "withdrawal") {
    return true; // Own address by default
  }
  return false;
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
const enoughBalanceForTransaction = computed(() => {
  if (!fee.value || !selectedToken.value || !tokenBalance.value) {
    return true;
  }
  const totalToPay = totalComputeAmount.value.add(
    selectedToken.value.address === feeToken.value?.address ? fee.value : "0"
  );
  return BigNumber.from(tokenBalance.value).gte(totalToPay);
});

const isMergeTokenSelected = computed(() => {
  return isMergeToken(selectedToken.value?.address ?? "");
});

const mergeTokenL2Address = computed(() => {
  if (isMergeTokenSelected.value) {
    const token = availableTokens.value?.find(
      (item) => item.symbol === selectedToken.value?.symbol && item.networkKey === selectedNetwork.value.key
    );
    if (token) {
      return token?.l2Address;
    }
  }
  return undefined;
});

const {
  result: mergeTokenInfo,
  reloadMergeTokenInfo,
  inProgress: mergeTokenInfoInProgress,
} = useMergeToken(mergeTokenL2Address);

const mergeTokenWithdrawalLimitExceeds = computed(() => {
  try {
    return isMergeTokenSelected.value && totalComputeAmount.value.gt(mergeTokenInfo.value?.balance ?? 0n);
  } catch (e) {
    // may throw exception when amount exceeds decimals
    return false;
  }
});

const mergeTokenLockedBalance = computed(() => {
  if (!mergeTokenInfo.value || !selectedToken.value) {
    return undefined;
  }
  return parseTokenAmount(mergeTokenInfo.value?.balance, selectedToken.value.decimals);
});

const transaction = computed<
  | {
      type: FeeEstimationParams["type"];
      token: TokenAmount;
      from: { address: string; destination: TransactionDestination };
      to: { address: string; destination: TransactionDestination };
    }
  | undefined
>(() => {
  const toAddress = isAddress(address.value) ? address.value : account.value.address;
  if (!toAddress || !selectedToken.value) {
    return undefined;
  }
  let tokenAddress = mergeTokenL2Address.value ? mergeTokenL2Address.value : selectedToken.value.address;
  return {
    type: props.type,
    token: {
      ...selectedToken.value!,
      address: tokenAddress,
      amount: totalComputeAmount.value.toString(),
    },
    from: {
      address: account.value.address!,
      destination: destinations.value.era,
    },
    to: {
      address: toAddress,
      destination: destination.value,
    },
  };
});

const withdrawalManualFinalizationRequired = computed(() => {
  if (!transaction.value) return false;
  return (
    props.type === "withdrawal" &&
    isWithdrawalManualFinalizationRequired(transaction.value.token, eraNetwork.value.l1Network?.id || -1)
  );
});

const getPublicClient = () => onboardStore.getPublicClient(selectedNetwork.value.id);
const getWallet = () => onboardStore.getWallet(selectedNetwork.value.id);
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
  async () => (await providerStore.requestProvider().getDefaultBridgeAddresses()).erc20L2,
  getWallet,
  getPublicClient
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

const feeLoading = computed(() => feeInProgress.value || (!fee.value && balanceInProgress.value));
const mergeTokenAllowanceEnough = computed(() => {
  return (
    isMergeTokenSelected.value &&
    allowance.value &&
    !allowance.value.isZero() &&
    allowance.value.gte(totalComputeAmount.value)
  );
});

const estimate = async () => {
  // estimation fails when token balance is 0
  if (
    isMergeTokenSelected.value ||
    !transaction.value?.from.address ||
    !transaction.value?.to.address ||
    !selectedToken.value ||
    !tokenBalance.value ||
    selectedTokenZeroBalance.value
  ) {
    return;
  }
  await estimateFee({
    type: props.type,
    from: transaction.value.from.address,
    to: transaction.value.to.address,
    tokenAddress: transaction.value.token.address,
    isMergeToken: isMergeTokenSelected.value,
  });
};

const estiamteForMergeToken = async () => {
  if (
    !transaction.value?.from.address ||
    !transaction.value?.to.address ||
    !tokenBalance.value ||
    selectedTokenZeroBalance.value
  ) {
    return;
  }
  await estimateFee({
    type: props.type,
    from: transaction.value.from.address,
    to: transaction.value.to.address,
    tokenAddress: transaction.value.token.address,
    isMergeToken: isMergeTokenSelected.value,
  });
};
watch(
  [() => selectedToken.value?.address, () => selectedTokenZeroBalance.value],
  () => {
    resetFee();
    estimate();
  },
  { immediate: true }
);

watch(
  [() => mergeTokenAllowanceEnough.value],
  () => {
    if (mergeTokenAllowanceEnough.value) {
      resetFee();
      estiamteForMergeToken();
    }
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
  if (mergeTokenWithdrawalLimitExceeds.value) return true;
  if ((allowanceRequestInProgress.value && !allowance.value) || allowanceRequestError.value) return true;
  if (
    !isAddressInputValid.value ||
    !transaction.value ||
    !enoughBalanceToCoverFee.value ||
    !enoughBalanceForTransaction.value ||
    !!amountError.value ||
    BigNumber.from(transaction.value.token.amount).isZero()
  ) {
    return true;
  }
  if (!enoughAllowance.value) return false;
  if (feeLoading.value || !fee.value) return true;
  return false;
});
const buttonContinue = () => {
  if (continueButtonDisabled.value) {
    return;
  }
  if (mergeTokenWithdrawalLimitExceeds.value) {
    return;
  }
  if (step.value === "form") {
    if (withdrawalManualFinalizationRequired.value) {
      step.value = "withdrawal-finalization-warning";
      return;
    } else {
      step.value = "confirm";
    }
  } else if (step.value === "withdrawal-finalization-warning") {
    step.value = "confirm";
  } else if (step.value === "confirm") {
    makeTransaction();
  }
};

/* Transaction signing and submitting */
const transfersHistoryStore = useZkSyncTransfersHistoryStore();
const { previousTransactionAddress } = storeToRefs(usePreferencesStore());
const {
  status: transactionStatus,
  error: transactionError,
  commitTransaction,
} = useTransaction(walletStore.getSigner, providerStore.requestProvider);
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
      type: props.type,
      to: transaction.value!.to.address,
      tokenAddress: transaction.value!.token.address,
      amount: transaction.value!.token.amount,
      isMergeToken: isMergeTokenSelected.value,
    },
    {
      gasLimit: gasLimit.value!,
      gasPrice: gasPrice.value!,
    }
  );

  if (transactionStatus.value === "done") {
    step.value = "submitted";
    previousTransactionAddress.value = transaction.value!.to.address;
    reloadMergeTokenInfo();
  }

  if (tx) {
    const fee = calculateFee(gasLimit.value!, gasPrice.value!);
    walletStore.deductBalance(feeToken.value!.address, fee);
    walletStore.deductBalance(transaction.value!.token.address, transaction.value!.token.amount);
    transactionInfo.value = {
      type: transaction.value!.type,
      transactionHash: tx.hash,
      timestamp: new Date().toISOString(),
      token: transaction.value!.token,
      from: transaction.value!.from,
      to: transaction.value!.to,
      fromChainKey: selectedNetwork.value.key,
      info: {
        expectedCompleteTimestamp:
          transaction.value?.type === "withdrawal"
            ? new Date(
                new Date().getTime() + getEstimateWithdrawalDelayDays(Date.now()) * 24 * 60 * 60 * 1000
              ).toISOString()
            : undefined,
        completed: false,
      },
      gateway: eraNetwork.value.l1Gateway as string,
    };
    saveTransaction(transactionInfo.value);
    silentRouterChange(
      router.resolve({
        name: "transaction-hash",
        params: { hash: transactionInfo.value.transactionHash },
        query: { network: eraNetwork.value.key },
      }).href
    );
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for balances to be updated on API side
    await fetchBalances(true);
    waitForCompletion(transactionInfo.value)
      .then(async (completedTransaction) => {
        transactionInfo.value = completedTransaction;
        setTimeout(() => {
          transfersHistoryStore.reloadRecentTransfers().catch(() => undefined);
          walletStore.requestBalance({ force: true }).catch(() => undefined);
        }, 2000);
      })
      .catch((err) => {
        transactionError.value = err as Error;
        transactionStatus.value = "not-started";
      });
  }
};

const resetForm = () => {
  address.value = "";
  amount.value = "";
  step.value = "form";
  transactionStatus.value = "not-started";
  transactionInfo.value = undefined;
  silentRouterChange((route as unknown as { href: string }).href);
};

const fetchBalances = async (force = false) => {
  tokensStore.requestTokens();
  if (!isConnected.value) return;

  await walletStore.requestBalance({ force }).then(() => {
    if (!selectedToken.value) {
      selectedTokenAddress.value = tokenWithHighestBalancePrice.value?.address;
    }
  });
};
fetchBalances();

const unsubscribeFetchBalance = onboardStore.subscribeOnAccountChange((newAddress) => {
  if (!newAddress) return;
  fetchBalances();
  resetFee();
  estimate();
});

onBeforeUnmount(() => {
  unsubscribe();
  unsubscribeFetchBalance();
});
</script>

<style lang="scss" scoped>
.warnBox1 {
  display: flex;
  a {
    color: #0bc48f;
  }
}
.warnNote {
  color: #f29914;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
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
.tab {
  width: 100%;
  border-radius: 64px;
  background: #262b33;
  padding: 8px;
  display: flex;
  margin-bottom: 16px;
  .box {
    border-radius: 64px;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 50%;
    padding: 7px 0;
    cursor: pointer;
    .name {
      color: #fff;
      font-size: 16px;
      font-style: normal;
      font-weight: 700;
      line-height: normal;
    }
    .time {
      color: #9da3ae;
      text-align: center;
      font-size: 12px;
      font-style: normal;
      font-weight: 400;
      line-height: normal;
    }
    @media screen and (max-width: 600px) {
      .name {
        font-size: 12px;
      }
      .time {
        font-size: 10px;
      }
    }
  }
  .box:focus {
    background: transparent;
  }
  .active {
    background: #3d424d;
  }
}
</style>
