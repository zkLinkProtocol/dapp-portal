<template>
  <div class="deposit-thrid-bridge">
    <p class="title">Earn Extra Nova Points by deposit from third-party bridges!</p>
    <div
      class="deposit-thrid-bridge-item"
      v-for="(item, index) in bridgePoints"
      :key="index"
      @click="handleLink(item.url)"
    >
      <div class="left">
        <img :src="item.logo" alt="" class="logo" />
        <div>
          <p class="name">{{ item.name }}</p>
          <p class="desc">
            <span>{{ item.desc || "Bridge more than 0.1 ETH/ 500USDT /500 USDC to Nova to earn Nova Points." }} </span>
            <CommonButtonLabel as="span" class="showTip relative hidden text-left md:block" v-if="!item.noTooltip">
              <img src="/img/Shape.svg" class="ml-1 inline-block h-3 w-3" alt="" />
              <div class="tooltip">
                You can earn Nova Points for each transaction of bridging to Nova over 0.1 ETH/ 500USDT /500 USDC
                (qualified transactions). Every day beginning at UTC+10:00, users who bridge to Nova early will receive
                more points. You'll accumulate Nova points as follows: 5 points for the initial 200 qualified
                transactions, 4 points for qualified transactions 201-400, 3 points for qualified transactions 401-600,
                2 points for qualified transactions 601-800, and 1 point for any qualified transactions beyond that.
              </div>
            </CommonButtonLabel>
          </p>
        </div>
      </div>
      <div class="right">
        <span class="text-sm" v-if="!item.noPoints">{{ item.points }} Nova Points</span>
        <ArrowTopRightOnSquareIcon class="line-button-with-img-icon" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";

import { ArrowTopRightOnSquareIcon } from "@heroicons/vue/24/outline";
import { $fetch } from "ofetch";

const handleLink = (link: string) => {
  window.open(link, "_blank");
};

const ThirdPartyBridges = [
  {
    name: "Free (Official Bridge of Merlin Chain)",
    logo: "/img/Free.svg",
    url: "https://free.tech/zklink",
    desc: "Bridge M-BTC & solvBTC to earn Nova Points",
    noTooltip: true,
    noPoints: true,
  },
  {
    name: "Meson Finance",
    logo: "/img/Meson.svg",
    url: "https://meson.fi/zklink",
  },
  {
    name: "Owlto Finance",
    logo: "/img/owlto.svg",
    url: "https://owlto.finance/?to=zkLinkNova",
  },
  {
    name: "Symbiosis",
    logo: "/img/Symbiosys.svg",
    url: "https://app.symbiosis.finance/swap?chainIn=Ethereum&chainOut=ZkLink&tokenIn=ETH&tokenOut=ETH",
  },
];
const bridgePoints = ref(ThirdPartyBridges.map((item) => ({ ...item, points: 0 })));
const API_URL = "https://app-api.zklink.io/lrt-points/cache/bridge/latest/points";
const fetchBridgePoints = async () => {
  const points = (await Promise.all([
    $fetch(API_URL, { params: { name: "meson" } }),
    $fetch(API_URL, { params: { name: "owlet" } }),
    $fetch(API_URL, { params: { name: "symbiosis" } }),
  ])) as any[];
  console.log(points, "points");
  const _bridgePoints = bridgePoints.value;
  for (let i = 0; i < points.length; i++) {
    const { data } = points[i];
    _bridgePoints[i].points = data;
  }
  bridgePoints.value = _bridgePoints;
};

fetchBridgePoints();
</script>
<style lang="scss" scoped>
.deposit-thrid-bridge {
  margin-top: 1rem;
  .title {
    font-size: 20px;
    font-style: normal;
    font-weight: 400;
    line-height: 24px; /* 120% */
    letter-spacing: -0.5px;
    margin-bottom: 1rem;
  }
  .deposit-thrid-bridge-item:hover {
    background: #343a44;
  }
  .deposit-thrid-bridge-item {
    cursor: pointer;
    border-radius: 16px;
    background: #262b33;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1rem;
    margin-bottom: 24px;
    .left {
      display: flex;
      align-items: center;
      .logo {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        margin-right: 7px;
      }
      .name {
        color: #fff;
        font-size: 16px;
        font-style: normal;
        font-weight: 400;
        line-height: normal;
        letter-spacing: -0.5px;
      }
      .desc {
        display: flex;
        align-items: center;
        color: #a0a5ad;
        font-size: 12px;
        font-style: normal;
        font-weight: 400;
        line-height: normal;
        letter-spacing: -0.5px;
        margin-right: 20px;
      }
    }
    .right {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      color: #fff;
    }
  }
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
  /* top: -7.5rem; */
  width: 35rem;
  left: -16rem;
  bottom: 100%;
  border-radius: 8px;
  background: #1f2127;
  color: #fff;

  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: -0.07px;
}
.line-button-with-img-icon {
  @apply ml-1  h-5 w-5 flex-none text-neutral-500 dark:text-neutral-400;
}
</style>
