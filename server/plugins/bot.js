
import { Scenes, session, Telegraf, Composer } from 'telegraf';
import { default as creditors } from '../schemas/creditor';
import axios from 'axios';
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (error) {
        return false;
    }
}

export default defineNitroPlugin(async (app) => {
    const bot = new Telegraf(useRuntimeConfig().bot);


    const stepHandler = new Composer()

    const creditor_stepper = new Composer();
    let INITIAL_SESSION = { id: null, action: null, type: null };
    const creditors_scene = new Scenes.WizardScene(
        "creditors",
        async (ctx) => {

            ctx.session = INITIAL_SESSION;
            try {
                const found_creditors = await creditors.find({});
                const buttons = [];

                let replyText = 'Cписок доступных МФО \n';

                if (found_creditors) {
                    const rows = Math.floor((found_creditors.length) / 5);
                    const reminder = (found_creditors.length) % 5;
                    const final_rows = (reminder ? Math.floor(found_creditors.length / 5) + 1 : rows);
                    const dif = 5 - (5 - reminder);
                    let counter = 0;
                    for (let i = 0; i < final_rows; i++) {
                        buttons.push([]);
                        for (let j = 0; j < 5; j++) {
                            if (reminder && i === final_rows - 1 && j === dif) break;
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


                return ctx.wizard.next();
            } catch (e) {
                await ctx.reply('Проблема с базой данных, это не я...')
                return ctx.scene.leave();
            }
        },
        async (ctx) => {
            console.log('а потом тут, третья стадия')
            ctx.session.id = ctx?.callbackQuery?.data || null;
            await ctx.reply('Готово, теперь выбери действие', {
                reply_markup: {
                    inline_keyboard: [[{ text: 'Изменить ссылку', callback_data: `change` }, { text: 'Выделить', callback_data: `recommend` }, { text: 'Не выделять', callback_data: `not_recommend` }],
                    [{ text: 'Спрятать', callback_data: `hide` }, { text: 'Показать', callback_data: `show` }]]
                }
            })
            return ctx.wizard.next();
        },
        async (ctx) => {
            ctx.session.action = ctx?.callbackQuery?.data || null;

            if (ctx.session.action === 'change') {

                await ctx.reply('Теперь нужно отправить новую ссылку')
                return ctx.wizard.next();
            } else {
                switch (ctx.session.action) {
                    case 'recommend': {
                        try {
                            await creditors.findByIdAndUpdate(ctx.session.id, { isRecommended: true }, {
                                upsert: true,
                                new: true,
                            })
                            await ctx.reply('Кредитор теперь выделен на сайте, сессия завершена');
                            return ctx.scene.leave();

                        } catch (error) {
                            await ctx.reply('Не удалось произвести действие, сессия завершена')

                            return ctx.scene.leave();
                        }
                    }

                    case 'not_recommend': {
                        try {
                            await creditors.findByIdAndUpdate(ctx.session.id, { isRecommended: false }, {
                                upsert: true,
                                new: true,
                            })

                            await ctx.reply('Кредитор теперь не выделен на сайте, сессия завершена')
                            return await ctx.scene.leave();
                        } catch (error) {

                            await ctx.reply('Не удалось произвести действие, сессия завершена')
                            return await ctx.scene.leave();
                        }
                    }
                    case 'hide': {
                        try {
                            await creditors.findByIdAndUpdate(ctx.session.id, { isActive: false }, {
                                upsert: true,
                                new: true,
                            })

                            await ctx.reply('Кредитор теперь не виден на сайте, сессия завершена')
                            return await ctx.scene.leave();
                        } catch (error) {

                            await ctx.reply('Не удалось произвести действие, сессия завершена')
                            return await ctx.scene.leave();
                        }
                    }

                    case 'show': {
                        try {
                            await creditors.findByIdAndUpdate(ctx.session.id, { isActive: true }, {
                                upsert: true,
                                new: true,
                            })

                            await ctx.reply('Кредитор теперь виден на сайте, сессия завершена')
                            return await ctx.scene.leave();
                        } catch (error) {

                            await ctx.reply('Не удалось произвести действие, сессия завершена')
                            return await ctx.scene.leave();
                        }
                    }

                    default: {
                        await ctx.reply('Я ничего не понял, но очень интересно')
                        return await ctx.scene.leave();
                    }
                }
            }
        },

        async (ctx) => {
            if (!isValidUrl(ctx.message.text)) {
                await ctx.reply("Неверный формат ссылки, завершаю сессию");
                return await ctx.scene.leave();
            }
            try {
                await creditors.findByIdAndUpdate(ctx.session.id, { link: ctx.message.text }, {
                    upsert: true,
                    new: true,
                })

                await ctx.reply("Новая ссылка успешно создана");
                return await ctx.scene.leave();
            } catch (error) {

                await ctx.reply("Не удалось изменить ссылку");
                return await ctx.scene.leave();
            }
        },
    );
    const stage = new Scenes.Stage([creditors_scene]);
    bot.use(session())
    bot.use(stage.middleware())

    bot.command('creditors', async (ctx) => {
        console.log('я тут')
        await ctx.scene.enter('creditors');

    })
    bot.on('message', async (ctx) => {

        await ctx.reply('Привет! Для начала работы выбери команду.')
    })
        bot.launch();
})

