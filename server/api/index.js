import { Scenes, session, Telegraf, Composer } from 'telegraf';
import { default as creditors } from '../schemas/creditor'



const bot = new Telegraf(useRuntimeConfig().bot);


const stepHandler = new Composer()


// const scene = new Scenes.WizardScene(
//     "sceneId",
//     async (ctx) => {
//         await ctx.reply("Step 1");
//         return ctx.wizard.next();
//     },
//     stepHandler,
//     async (ctx) => {
//         await ctx.reply("Step 2");
//         return ctx.wizard.next();
//     },
//     async (ctx) => {
//         await ctx.reply("Done");
//         return await ctx.scene.leave();
//     }
// );

// // to compose all scenes you use Stage
// const stage = new Scenes.Stage([scene]);

// bot.use(session());
// // this attaches ctx.scene to the global context
// bot.use(stage.middleware());

// // you can enter the scene only AFTER registering middlewares
// // otherwise ctx.scene will be undefined
// bot.command('enter', async (ctx) => {
//     ctx.scene.enter('sceneId')
//     await ctx.reply('Entered the scene')
// });


// stepHandler.command("next", async (ctx) => {
//     await ctx.reply("Step 2. Via command");
//     return ctx.wizard.next();
// });



const creditor_stepper = new Composer();
let INITIAL_SESSION = { id: null, action: null, type: null };
const creditors_scene = new Scenes.WizardScene(
    "creditors",
    async (ctx) => {
        ctx.session = INITIAL_SESSION;
        const found_creditors = await creditors.find({});
        const buttons = [];
        console.log(process.env.NODE_ENV)
       
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


        return ctx.wizard.next();
    },
    async (ctx) => {
        ctx.session.id = ctx.callbackQuery.data;
        await ctx.reply('Готово, теперь выбери действие', {
            reply_markup: {
                inline_keyboard: [[{ text: 'Изменить ссылку', callback_data: `change` }, { text: 'Выделить', callback_data: `recommend` }, { text: 'Не выделять', callback_data: `not_recommend` }],
                [{ text: 'Спрятать', callback_data: `hide` }, { text: 'Показать', callback_data: `show` }]]
            }
        })
        return ctx.wizard.next();
    },
    async (ctx) => {
        ctx.session.action = ctx.callbackQuery.data;

        if (ctx.session.action === 'change') {
            await ctx.reply('Теперь нужно отправить новую ссылку')
            return await ctx.wizard.next();
        } else {
            switch (ctx.session.action) {
                case 'recommend': {
                    try {
                        await creditors.findByIdAndUpdate(ctx.session.id, { isRecommended: true }, {
                            upsert: true,
                            new: true,
                        })
                        await ctx.reply('Кредитор теперь выделен на сайте, сессия завершена');
                        return await ctx.scene.leave();

                    } catch (error) {
                        await ctx.reply('Не удалось произвести действие, сессия завершена')
                        return await ctx.scene.leave();
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
                        INITIAL_SESSION = {}
                        await ctx.reply('Кредитор теперь не виден на сайте, сессия завершена')
                        return await ctx.scene.leave();
                    } catch (error) {
                        INITIAL_SESSION = {}

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
                        INITIAL_SESSION = {}
                        await ctx.reply('Кредитор теперь виден на сайте, сессия завершена')
                        return await ctx.scene.leave();
                    } catch (error) {
                        INITIAL_SESSION = {}
                        await ctx.reply('Не удалось произвести действие, сессия завершена')
                        return await ctx.scene.leave();
                    }
                }

                default: {
                    INITIAL_SESSION = {}
                    await ctx.reply('Я ничего не понял, но очень интересно')
                    return await ctx.scene.leave();
                }
            }
        }
    },

    async (ctx) => {
        try {
            await creditors.findByIdAndUpdate(ctx.session.id, { link: ctx.text }, {
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
    ctx.scene.enter('creditors');

})
bot.on('message', async (ctx) => {
    console.log(ctx.text)
})
if(process.env.NODE_ENV === 'development') {
    bot.launch();
} else {
    bot.telegram.setWebhook('https://server-friend.vercel.app/api');
}


