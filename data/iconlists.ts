import type { ZkSyncNetwork } from "@/data/networks";
import useNetworks from "@/composables/useNetworks";
export type IconsList = {
  [key: string]: string;
};

const { zkSyncNetworks } = useNetworks();
export const iconsList: IconsList = zkSyncNetworks.reduce((obj: IconsList, item: ZkSyncNetwork) => {
  obj[item.key] = item.logoUrl!;
  return obj;
}, {});
