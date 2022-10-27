const request = require('request');
const dotenv = require("dotenv")
dotenv.config()
DISC_WEBHOOK = process.env.DISC_WEBHOOK

function sendDiscAlert(message) {
    request.post(DISC_WEBHOOK, {
         method: "POST",
         headers: {
             "Content-Type": "application/json"
         },
         body: JSON.stringify({"username": "Github Release Alerter", "content": `**RELEASE ALERT:**\n\`\`\`${message}\`\`\``})
     });
 }

 exports.sendDiscAlert = sendDiscAlert;
