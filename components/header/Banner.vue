<template>
  <div class="banner max-w-[100vw] md:max-w-[700px]">
    <swiper
      :spaceBetween="30"
      :centeredSlides="true"
      :autoplay="{
        delay: 2500,
        disableOnInteraction: false,
      }"
      :pagination="{
        clickable: true,
      }"
      :navigation="true"
      :modules="modules"
      class="mySwiper"
    >
      <swiper-slide>
        <!-- <div>
          <img src="/img/banner.svg" class="m-auto hidden md:block" />
          <img src="/img/mobile.svg" class="m-auto block md:hidden" />
        </div> -->

        <a href="https://app.zklink.io/" target="\_blank">
          <img src="/img/banner.svg" className="bannerImg" />
          <img src="/img/mobile.svg" className="mobileImg" />
        </a>
      </swiper-slide>
      <swiper-slide>
        <a href="https://zklink.io/merge" target="\_blank">
          <img src="/img/portal-banner.png" className="bannerImg" />
          <img src="/img/portal-banner-mobile.png" className="mobileImg" />
        </a>
      </swiper-slide>
      <!-- <swiper-slide>
        <a href="https://www.binance.com/en/activity/mission/zklink-nova-airdrop" target="\_blank">
          <img src="/img/banner-binance-zkl@2x.png" className="bannerImg" />
          <img src="/img/banner-binance-zkl-mobile.png" className="mobileImg" />
        </a>
      </swiper-slide> -->
    </swiper>
  </div>
</template>
<script>
// import "swiper/css/pagination";
// import "swiper/css/navigation";

// import required modules
import { Autoplay, Navigation, Pagination } from "swiper/modules";
// Import Swiper Vue.js components
import { Swiper, SwiperSlide } from "swiper/vue";
// Import Swiper styles
import "swiper/css";
export default {
  components: {
    Swiper,
    SwiperSlide,
  },
  setup() {
    return {
      modules: [Autoplay, Pagination, Navigation],
    };
  },
};
</script>

<style scoped lang="scss">
/* @import "swiper/css"; */
.banner {
  margin: 0 auto;
  overflow: auto;
  width: 100%;
  text-align: center;
  a {
    display: block;
    width: 100%;
    min-width: 0px;
    max-width: 700px;
  }
  .bannerImg {
    display: block;
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
      display: block;
      width: 100%;
      height: 80px;
    }
  }
}
</style>
