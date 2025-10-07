
import { Scenes, session, Telegraf} from 'telegraf';
import axios from 'axios';
import { isValidUrl } from './utils/validate_url.js';


const bot = new Telegraf(useRuntimeConfig().bot);
const baseURL = "https://pl-ruddy.vercel.app/api";

const auth_header = useRuntimeConfig().header;

const users_scene = new Scenes.WizardScene("users",
    async (ctx) => {
        if (!ctx?.callbackQuery?.data) return ctx.scene.enter('users', { step: 1 });
        if (ctx.callbackQuery.data === 'exit') return ctx.scene.leave();
n
        ctx.session.type = ctx?.callbackQuery?.data || null;
        await ctx.reply('Понял, сейчас схожу посмотрю что там')
        try {
            const { data } = await axios(`${baseURL}/${ctx.session.type}`, {
                method: 'GET',
                headers: {
                    Authorization: auth_header,
                }
            });
            if (!data.length) {
                await ctx.reply('Ничего не найдено')
                return ctx.scene.enter('users', { step: 1 });
            }


            ctx.session.data = data;
            await ctx.reply(`Найдено: ${data.length}\n` + data.reduce((acc, next, i) => {
                return acc + `\n${i + 1}. ${next.email}`

            }, ''), {
                reply_markup: {
                    inline_keyboard: [[{ text: 'Назад', 'callback_data': 'back' }, { text: 'Выйти', 'callback_data': 'exit' }]],
                    resize_keyboard: true,
                }
            });
            return ctx.wizard.next();
        } catch (error) {
            console.log(error)

            await ctx.reply('Не удалось, покидаю сессию')
            return ctx.scene.leave();
        }
    },
    async (ctx) => {
        if (ctx.callbackQuery.data === 'back') {
            return ctx.scene.enter('users', { step: 1 });
        } else {
            return ctx.scene.leave();
        }
    }

);


const creditors_scene = new Scenes.WizardScene(
    "creditors",
    async (ctx) => {
        await ctx.reply('Запрос пошел...ждем ответ')
        try {
            const { data: found_creditors } = await axios(`${baseURL}/cards`, {
                method: 'GET',
                headers: {
                    Authorization: auth_header,
                }
            });

            for (const item of found_creditors) {
                await ctx.replyWithPhoto(item.imageURL,

                    {
                        caption: `${item.id}. ${'тут ничего'}** ${item.link ? item.link : 'Не заполнено'} ** ${item.isRecommended ? 'Выделенная' : 'Обычная'} ** ${item.isActive ? 'Отображается' : 'Спрятана'}   \n`,
                        reply_markup: {
                            inline_keyboard: [[{ text: item.id, callback_data: item.id }], [
                                { text: 'Выйти', callback_data: `exit` }
                            ]]
                        }
                    }
                )
            }

            return ctx.wizard.next();
        } catch (e) {
            console.log(e)
            await ctx.reply('Проблема с базой данных');
            return ctx.scene.leave();
        }
    },
    async (ctx) => {
        if (ctx?.callbackQuery?.data === 'exit') {
            await ctx.reply('Понял, выхожу');
            return ctx.scene.leave();
        }

        ctx.session.id = ctx?.callbackQuery?.data;
        if (!ctx.session.id) {
            await ctx.reply('Не, мы не пропустим эти данные')
            return ctx.scene.enter('creditors', { step: 1 });
        }
        await ctx.reply('Готово, теперь выбери действие', {
            reply_markup: {
                inline_keyboard: [[{ text: 'Изменить ссылку', callback_data: `change` },
                { text: 'Выделить', callback_data: `recommend` },
                { text: 'Не выделять', callback_data: `not_recommend` }],
                [{ text: 'Спрятать', callback_data: `hide` },
                { text: 'Показать', callback_data: `show` }],
                [{ text: 'Назад', callback_data: 'back' }, { text: 'Выйти', callback_data: `exit` }]]
            }
        })
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx?.callbackQuery?.data === 'exit') {
            await ctx.reply('Выхожу')
            return await ctx.scene.leave();
        }
        if (ctx?.callbackQuery?.data === 'back') {
            await ctx.reply('Начинаем сначала')
            return await ctx.scene.enter('creditors', { step: 1 });
        }
        ctx.session.action = ctx?.callbackQuery?.data;

        if (ctx.session.action === 'change') {

            await ctx.reply('Теперь нужно отправить новую ссылку')
            return ctx.wizard.next();
        } else {
            const global_data = {
                id: ctx.session.id,
                action: ctx.session.action,
            };
            if (!global_data.id) {
                await ctx.reply('Не, мы не пропустим эти данные')
                return ctx.scene.enter('creditors', { step: 1 });
            }
            if (!['recommend', 'not_recommend', 'change', 'hide', 'show'].includes(global_data.action)) {
                await ctx.reply('Так у нас не принято')
                return ctx.scene.enter('creditors', { step: 1 });
            }
            try {
                const { data } = await axios.put(`${baseURL}/cards`, global_data,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: auth_header,
                        }
                    }
                );



                await ctx.reply(data.message)
                return await ctx.scene.enter('creditors', { step: 1 });
            } catch (error) {

                await ctx.reply('Не удалось произвести действие')
                return await ctx.scene.enter('creditors', { step: 1 });
            }
        }
    },

    async (ctx) => {
        if (!isValidUrl(ctx?.message?.text)) {
            await ctx.reply("Неверный формат ссылки, завершаю сессию");
            return await ctx.scene.enter('creditors', { step: 1 });
        }
        try {
            const data_to_update = {
                id: ctx.session.id,
                action: ctx.session.action,
                link: ctx.message.text,
            };

            const { data } = await axios.put(`${baseURL}/cards`, data_to_update,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: auth_header,
                    }
                }
            );

            await ctx.reply(data.message);
            return await ctx.scene.enter('creditors', { step: 1 });
        } catch (error) {

            await ctx.reply("Не удалось изменить ссылку");
            return await ctx.scene.enter('creditors', { step: 1 });
        }
    },
);
const stage = new Scenes.Stage([creditors_scene, users_scene]);
bot.use(session())
bot.use(stage.middleware())


bot.command('users', async (ctx) => {
    await ctx.reply('Хорошо, начинаем поиск по пользователям сайта')
    await ctx.scene.enter('users');
})
bot.command('creditors', async (ctx) => {

    await ctx.scene.enter('creditors');

})
bot.on('message', async (ctx) => {

    await ctx.reply('Привет! Для начала работы выбери команду.')
})


export { bot };