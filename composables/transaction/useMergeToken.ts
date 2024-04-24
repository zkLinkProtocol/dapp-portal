import MergeTokenPortal from "@/zksync-web3-nova/abi/MergeTokenPortal.json";

import type { Ref } from "vue";

import { useOnboardStore } from "@/store/onboard";

const nodeType = process.env.NODE_TYPE;

export type SourceTokenInfo = {
  isSupported: boolean;
  isLocked: boolean;
  mergeToken: string;
  balance: bigint;
  depositLimit: bigint;
};
const NOVA_CHAIN_ID = nodeType === "nexus" ? 810180 : 810181;
const MERGE_TOKEN_PORTAL_ADDRESSES =
  nodeType === "nexus" ? "0x83FD59FD58C6A5E6eA449e5400D02803875e1104" : "0x400993142059ddF34636c58Bb066aAD2d21ec273";
export default (tokenL2Address: Ref<string | undefined>) => {
  const onboardStore = useOnboardStore();
  const {
    result,
    inProgress,
    error,
    execute: getMergeTokenInfo,
    reset,
  } = usePromise(
    async () => {
      const publicClient = onboardStore.getPublicClient(NOVA_CHAIN_ID);
      const info = (await publicClient!.readContract({
        address: MERGE_TOKEN_PORTAL_ADDRESSES,
        abi: MergeTokenPortal,
        functionName: "getSourceTokenInfos",
        args: [tokenL2Address.value],
      })) as SourceTokenInfo;
      return info;
    },
    { cache: false }
  );

  const requestMergeTokenInfo = async () => {
    if (tokenL2Address.value) {
      await getMergeTokenInfo();
    } else {
      reset();
    }
  };

  watch(
    [tokenL2Address],
    () => {
      requestMergeTokenInfo();
    },
    { immediate: true }
  );

  return {
    result: computed(() => result.value),
    inProgress: computed(() => inProgress.value),
    error: computed(() => error.value),
    requestMergeTokenInfo,
  };
};
