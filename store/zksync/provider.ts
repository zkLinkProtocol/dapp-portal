import { Provider } from "@/zksync-web3-nova/src";

import { useNetworkStore } from "@/store/network";
import useNetworks from "@/composables/useNetworks";

export const useZkSyncProviderStore = defineStore("zkSyncProvider", () => {
  const { selectedNetwork } = storeToRefs(useNetworkStore());
  const { primaryNetwork } = useNetworks();
  let provider: Provider | undefined;
  let primaryProvider: Provider | undefined;
  const requestProvider = () => {
    const eraNetwork = selectedNetwork.value;
    if (!provider) {
      provider = new Provider(eraNetwork.rpcUrl);
    }
    //if provider.networkKey != eraNetwork.key
    provider.setContractAddresses(eraNetwork.key, {
      mainContract: eraNetwork.mainContract,
      erc20BridgeL1: eraNetwork.erc20BridgeL1,
      erc20BridgeL2: eraNetwork.erc20BridgeL2,
      l1Gateway: eraNetwork.l1Gateway,
      wethContract: eraNetwork.wethContract
    });
    provider.setIsEthGasToken(eraNetwork.isEthGasToken ?? true);
    return provider;
  };

  const requestPrimaryProvider = () => {
    if (!primaryProvider) {
      primaryProvider = new Provider(primaryNetwork.rpcUrl);
    }
    primaryProvider.setContractAddresses(primaryNetwork.key, {
      mainContract: primaryNetwork.mainContract,
      erc20BridgeL1: primaryNetwork.erc20BridgeL1,
      erc20BridgeL2: primaryNetwork.erc20BridgeL2,
      l1Gateway: primaryNetwork.l1Gateway,
      wethContract: primaryNetwork.wethContract
    });
    primaryProvider.setIsEthGasToken(primaryNetwork.isEthGasToken ?? true);
    return primaryProvider;
  };

  return {
    eraNetwork: selectedNetwork,

    requestProvider,
    requestPrimaryProvider,

    blockExplorerUrl: computed(() => selectedNetwork.value.blockExplorerUrl),
  };
});
