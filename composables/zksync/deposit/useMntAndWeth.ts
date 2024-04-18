import { storeToRefs } from "pinia";

import type { Token } from "@/types";

import { useNetworkStore } from "@/store/network";

export default (selectedToken: Ref<Token | undefined>) => {
  const { zkSyncNetworks } = useNetworks();
  const { selectedNetwork } = storeToRefs(useNetworkStore());
  const isMNTSelected = computed(() => {
    return selectedToken.value?.symbol === "MNT" && selectedNetwork.value.key === "mantle";
  });

  const isWETHSelected = computed(() => {
    let weths: string[] = [];
    zkSyncNetworks.forEach((item) => {
      if (item.wethContract) {
        weths = weths.concat(item.wethContract.map((e) => e.toLowerCase()));
      }
    });
  
    return (
      selectedNetwork.value?.key !== "mantle" &&
      selectedToken.value?.address &&
      weths.some((item) => item === selectedToken.value?.address.toLowerCase())
    );
  });

  const isMNTOrWETH = computed(() => {
    console.log("isMNTOrWETH", isMNTSelected.value || isWETHSelected.value);
    return isMNTSelected.value || isWETHSelected.value;
  });

  const warpTipsTitle = computed(() => {
    return isMNTSelected.value ? "Wrap your MNT" : isWETHSelected.value ? "Unwrap your WETH" : "";
  });

  const warpTipsDesc = computed(() => {
    return isMNTSelected.value
      ? "The zkLink Nova Portal doesn't currently support depositing MNT. You could convert it to WMNT before using the bridge."
      : isWETHSelected.value
      ? "The zkLink Nova Portal doesn't currently encourage depositing WETH. You could convert it to ETH before using the bridge."
      : "";
  });

  const wrapBtnText = computed(() => {
    return isMNTSelected.value ? "Wrap" : isWETHSelected.value ? "Unwrap" : "";
  });

  return {
    isMNTSelected,
    isWETHSelected,
    isMNTOrWETH,
    warpTipsTitle,
    warpTipsDesc,
    wrapBtnText,
  };
};
