<template>
  <div className="flex flex-col items-center justify-center h-screen text-center w-full maintenance">
    <img src="/img/img-maintenance.png" className="w-43 h-30 mb-10" />

    <p className="maintenance-title">System maintenance and upgrade in progress</p>
    <p className="maintenance-desc">
      We apologize for any inconvenience caused during the upgrade and our service will be back soon
    </p>
  </div>
</template>
  
  <script lang="ts" setup>
</script>
  
  <style lang="scss" scoped>
.maintenance {
  img {
    width: 172px;
    height: 120px;
    margin-bottom: 40px;
  }
  .maintenance-title {
    color: rgba(255, 255, 255, 0.85);
    text-align: center;
    font-size: 24px;
    font-style: normal;
    font-weight: 500;
    line-height: 32px; /* 133.333% */
    margin-bottom: 12px;
  }
  .maintenance-desc {
    color: rgba(255, 255, 255, 0.45);
    text-align: center;
    font-size: 14px;
    font-style: normal;
    font-weight: 400;
    line-height: 22px; /* 157.143% */
  }
}
</style>
  