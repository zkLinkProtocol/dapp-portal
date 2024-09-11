import { portal as portalMeta } from "./data/meta";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    // baseURL: "/",
    head: {
      htmlAttrs: {
        lang: "en",
      },
      link: [
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
        },
      ],
      meta: [
        {
          property: "og:image",
          content: portalMeta.previewImg.src,
        },
        {
          property: "og:image:alt",
          content: portalMeta.previewImg.alt,
        },
        {
          property: "og:image:type",
          content: "image/png",
        },
        {
          property: "og:image:width",
          content: "1200",
        },
        {
          property: "og:image:height",
          content: "630",
        },
      ],
      script: [
        {
          src: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
        },
        {
          hid: "Rudder-JS",
          src: "https://cdn.rudderlabs.com/v1.1/rudder-analytics.min.js",
          defer: true,
        },
        // {
        //   src: '//cdn.jsdelivr.net/npm/eruda'
        // }
      ],
    },
  },
  plugins: [],
  modules: ["@kevinmarrec/nuxt-pwa", "@pinia/nuxt", "nuxt-gtag"],
  gtag: {
    id: "G-VJL36Q8SJ4",
  },
  ssr: false,
  pwa: {
    meta: {
      name: portalMeta.title,
      description: portalMeta.description,
    },
    manifest: {
      name: portalMeta.title,
      short_name: "Nova Portal",
      description: portalMeta.description,
      start_url: "/",
      display: "standalone",
      background_color: "#000",
      icons: [
        {
          src: "icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
      iconPath: "icon.png",
    },
    icon: {
      source: "icon.png",
      fileName: "icon.png",
    },
  },
  css: ["@/assets/css/tailwind.css", "@/assets/css/style.scss", "web3-avatar-vue/dist/style.css"],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    public: {
      walletConnectProjectID: process.env.WALLET_CONNECT_PROJECT_ID,
      turnstileKey: process.env.TURNSTILE_KEY,
      nodeType: process.env.NODE_TYPE as undefined | "memory" | "dockerized" | "hyperchain" | "nexus",
      ankrToken: process.env.ANKR_TOKEN,
      screeningApiUrl: process.env.SCREENING_API_URL,
      dataplaneUrl: process.env.DATAPLANE_URL,
      rudderKey: process.env.RUDDER_KEY,
    },
  },
  pinia: {
    autoImports: [
      // automatically imports `defineStore` and `storeToRefs` typings
      "defineStore",
      "storeToRefs",
    ],
  },
  vite: {
    define: {
      // make these env available even outside of the Nuxt context
      "process.env.NODE_TYPE": JSON.stringify(process.env.NODE_TYPE),
      "process.env.WALLET_CONNECT_PROJECT_ID": JSON.stringify(process.env.WALLET_CONNECT_PROJECT_ID),
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/assets/css/_mixins.scss" as *;',
        },
      },
    },
    build: {
      target: "ESNext",
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "es2020",
      },
    },
  },
});
