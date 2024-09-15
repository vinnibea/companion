import sendgrid from '@sendgrid/mail';


const mail_service = sendgrid;

mail_service.setApiKey(useRuntimeConfig().email);
const msg = {
    to: 'vinnibea3@gmail.com', // Change to your recipient
    from: 'vinnibea@gmail.com', // Change to your verified sender
    subject: 'Sending with SendGrid is Fun',
    text: 'and easy to do anywhere, even with Node.js',
    html: '<strong>and easy to do anywhere, even with Node.js</strong>',
}

export { mail_service}