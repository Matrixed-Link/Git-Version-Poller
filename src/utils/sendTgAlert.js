const Telegram = require('telegram-notify');
const dotenv = require("dotenv")
dotenv.config()

const sendTgAlert = async (message) => {
    const notify = new Telegram({ token: process.env.TELEGRAM_KEY, chatId: process.env.TELEGRAM_ID });
    await notify.send(message);
}

exports.sendTgAlert = sendTgAlert;
