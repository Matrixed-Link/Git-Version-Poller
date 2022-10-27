const request = require('request');
const dotenv = require("dotenv")
dotenv.config()
SLACK_WEBHOOK = process.env.SLACK_WEBHOOK

function sendSlackAlert(message) {
    request.post(SLACK_WEBHOOK, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            attachments: [
                {
                    text: message,
                    color: "#00D7FF",
                },
            ]
        })
    });
}

exports.sendSlackAlert = sendSlackAlert;
