import { bot } from '../bot_main';

export default defineEventHandler(async (event) => {
    console.log('Received bot update');
    try {
        const body = await readBody(event);
        await bot.handleUpdate(body);
        return { status: 'ok' };
    } catch (error) {
        return { status: 'error', message: error.message }
    }
})