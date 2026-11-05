export default defineNuxtConfig({
  css: ["@/assets/main.css"],
  compatibilityDate: "2024-11-01",
  devtools: { enabled: false },
  
  // Favicon configuration
  app: {
    head: {
      title: 'PresenTap - Sistem Presensi Sekolah',
      link: [
        { rel: 'icon', type: 'image/png', href: '/presentap.png' }
      ]
    }
  },
  modules: [
    "@prisma/nuxt",
    ["@pinia/nuxt", {
      autoImports: [
        'defineStore',
        ['defineStore', 'definePiniaStore'],
      ]
    }]
  ],

  ssr: true, // Pastikan SSR tetap aktif jika diperlukan

  nitro: {
    devServer: {}, // Biarkan kosong atau hapus jika tidak diperlukan
  },
  devServer: {
    host: "0.0.0.0", // Agar server bisa diakses dari jaringan lain
    port: 3000, // Pastikan port sesuai dengan yang digunakan
  },
  runtimeConfig: {
    // Server-side only
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    
    // Public keys that are exposed to the client
    public: {
      apiBase: '/api'
    }
  },
  vite: {
    server: {
      proxy: {},
      // hmr: {
      //   host: 'www.presentap.online',
      //   protocol: 'wss'
      // }
    },
    resolve: {
      alias: {
        ".prisma/client/index-browser": "./node_modules/.prisma/client/index-browser.js",
      },
    },
  },
});