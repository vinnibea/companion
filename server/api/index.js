import  bot  from '../bot_main';

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        await bot.handleUpdate(body);
        return { status: 'ok' };
    } catch (error) {
        throw createError({
            status: 'Ну таке..'
        })
    }
})

