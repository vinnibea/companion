
import { Composer, Markup, Scenes, session, Telegraf } from 'telegraf';
import axios from 'axios';
import { isValidUrl } from './utils/validate_url.js';


const bot = new Telegraf(useRuntimeConfig().bot);
const baseURL = process.env.NODE_ENV === 'production' ? "https://pl-ruddy.vercel.app/api" : "http://localhost:3001/api";
console.log(process.env.NODE_ENV)
const login = 'root';

const auth_header = useRuntimeConfig().header;
const stepHandler = new Composer();

const login_scene = new Scenes.WizardScene('login',
    async (ctx) => {
        console.log(ctx.session.isAuthenticated)
        await ctx.reply('Введите логин');
        await ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text !== login) {
            await ctx.reply('Неверный логин, попробуйте еще раз');
        } else {
            ctx.session.activePage = 1;
            await ctx.reply('Логин верный, добро пожаловать');
            ctx.session.isAuthenticated = true;
            return ctx.scene.enter('creditors', { step: 1 });
        }
    }
)


const creditors_scene = new Scenes.WizardScene(
    "creditors",
    async (ctx) => {
        if (!ctx.session.isAuthenticated) return ctx.scene.enter('login', { step: 1 });
        console.log(ctx.session.activePage)
        await ctx.reply('Загружаю кредиторов...')
        try {
            const { data: { payload } } = await axios(`${baseURL}/cards`, {
                method: 'GET',
                headers: {
                    Authorization: auth_header,
                },
                params: {
                    page: ctx.session.activePage,
                }
            });

            ctx.session.nextPage = payload.next;
            ctx.session.prevPage = payload.prev;

            for (const item of payload.data) {
                await ctx.replyWithPhoto(item.imageURL,
                    {
                        caption: `${item.id}. ${'тут ничего'}** ${item.link ? item.link : 'Не заполнено'} ** ${item.isRecommended ? 'Выделенная' : 'Обычная'} ** ${item.isActive ? 'Отображается' : 'Спрятана'}   \n`,
                        reply_markup: {
                            inline_keyboard: [[{ text: item.id, callback_data: item.id }]]
                        }
                    }
                )
            }
            const buttons = [...(ctx.session.prevPage ? [Markup.button.callback('Назад', 'prev')] : []), Markup.button.callback('Выйти', 'exit'), ...(ctx.session.nextPage ? [Markup.button.callback('Вперед', 'next')] : [])];
            await ctx.reply('Листай для выбора страницы', Markup.inlineKeyboard([
                buttons
            ]))
            return ctx.wizard.next();
        } catch (e) {
            console.log(e)
            await ctx.reply('Проблема с базой данных');
            return ctx.scene.leave();
        }
    },
    async (ctx) => {
        switch (ctx?.callbackQuery?.data) {
            case 'exit': {
                await ctx.reply('Покидаю сессию');
                ctx.session.isAuthenticated = false;
                ctx.session.activePage = 1;
                return ctx.scene.leave();

            }

            case 'prev': {
                ctx.session.activePage = ctx.session.prevPage ? ctx.session.activePage - 1 : 1;
                return ctx.scene.enter('creditors', { step: 1 });
            }

            case 'next': {
                ctx.session.activePage = ctx.session.nextPage ? ctx.session.activePage + 1 : ctx.session.activePage;
                return ctx.scene.enter('creditors', { step: 1 });
            }
        }


        ctx.session.id = ctx?.callbackQuery?.data;
        if (!ctx.session.id) {
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
            ctx.session.isAuthenticated = false;
            ctx.session.activePage = 1;
            await ctx.reply('Покидаю сессию')
            return await ctx.scene.leave();
        }
        if (ctx?.callbackQuery?.data === 'back') {
            await ctx.reply('Загружаю кредиторов...')
            return await ctx.scene.enter('creditors', { step: 1 });
        }
        ctx.session.action = ctx?.callbackQuery?.data;

        if (ctx.session.action === 'change') {

            await ctx.reply('Теперь можно вставить новую ссылку')
            return ctx.wizard.next();
        } else {
            const global_data = {
                id: ctx.session.id,
                action: ctx.session.action,
            };
            if (!global_data.id) {
                await ctx.reply('Неверный формат ссылки')
                return ctx.scene.enter('creditors', { step: 1 });
            }
            if (!['recommend', 'not_recommend', 'change', 'hide', 'show'].includes(global_data.action)) {
                await ctx.reply('Неверное действие')
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
    stepHandler
);
const stage = new Scenes.Stage([login_scene, creditors_scene]);

bot.use(session())
bot.use(stage.middleware())


bot.command('start', async (ctx) => {
    await ctx.scene.enter('login');
})

bot.command('exit', async (ctx) => {
    if (ctx.session.isAuthenticated !== true) return await ctx.reply('Ты и так не в системе');

    await ctx.reply('Заканчиваю сессию');
    ctx.session.isAuthenticated = false;
    return await ctx.scene.leave();
})

bot.command('creditors', async (ctx) => {
    await ctx.scene.enter('creditors');
})
bot.on('message', async (ctx) => {
    await ctx.reply('Привет! Для начала работы выбери команду.')
})


export { bot };