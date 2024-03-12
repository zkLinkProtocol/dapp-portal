import {
  getAccount,
  // getNetwork,
  getPublicClient,
  getWalletClient,
  reconnect,
  switchChain as switchWalletNetwork,
  disconnect as walletDisconnect,
  watchAccount,
} from "@wagmi/core";
import { zkSync, zkSyncSepoliaTestnet, zkSyncTestnet } from "@wagmi/core/chains";
// import { WalletConnectConnector } from "@wagmi/core/connectors/walletConnect";
// import { publicProvider } from "@wagmi/core/providers/public";
// import { createWeb3Modal } from "@web3modal/wagmi";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";

import useColorMode from "@/composables/useColorMode";
import useNetworks from "@/composables/useNetworks";
import useObservable from "@/composables/useObservable";

import { chainList } from "@/data/networks";
import type { Chain } from "viem";

import { useRuntimeConfig } from "#imports";
import { getWagmiConfig } from "@/data/wagmi";
import { confirmedSupportedWallets, disabledWallets } from "@/data/wallets";
import { useNetworkStore } from "@/store/network";

export const useOnboardStore = defineStore("onboard", () => {
  const { zkSyncNetworks } = useNetworks();

  const { public: env } = useRuntimeConfig();
  const { selectedColorMode } = useColorMode();
  const { selectedNetwork, l1Network } = storeToRefs(useNetworkStore());

  // const { publicClient } = configureChains(extendedChains, [publicProvider()]);

  // const wagmiConfig = createConfig({
  //   autoConnect: true,
  //   connectors: [
  //     new WalletConnectConnector({
  //       chains: extendedChains,
  //       options: { projectId: env.walletConnectProjectID, showQrModal: false, metadata },
  //     }),
  //     new InjectedConnector({ chains: extendedChains, options: { shimDisconnect: true } }),
  //   ],
  //   publicClient,
  // });

  const wagmiConfig = getWagmiConfig();
  reconnect(wagmiConfig);
  const account = ref(getAccount(wagmiConfig));
  const network = ref(account);

  const connectingWalletError = ref<string | undefined>();
  const connectorName = ref(wagmiConfig.connector?.name);
  const walletName = ref<string | undefined>();
  const walletNotSupported = computed(() => {
    if (!walletName.value || !wagmiConfig.connector) return false;
    const isWalletNotSupported = !confirmedSupportedWallets.find(
      (wallet) => wallet.walletName === walletName.value && wallet.type === wagmiConfig.connector?.id
    );
    return isWalletNotSupported;
  });
  const identifyWalletName = async () => {
    const provider = await wagmiConfig.connector?.getProvider();
    const name = provider?.session?.peer?.metadata?.name;

    if (!name && wagmiConfig.connector?.name !== "WalletConnect") {
      walletName.value = wagmiConfig.connector?.name.replace(/ Wallet$/, "").trim();
    } else {
      walletName.value = name?.replace(/ Wallet$/, "").trim();
    }

    if (walletName.value && wagmiConfig.connector) {
      const isWalletDisabled = !!disabledWallets.find(
        (wallet) => wallet.walletName === walletName.value && wallet.type === wagmiConfig.connector?.id
      );
      if (isWalletDisabled) throw new Error(`Unfortunately ${walletName.value} wallet is not supported at the moment!`);
    }
  };
  identifyWalletName();
  const web3modal = createWeb3Modal({
    wagmiConfig: wagmiConfig,
    projectId: env.walletConnectProjectID,
    // chains: extendedChains,
    excludeWalletIds: ["bc949c5d968ae81310268bf9193f9c9fb7bb4e1283e1284af8f2bd4992535fd6"],
    // featuredWalletIds: [
    //   // "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369",rainbow
    //   "971e689d0a5be527bac79629b4ee9b925e82208e5168b733496a09c0faed0709", // okx wallet
    //   "8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4", // binance web3 wallet
    //   "c7708575a2c3c9e6a8ab493d56cdcc56748f03956051d021b8cd8d697d9a3fd2", // fox wallet
    //   // "38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662",//bitget
    // ],
    // termsConditionsUrl: "https://zksync.io/terms",
    // privacyPolicyUrl: "https://zksync.io/privacy",
    themeMode: selectedColorMode.value,
  });

  watchAccount(wagmiConfig, {
    onChange: async (updatedAccount) => {
      // There is a bug in @wagmi/core@0.10.11 or @web3modal/ethereum@^2.3.7
      // On page update or after using `ethereumClient.disconnect` method
      // the account state is replaced with "connecting" state
      if (updatedAccount.status === "connecting" && !updatedAccount.connector) {
        return;
      }
      try {
        await identifyWalletName();
        account.value = updatedAccount;
        connectorName.value = wagmiConfig.connector?.name;
      } catch (err) {
        disconnect();
        const error = formatError(err as Error);
        if (error) {
          connectingWalletError.value = error.message;
        }
      }
    },
  });
  // watchNetwork((updatedNetwork) => {
  //   network.value = updatedNetwork;
  // });
  watch(selectedColorMode, (colorMode) => {
    web3modal.setThemeMode(colorMode);
  });

  const openModal = () => web3modal.open();
  const disconnect = () => {
    const { connector } = getAccount(wagmiConfig);
    if (!connector) return;
    walletDisconnect(wagmiConfig, { connector });
  };

  const isCorrectNetworkSet = computed(() => {
    const walletNetworkId = network.value.chain?.id;
    return walletNetworkId === l1Network.value?.id;
  });
  const switchNetworkById = async (chainId: number, networkName?: string) => {
    try {
      return await switchWalletNetwork(wagmiConfig, { chainId });
    } catch (err) {
      console.log(err);
      if (err instanceof Error && err.message.includes("does not support programmatic chain switching")) {
        throw new Error(`Please switch network manually to "${networkName}" in your ${walletName.value} wallet`);
      }
      throw err;
    }
  };
  const {
    inProgress: switchingNetworkInProgress,
    error: switchingNetworkError,
    execute: switchNetwork,
  } = usePromise(
    async () => {
      if (!l1Network.value) throw new Error(`L1 network is not available on ${selectedNetwork.value.name}`);
      return await switchNetworkById(l1Network.value.id);
    },
    { cache: false }
  );
  const setCorrectNetwork = async (id: any) => {
    return await switchNetworkById(id).catch(() => undefined);
  };

  const { subscribe: subscribeOnAccountChange, notify: notifyOnAccountChange } = useObservable<string | undefined>();
  watch(
    () => account.value.address,
    () => {
      notifyOnAccountChange(account.value.address);
    }
  );

  const { subscribe: subscribeOnNetworkChange, notify: notifyOnNetworkChange } = useObservable<number | undefined>();
  watch(
    () => account.value.chainId,
    () => {
      notifyOnNetworkChange(network.value.chainId);
    }
  );

  const getWallet = async (chainId: number | undefined = l1Network.value?.id) => {
    const client = await getWalletClient(wagmiConfig, { chainId: chainId || undefined });
    if (!client) throw new Error("Wallet is not available");

    return client;
  };

  return {
    account: computed(() => account.value),
    isConnected: computed(() => !!account.value.address),
    network: computed(() => network.value),
    isConnectingWallet: computed(() => account.value.isReconnecting || account.value.isConnecting),
    connectingWalletError,
    connectorName,
    walletName,
    walletNotSupported,
    openModal,
    disconnect,
    wagmiConfig,
    isCorrectNetworkSet,
    switchingNetworkInProgress,
    switchingNetworkError,
    setCorrectNetwork,
    switchNetworkById,

    getWallet,
    getPublicClient: (chainId: any = "") => {
      if (!l1Network.value) throw new Error(`L1 network is not available on ${selectedNetwork.value.name}`);
      return getPublicClient(wagmiConfig, { chainId: chainId || l1Network.value?.id });
    },

    subscribeOnAccountChange,
    subscribeOnNetworkChange,
  };
});
