export default defineEventHandler(async (event) => {
    console.log('Received bot update');

    return { test: 'ok' };
})