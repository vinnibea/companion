
import  {bot } from '../bot_main';

export default defineNitroPlugin(async (app) => {
    if (process.env.NODE_ENV === 'development') {
        bot.launch();
    } else {
        bot.telegram.setWebhook('https://companion-kohl.vercel.app/api/')
    }
})

