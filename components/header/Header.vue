<template>
  <div>
    <header class="header">
      <HeaderMobileMainNavigation v-model:opened="mobileMainNavigationOpened" />
      <HeaderMobileAccountNavigation v-model:opened="mobileAccountNavigationOpened" />
      <div class="logo-container">
        <NuxtLink to="https://zklink.io/" target="_blank">
          <img v-if="selectedColorMode === 'dark'" src="/img/logo.png" alt="" class="logo-icon" />
          <img v-else src="/img/logoWhite.png" alt="" class="logo-icon" />
          <!-- <IconsZkSync class="logo-icon" /> -->
        </NuxtLink>
        <span class="beta-label" v-if="!isMainnet">Testnet</span>
      </div>
      <div class="links-container">
        <NuxtLink
          class="link-item"
          :to="{ name: 'index' }"
          :class="{ 'router-link-exact-active': routes.bridge.includes(route.name?.toString() || '') }"
        >
          <ArrowsUpDownIcon class="link-icon" aria-hidden="true" />
          Deposit
        </NuxtLink>
        <NuxtLink
          class="link-item"
          :to="{ name: 'withdraw' }"
          :class="{ 'router-link-exact-active': routes.withdraw.includes(route.name?.toString() || '') }"
        >
          <ArrowsUpDownIcon class="link-icon" aria-hidden="true" />
          Withdraw
        </NuxtLink>
        <NuxtLink
          v-if="isShowFaucet"
          class="link-item"
          :to="{ name: 'faucet' }"
          :class="{ 'router-link-exact-active': routes.faucet.includes(route.name?.toString() || '') }"
        >
          <IconsFaucet class="link-icon" aria-hidden="true" />
          Faucet
        </NuxtLink>
        <NuxtLink
          class="link-item"
          :to="{ name: 'assets' }"
          :class="{ 'router-link-exact-active': routes.assets.includes(route.name?.toString() || '') }"
        >
          <WalletIcon class="link-icon" aria-hidden="true" />
          Assets
        </NuxtLink>
        <NuxtLink class="link-item" :to="{ name: 'transfers' }">
          <ArrowsRightLeftIcon class="link-icon" aria-hidden="true" />
          History
          <transition v-bind="TransitionOpacity()">
            <CommonBadge v-if="withdrawalsAvailableForClaiming && withdrawalsAvailableForClaiming.length">
              {{ withdrawalsAvailableForClaiming.length }}
            </CommonBadge>
          </transition>
        </NuxtLink>
      </div>
      <div class="right-side">
        <!-- <HeaderNetworkDropdown class="network-dropdown" /> -->
        <CommonButton v-if="!isConnected" variant="primary" @click="onboardStore.openModal()">
          <span class="whitespace-nowrap">Connect wallet</span>
        </CommonButton>
        <template v-else>
          <div class="sm:hidden">
            <HeaderAccountDropdownButton no-chevron @click="mobileAccountNavigationOpened = true" />
          </div>
          <div class="hidden sm:block">
            <HeaderAccountDropdown />
          </div>
        </template>
        <CommonButton class="color-mode-button" @click="switchColorMode()">
          <SunIcon v-if="selectedColorMode === 'dark'" class="h-6 w-6" aria-hidden="true" />
          <MoonIcon v-else class="h-6 w-6" aria-hidden="true" />
        </CommonButton>
        <CommonButton class="hamburger-icon" @click="mobileMainNavigationOpened = true">
          <Bars3Icon class="h-6 w-6" aria-hidden="true" />
          <transition v-bind="TransitionOpacity()">
            <CommonBadge
              v-if="withdrawalsAvailableForClaiming && withdrawalsAvailableForClaiming.length"
              class="action-available-badge"
            >
              {{ withdrawalsAvailableForClaiming.length }}
            </CommonBadge>
          </transition>
        </CommonButton>
      </div>
    </header>
    <!-- <div v-if="route.name === 'index'" class="warning-dec">
      <span>
        <svg
          class="warning-ico"
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M11.6844 1.65886C10.579 -0.552942 7.42277 -0.552954 6.31736 1.65883L0.320351 13.6581C-0.676548 15.6528 0.773957 17.9993 3.00387 17.9993H14.9977C17.2276 17.9993 18.6781 15.6528 17.6813 13.6581L11.6844 1.65886ZM8.00073 5.99927C8.00073 5.44698 8.44845 4.99927 9.00073 4.99927C9.55302 4.99927 10.0007 5.44698 10.0007 5.99927V9.99927C10.0007 10.5516 9.55302 10.9993 9.00073 10.9993C8.44845 10.9993 8.00073 10.5516 8.00073 9.99927V5.99927ZM8.00073 12.9993C8.00073 12.447 8.44845 11.9993 9.00073 11.9993C9.55302 11.9993 10.0007 12.447 10.0007 12.9993C10.0007 13.5516 9.55302 13.9993 9.00073 13.9993C8.44845 13.9993 8.00073 13.5516 8.00073 12.9993Z"
            fill="#F29914"
          />
        </svg>
      </span>
      <div>Note: Withdrawals will be enabled before 04/13/2024</div>
    </div> -->
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { computed } from "vue";

import {
  ArrowsRightLeftIcon,
  ArrowsUpDownIcon,
  Bars3Icon,
  MoonIcon,
  SunIcon,
  WalletIcon,
} from "@heroicons/vue/24/outline";
import { storeToRefs } from "pinia";

import Banner from "./Banner.vue";

import useColorMode from "@/composables/useColorMode";
import useNetworks from "@/composables/useNetworks";

import { useRoute } from "#imports";
import { useOnboardStore } from "@/store/onboard";
import { useZkSyncWithdrawalsStore } from "@/store/zksync/withdrawals";
const { defaultNetwork, isMainnet } = useNetworks();

const route = useRoute();

const routes = {
  bridge: ["index"],
  withdraw: ["withdraw"],
  faucet: ["faucet"],
  assets: ["assets", "balances", "receive-methods", "receive", "send-methods", "send"],
};

const onboardStore = useOnboardStore();
const { isConnected } = storeToRefs(onboardStore);
const { withdrawalsAvailableForClaiming } = storeToRefs(useZkSyncWithdrawalsStore());

const mobileMainNavigationOpened = ref(false);
const mobileAccountNavigationOpened = ref(false);

const { selectedColorMode, switchColorMode } = useColorMode();
const isShowFaucet = computed(() => defaultNetwork.id === 810182);
</script>

<style lang="scss" scoped>
.header {
  @apply z-50 flex w-full items-center gap-2 p-2 sm:gap-10 sm:p-4;

  .logo-container {
    @apply flex w-full flex-shrink items-center gap-2 sm:w-max;
    .logo-icon {
      @apply h-auto w-full max-w-[140px] sm:max-w-[160px];
    }
    .beta-label {
      @apply block rounded-lg bg-neutral-100 p-2 text-xs font-normal uppercase leading-none dark:bg-neutral-900;
    }
  }
  .links-container {
    @apply hidden items-center gap-10 lg:flex;

    .link-item {
      @apply flex items-center gap-1 text-lg text-neutral-600 dark:text-neutral-500;
      &.router-link-exact-active {
        @apply text-black dark:text-white;

        .link-icon {
          @apply text-black dark:text-white;
        }
      }
      &.disabled {
        @apply cursor-not-allowed opacity-75;
      }

      .link-icon {
        @apply h-6 w-6 text-neutral-400 dark:text-neutral-500;
      }
    }
  }
  .right-side {
    @apply ml-auto flex items-center gap-1 sm:gap-3;

    .network-dropdown,
    .color-mode-button {
      @apply hidden xl:block;
    }
    .hamburger-icon {
      @apply relative xl:hidden;

      .action-available-badge {
        @apply absolute -right-1 -top-1 lg:hidden;
      }
    }
  }
}
.warning-dec {
  @apply flex w-full items-center justify-center gap-2 rounded-md bg-[#FFF7E6] p-4  text-base font-bold text-[#F29914] dark:bg-[#47371F];
  .warning-ico {
    width: 18px;
    height: 18px;
  }
}
.banner {
  width: 100%;
  text-align: center;
  a {
    display: inline-block;
    width: 100%;
    min-width: 0px;
    max-width: 700px;
  }
  .bannerImg {
    display: inline-block;
    width: 100%;
    height: 80px;
  }
  .mobileImg {
    display: none;
  }
  @media screen and (max-width: 640px) {
    .bannerImg {
      display: none;
    }
    .mobileImg {
      display: none;
      display: inline-block;
      width: 100%;
      height: 80px;
    }
  }
}
</style>
