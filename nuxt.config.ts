// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },
  runtimeConfig: {
    mongoUrl: process.env.MONGO_DB_URI,
    bot: process.env.BOT,
  },

  nitro: {
    plugins: ["~server/plugins/index.js", "~server/plugins/bot.js"],
  },
});
