import { injected, safe, walletConnect } from "@wagmi/connectors";
import {
  createConfig,
  getAccount,
  getConnections,
  getConnectors,
  getPublicClient,
  getWalletClient,
  http,
  reconnect,
  switchChain as switchWalletNetwork,
  disconnect as walletDisconnect,
  watchAccount,
} from "@wagmi/core";
import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi";
import { type Chain, createClient } from "viem";

import useColorMode from "@/composables/useColorMode";
import useNetworks from "@/composables/useNetworks";
import useObservable from "@/composables/useObservable";

import type { ZkSyncNetwork } from "@/data/networks";
import type { Connector } from "@wagmi/core";

import { useRuntimeConfig } from "#imports";
import { confirmedSupportedWallets, disabledWallets } from "@/data/wallets";
import { useNetworkStore } from "@/store/network";

const isMobile = () => window.innerWidth < 800; // simple way to detect mobile device
const isBinanceWeb3App = () => window.ethereum?.isBinance;
export const useOnboardStore = defineStore("onboard", () => {
  const { zkSyncNetworks } = useNetworks();
  const runtimeConfig = useRuntimeConfig();
  const createZkLinkNova = (network: ZkSyncNetwork) => {
    return {
      id: network.id,
      name: "zkLink Nova",
      network: "zklink-nova",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: [network.rpcUrl], webSocket: ["wss://rpc.zklink.io"] },
        public: { http: [network.rpcUrl], webSocket: ["wss://rpc.zklink.io"] },
      },
      blockExplorers: {
        default: { name: "zkLink Nova Explorer", url: "https://explorer.zklink.io" },
      },
      contracts: {
        multicall3: {
          address:
            runtimeConfig.public.nodeType === "nexus-goerli"
              ? "0x6F02406FC2495171dC03c7b6D80c2f327320C3f6"
              : "0x825267E0fA5CAe92F98540828a54198dcB3Eaeb5",
        },
      },
    };
  };
  const getAllChains = () => {
    const chains: Chain[] = [];
    const addUniqueChain = (chain: Chain) => {
      if (!chains.find((existingChain) => existingChain.id === chain.id)) {
        chains.push(chain);
      }
    };
    for (const network of zkSyncNetworks) {
      if (network.l1Network) {
        addUniqueChain(network.l1Network);
      }
    }
    addUniqueChain(createZkLinkNova(zkSyncNetworks[0]));
    return chains;
  };

  const extendedChains = [...getAllChains()];

  const { public: env } = useRuntimeConfig();
  const { selectedColorMode } = useColorMode();
  const { selectedNetwork, l1Network } = storeToRefs(useNetworkStore());

  const metadata = {
    name: "zkLink Nova Portal",
    description: "zkLink Nova Portal - view balances, transfer and bridge tokens",
    url: "https://portal.zklink.io",
    icons: ["https://portal.zklink.io/img/favicon.png"],
  };
  console.log("extendedChains", extendedChains);
  console.log("selectedNetwork", selectedNetwork.value);
  const connectors = [
    injected(),
    safe({
      allowedDomains: [
        /app.safe.global$/,
        /safe.zklink.io$/,
        /safe.manta.network$/,
        /multisig.mantle.xyz$/,
        /safe.linea.build$/,
        /blast-safe.io$/,
      ],
      debug: true,
    }),
    walletConnect({ projectId: env.walletConnectProjectID, showQrModal: false, metadata }),
  ];
  if (isBinanceWeb3App()) {
    connectors.unshift(
      injected({
        target() {
          return {
            id: "Binance Web3 Wallet",
            name: "Binance Web3 Wallet",
            provider: window.ethereum,
            icon: "/img-binance-web3-wallet.png",
          };
        },
      })
    );
  }
  const wagmiConfig = createConfig({
    chains: extendedChains,
    projectId: env.walletConnectProjectID,
    metadata,
    connectors: connectors,
    client: ({ chain }) => {
      return createClient({ chain, transport: http() });
    },
  });
  reconnect(wagmiConfig);

  const account = ref(getAccount(wagmiConfig));
  const network = ref(getAccount(wagmiConfig));
  const connectingWalletError = ref<string | undefined>();
  const connectorName = ref<string | undefined>(); // ref(wagmiConfig.connector?.name);
  const walletName = ref<string | undefined>();
  const wagmiConnector = ref<Connector | undefined>();
  const walletNotSupported = computed(() => {
    if (!walletName.value || !wagmiConnector) return false;
    console.log("walletName.value", walletName.value);
    console.log("wagmiConfig.connector", wagmiConnector);
    console.log("confirmedSupportedWallets", confirmedSupportedWallets);
    const isWalletNotSupported = !confirmedSupportedWallets.find(
      (wallet) => wallet.walletName === walletName.value && wallet.type === wagmiConnector?.value?.type
    );
    console.log("isWalletNotSupported", isWalletNotSupported);
    return isWalletNotSupported;
  });
  const identifyWalletName = async () => {
    const connectors = getConnectors(wagmiConfig);
    console.log("connectors: ", connectors);

    // const client = await getWalletClient(wagmiConfig);
    // console.log("client: ", client);
    const connections = getConnections(wagmiConfig);
    console.log("connections: ", connections);
    const connector = connections?.[0]?.connector;
    wagmiConnector.value = connector;
    connectorName.value = connector?.name;
    let name = "";
    if (connections?.[0]?.connector?.getProvider && typeof connections?.[0]?.connector?.getProvider === "function") {
      const provider: unknown = await connections?.[0]?.connector.getProvider();
      name = provider?.session?.peer?.metadata?.name;
    } else {
      name = connector?.name;
    }

    if (!name && connector?.name !== "WalletConnect") {
      walletName.value = connector?.name.replace(/ Wallet$/, "").trim();
      console.log("wagmiConfig.connector?.name------------>", connector?.name);
    } else {
      walletName.value = name?.replace(/ Wallet$/, "").trim();
      console.log("name--------------->", name);
    }

    if (walletName.value?.includes("Binance")) {
      walletName.value = "Binance Web3 Wallet";
    }

    if (walletName.value && connector) {
      const isWalletDisabled = !!disabledWallets.find(
        (wallet) => wallet.walletName === walletName.value && wallet.type === connector?.type
      );
      if (isWalletDisabled) throw new Error(`Unfortunately ${walletName.value} wallet is not supported at the moment!`);
    }
  };
  identifyWalletName();

  const autoConnectInBinanceWeb3 = async () => {
    const connectors = getConnectors(wagmiConfig);
    const injected = connectors.find((item) => item.id === "injected");
    if (injected && !account.value?.address && window.innerWidth < 800) {
      await injected.connect();
      reconnect(wagmiConfig);
    }
  };

  const BinanceWalletId = "8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4";
  const excludeWalletIds = ["bc949c5d968ae81310268bf9193f9c9fb7bb4e1283e1284af8f2bd4992535fd6"];
  if (isMobile() && isBinanceWeb3App()) {
    excludeWalletIds.push(BinanceWalletId);
  }
  const featuredWalletIds = [
    // "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369",rainbow
    "971e689d0a5be527bac79629b4ee9b925e82208e5168b733496a09c0faed0709", // okx wallet
    // "8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4", // binance web3 wallet
    "ad2eff108bf828a39e5cb41331d95861c9cc516aede9cb6a95d75d98c206e204", // Gate.io Wallet
    "c7708575a2c3c9e6a8ab493d56cdcc56748f03956051d021b8cd8d697d9a3fd2", // fox wallet
    // "aba1f652e61fd536e8a7a5cd5e0319c9047c435ef8f7e907717361ff33bb3588",
    // "38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662",//bitget
  ];
  if (!isBinanceWeb3App()) {
    featuredWalletIds.unshift(BinanceWalletId);
  }

  const web3modal = createWeb3Modal({
    wagmiConfig,
    projectId: env.walletConnectProjectID,
    excludeWalletIds,
    featuredWalletIds,
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
        console.log("updatedAccount", updatedAccount.address);
        account.value = updatedAccount;
        network.value = updatedAccount;
        connectorName.value = wagmiConnector?.value?.name;
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
  //   console.log("updatedNetwork", updatedNetwork.chain?.id);
  //   const currentSelectChain = updatedNetwork.chains.find((chain) => chain.id === selectedNetwork.value.l1Network?.id);
  //   if (currentSelectChain && wagmiConfig.connector?.id === "walletConnect") {
  //     console.log("currentSelectChain", currentSelectChain.id);
  //     updatedNetwork.chain = currentSelectChain;
  //     console.log("updatedNetwork after++", updatedNetwork.chain?.id);
  //   }
  //   network.value = updatedNetwork;
  // });
  // watch(selectedColorMode, (colorMode) => {
  //   web3modal.setThemeMode(colorMode);
  // });

  const openModal = () => web3modal.open();
  const disconnect = () => {
    walletDisconnect(wagmiConfig);
  };

  const isCorrectNetworkSet = computed(() => {
    const walletNetworkId = network.value.chain?.id;
    return walletNetworkId === l1Network.value?.id;
  });
  const switchNetworkById = async (chainId: number, networkName?: string) => {
    try {
      return await switchWalletNetwork(wagmiConfig, { chainId });
    } catch (err) {
      if (err instanceof Error && err.message.includes("does not support programmatic chain switching")) {
        throw new Error(`Please switch network manually to "${networkName}" in your ${walletName.value} wallet`);
      }
      throw err;
    }
  };
  const {
    inProgress: switchingNetworkInProgress,
    error: switchingNetworkError,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execute: switchNetwork,
  } = usePromise(
    async () => {
      if (!l1Network.value) throw new Error(`L1 network is not available on ${selectedNetwork.value.name}`);
      return await switchNetworkById(l1Network.value.id);
    },
    { cache: false }
  );
  const setCorrectNetwork = async (id: number) => {
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
    () => network.value.chain?.id,
    () => {
      notifyOnNetworkChange(network.value.chain?.id);
    }
  );

  const getWallet = async (chainId: number | undefined = l1Network.value?.id) => {
    console.log("getWallet chainId", chainId);
    //TODO check if chainId is available in the wallet, if not, catch the error and show a message to the user, and let user can to retry manually
    const client = await getWalletClient(wagmiConfig, chainId ? { chainId } : undefined);
    if (!client) throw new Error("Wallet is not available");

    return client;
  };

  const config = ref(wagmiConfig);
  return {
    wagmiConfig: computed(() => config.value),
    account: computed(() => account.value),
    isConnected: computed(() => !!account.value.address),
    network: computed(() => network.value),
    isConnectingWallet: computed(() => {
      console.log(
        "account.value",
        account.value.address,
        account.value.open,
        account.value.isConnecting,
        account.value.isReconnecting
      );
      return account.value.isReconnecting || account.value.isConnecting;
    }),
    connectingWalletError,
    connectorName,
    walletName: computed(() => walletName.value),
    walletNotSupported,
    openModal,
    disconnect,

    isCorrectNetworkSet,
    switchingNetworkInProgress,
    switchingNetworkError,
    setCorrectNetwork,
    switchNetworkById,

    getWallet,
    getPublicClient: (chainId?: number) => {
      if (!l1Network.value) throw new Error(`L1 network is not available on ${selectedNetwork.value.name}`);
      return getPublicClient(wagmiConfig, { chainId: chainId || l1Network.value?.id });
    },
    autoConnectInBinanceWeb3,
    subscribeOnAccountChange,
    subscribeOnNetworkChange,
  };
});
