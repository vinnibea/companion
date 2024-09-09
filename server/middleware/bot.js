import { Scenes, session, Telegraf } from 'telegraf';

export default defineEventHandler(async (event) => {
    let INITIAL_SESSION = { id: null, action: null, type: null };

    const bot = new Telegraf(useRuntimeConfig().bot);
    bot.use(session());

    bot.command("creditors", async (ctx) => {
        ctx.session = null;
        ctx.session = INITIAL_SESSION;
        ctx.session.type = 'link';
        const found_creditors = await creditors.find({});
        const buttons = [];
        let replyText = 'Cписок доступных МФО \n';
        if (found_creditors) {
            const rows = Math.floor(found_creditors.length / 5);
            const reminder = found_creditors.length % 5;
            const final_rows = (reminder ? Math.floor(found_creditors.length / 5) + 1 : rows);
            const dif = 5 - (5 - reminder);
            let counter = 0;
            for (let i = 0; i < final_rows; i++) {
                buttons.push([]);
                for (let j = 0; j < 5; j++) {
                    if (i === final_rows - 1 && j === dif) break;
                    replyText += `${counter + 1}. ${found_creditors[counter].title} ** ${found_creditors[counter].link ? found_creditors[counter].link : 'Не заполнено'} ** ${found_creditors[counter].isRecommended ? 'Выделенная' : 'Обычная'} ** ${found_creditors[counter].isActive ? 'Отображается' : 'Спрятана'}   \n`
                    buttons[i][j] = { text: found_creditors[counter].title, callback_data: found_creditors[counter]._id };
                    counter++;
                }
            }
        }


        await ctx.reply(replyText, {
            reply_markup: {
                inline_keyboard: buttons
            }
        })
    });
    bot.on('callback_query', async (ctx) => {
        console.log(ctx.callbackQuery.data)
        if (!ctx.session || ctx.session.type === null) return ctx.reply('Ты суда не хады, выбери сначала категорию, сессия неактивна, пойми, брат, завалишь сервак такими темпами')
        if (ctx?.session?.id && ctx?.session?.id !== null) {
            ctx.session.action = ctx.callbackQuery.data;
            return ctx.reply(ctx.session.action === 'change' ? 'Введи или вставь новую ссылку' : 'Теперь давай изменим выбранную карточку, да?')
        }
        ctx.session.id = ctx.callbackQuery.data;

        await ctx.reply('Готово, теперь выбери действие', {
            reply_markup: {
                inline_keyboard: [[{ text: 'Изменить ссылку', callback_data: `change` }, { text: 'Выделить', callback_data: `recommend` }, { text: 'Не выделять', callback_data: `not_recommend` }],
                [{ text: 'Спрятать', callback_data: `hide` }, { text: 'Показать', callback_data: `show` }]]
            }
        })
    });

    bot.on('message', async (ctx) => {
        if (!ctx?.session || ctx?.session === null || ctx?.session?.id === null) return ctx.reply('Сначала выбери категорию или действие')
        if (ctx.session.id && ctx.session.action) {
            if (ctx.session.type === 'link') {
                switch (ctx.session.action) {
                    case 'change': {
                        try {
                            await creditors.findByIdAndUpdate(ctx.session.id, { link: ctx.text }, {
                                upsert: true,
                                new: true,
                            })
                            INITIAL_SESSION = {}
                            ctx.session = null;
                            return ctx.reply('Ссылка обновлена, сессия завершена')
                        } catch (error) {
                            INITIAL_SESSION = {}
                            ctx.session = null;
                            return ctx.reply('Не удалось обновить ссылку, сессия завершена')
                        }
                    }

                    case 'recommend': {
                        try {
                            await creditors.findByIdAndUpdate(ctx.session.id, { isRecommended: true }, {
                                upsert: true,
                                new: true,
                            })
                            INITIAL_SESSION = {}
                            ctx.session = null;
                            return ctx.reply('Кредитор теперь выделен на сайте, сессия завершена')
                        } catch (error) {
                            INITIAL_SESSION = {}
                            ctx.session = null;
                            return ctx.reply('Не удалось произвести действие, сессия завершена')
                        }
                    }

                    case 'recommend': {
                        try {
                            await creditors.findByIdAndUpdate(ctx.session.id, { isRecommended: false }, {
                                upsert: true,
                                new: true,
                            })
                            INITIAL_SESSION = {}
                            ctx.session = null;
                            return ctx.reply('Кредитор теперь не выделен на сайте, сессия завершена')
                        } catch (error) {
                            INITIAL_SESSION = {}
                            ctx.session = null;
                            return ctx.reply('Не удалось произвести действие, сессия завершена')
                        }
                    }

                    case 'hide': {
                        try {
                            await creditors.findByIdAndUpdate(ctx.session.id, { isActive: false }, {
                                upsert: true,
                                new: true,
                            })
                            INITIAL_SESSION = {}
                            ctx.session = null;
                            return ctx.reply('Кредитор теперь не виден на сайте, сессия завершена')
                        } catch (error) {
                            INITIAL_SESSION = {}
                            ctx.session = null;
                            return ctx.reply('Не удалось произвести действие, сессия завершена')
                        }
                    }

                    case 'show': {
                        try {
                            await creditors.findByIdAndUpdate(ctx.session.id, { isActive: true }, {
                                upsert: true,
                                new: true,
                            })
                            INITIAL_SESSION = {}
                            ctx.session = null;
                            return ctx.reply('Кредитор теперь виден на сайте, сессия завершена')
                        } catch (error) {
                            INITIAL_SESSION = {}
                            ctx.session = null;
                            return ctx.reply('Не удалось произвести действие, сессия завершена')
                        }
                    }

                    default: {
                        INITIAL_SESSION = {}
                        ctx.session = null;
                        return ctx.reply('Я ничего не понял, но очень интересно')
                    }
                }
            }
        }
    })
    bot.launch()
})