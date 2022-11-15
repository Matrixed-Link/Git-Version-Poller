// Import dependencies.
const request = require('request')
const dotenv = require("dotenv");

// Import utils.
const { ts } = require('./utils/ts')
const { sendTgAlert } = require('./utils/sendTgAlert');
const { sendDiscAlert } = require('./utils/sendDiscAlert');
const { sendSlackAlert } = require('./utils/sendSlackAlert');

// Load enviroment file.
dotenv.config()
const gitUser = process.env.GIT_USER
const gitToken = process.env.GIT_TOKEN
const pollTime = process.env.POLL_TIME * 60000 || 600000
const TG_ENABLED = JSON.parse(process.env.TG_ENABLED) || false
const DISC_ENABLED = JSON.parse(process.env.DISC_ENABLED) || false
const SLACK_ENABLED = JSON.parse(process.env.SLACK_ENABLED) || false

// Log start message.
console.log(ts('INFO'), 'Starting Github version poller.')
console.log(ts('INFO'), `Poll time set to: ${pollTime / 60000} minute(s). \n` + ts('INFO'), `Telegram alerts enabled: ${TG_ENABLED}\n` + ts('INFO'), `Discord alerts enabled: ${DISC_ENABLED}\n` + ts('INFO'), `Slack alerts enabled: ${SLACK_ENABLED}`)

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

if (SLACK_ENABLED) {
    if (!process.env.SLACK_WEBHOOK) {
        console.log(ts('ERROR'), `No slack webhook provided in enviroment file.\n${ts('WARN')} Disabling slack alerts.`)
        SLACK_ENABLED = false
    }
}

// Warn for no alerts set.
if (!DISC_ENABLED && !TG_ENABLED && !SLACK_ENABLED) {
    console.log(ts('WARN'), `Telegram, slack & discord alerting disabled. Only writing alerts to log.`)
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
        // Skip pre-releases.
        for (x in data) {
            if (!data[x].prerelease) {
                break
            }
        }
        tag = data[x].tag_name;
        original_tag = tag
        var re = new RegExp("([0-9]+(\.[0-9]+)+)");
        var r = tag.match(re);
        if (r)
            tag = r[1]
        // Remove trailing data from version number.
        if (tag.includes('-')) {
            tag = tag.split('-')[0]
        }
        if (tags[repoName] == undefined) {
            console.log(ts('INFO'), `Set current tag to ${tag} for ${repoName}. Release url: https://github.com/${repoPath}/releases/tag/${original_tag}`)
        } else {
            let old_tag = tags[repoName]
            let original_old_tag = old_tag
            if (original_old_tag != original_tag) {
                var re = new RegExp("([0-9]+(\.[0-9]+)+)");
                var r = old_tag.match(re);
                if (r)
                    old_tag = r[1]
                // Remove trailing data from version number.
                if (old_tag.includes('-')) {
                    old_tag = old_tag.split('-')[0]
                }
                var tags = {}
                tags['old'] = []
                tags['new'] = []
                for (x in old_tag.split('.')) {
                    tags.old.push(Number(old_tag.split('.')[x]))
                    tags.new.push(Number(tag.split('.')[x]))
                }
                for (x in tags.old) {
                    console.log('new',tags.new[x],'old',tags.old[x])
                    if (tags.new[x] > tags.old[x]) {
                        message = `New release detected for ${repoName}.\nOld version: v${old_tag}\nNew version: v${tag}\nRelease url: https://github.com/${repoPath}/releases/tag/${original_tag}\nDiff: https://github.com/${repoPath}/compare/${original_old_tag}...${original_tag}`
                        break
                    } else if (tags.new[x] < tags.old[x]) {
                        message = `Detected release removal for ${repoName}.\nOld version: v${old_tag}\nNew version: v${tag}\nRelease url: https://github.com/${repoPath}/releases/tag/${original_tag}`
                        break
                    }
                }
                console.log(ts('ALERT'), message)
                if (TG_ENABLED) {
                    sendTgAlert(message)
                }
                if (DISC_ENABLED) {
                    sendDiscAlert(message)
                }
                if (SLACK_ENABLED) {
                    sendSlackAlert(message)
                }
                console.log(ts('INFO'), `Set updated tag to ${tag} for ${repoName}.`)
            }
        }
        tags[repoName] = original_tag
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