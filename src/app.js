// Import dependencies.
const request = require('request')
const dotenv = require("dotenv");

// Import utils.
const { ts } = require('./utils/ts')
const { sendTgAlert } = require('./utils/sendTgAlert');
const { sendDiscAlert } = require('./utils/sendDiscAlert');

// Load enviroment file.
dotenv.config()
const gitUser = process.env.GIT_USER
const gitToken = process.env.GIT_TOKEN
const pollTime = process.env.POLL_TIME * 60000 || 600000
const TG_ENABLED = process.env.TG_ENABLED || false
const DISC_ENABLED = process.env.DISC_ENABLED || false

// Log start message.
console.log(ts('INFO'), 'Starting Github version poller.')
console.log(ts('INFO'), `Poll time set to: ${pollTime / 60000} minute(s). \n` + ts('INFO'),`Telegram alerts enabled: ${TG_ENABLED}\n` + ts('INFO'),`Discord alerts enabled: ${DISC_ENABLED}`)

// Check for required parameters.
if (DISC_ENABLED) {
    if (!process.env.DISC_WEBHOOK) {
        console.log(ts('ERROR'), `No discord webhook provided in enviroment file.\n${ts('WARN')} Disabling discord alerts.`)
        DISC_ENABLED = false
    }
}

if (TG_ENABLED) {
    if (!process.env.TELEGRAM_KEY || !process.env.TELEGRAM_ID) {
        console.log(ts('ERROR'), `Not all required telegram parameters provided in enviroment file.\n${ts('WARN')} Disabling telegram alerts.`)
        TG_ENABLED = false
    }
}

// Warn for no alerts set.
if (DISC_ENABLED === 'false') {
    if (TG_ENABLED === 'false') {
        console.log(ts('WARN'), `Both telegram & discord alerting disabled. Only writing alerts to log.`)
    }
}

// Load repo's from repository file.
console.log(ts('INFO'), `Loading repositories from repositories.json.`)
try {
    var repositories = require('../repositories.json')
} catch (e) {
    return console.log(ts('ERROR'), 'Could not parse repository file.')
}
if (Object.keys(repositories).length === 0) {
    return console.log(ts('ERROR'), 'No repositories found in file. Please supply at least one repository to start the script.')
}
console.log(ts('INFO'), `Loaded ${Object.keys(repositories).length} repositories.`)

// Tag fetcher.
async function pullVersion(repoName, repoPath) {
    const requestUrl = 'https://' + gitUser + ':' + gitToken + '@api.github.com/repos/' + repoPath + '/releases'
    await request({ url: requestUrl, json: true, headers: { 'User-Agent': 'My version poller' } }, function (error, response, data) {
        url = data[0].url
        tag = data[0].tag_name;
        var re = new RegExp("([0-9]+(\.[0-9]+)+)");
        var r = tag.match(re);
        if (r)
            tag = r[1]
        if (tags[repoName] === undefined) {
            console.log(ts('INFO'), `Set current tag to ${tag} for ${repoName}.`)
        } else {
            let old_tag = tags[repoName]
            if (old_tag != tag) {
                message = `New release detected for ${repoName}.\nOld version: ${old_tag}\nNew version: ${tag}\nRepository url: https://github.com/${repoPath}`
                console.log(ts('ALERT'), message)
                if (TG_ENABLED === 'true') {
                    sendTgAlert(message)
                }
                if (DISC_ENABLED === 'true') {
                    sendDiscAlert(message)
                }
                console.log(ts('INFO'), `Set updated tag to ${tag} for ${repoName}.`)
            }
        }
        tags[repoName] = tag
    });
}

// Loop function
global.tags = {}
async function loop() {
    console.log(ts('INFO'), `Initiate poll round.`)
    for (x in repositories) {
        await pullVersion(x, repositories[x]).catch(() => {
            console.log(ts('ERROR'), `Error while running fetcher for ${x}.`)
        })
    }
    setTimeout(() => {
        loop()
    }, pollTime)
}

// Run loop.
loop().catch(() => {
    console.log(ts('ERROR'), `Error occured while running poll loop, restarting.`)
    loop()
})