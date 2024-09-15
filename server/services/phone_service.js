import twilio from 'twilio';
const phone_service = new twilio(useRuntimeConfig().tsid, useRuntimeConfig().ttoken)

export { phone_service }