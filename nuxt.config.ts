// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },
  runtimeConfig: {
    mongoUrl: process.env.MONGO_DB_URI,
    bot: process.env.BOT,
    email: process.env.EMAIL,
    tsid: process.env.TSID,
    ttoken: process.env.TTOKEN,
    header: process.env.API,
    url: process.env.URL
  },

  nitro: {
    plugins: ["~/server/plugins/bot.js"],
  },
});
