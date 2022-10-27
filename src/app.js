// Import dependencies.
const request = require('request')
const fs = require('fs');

// Import utils.
const { ts } = require('./utils/ts')
const { sendTgAlert } = require('./utils/sendTgAlert');
const { sendDiscAlert } = require('./utils/sendDiscAlert');

const { versions: tags } = require('process');

// Load enviroment file
const dotenv = require("dotenv");
dotenv.config()
gitUser = process.env.GIT_USER
gitToken = process.env.GIT_TOKEN
pollTime = process.env.POLL_TIME * 60000
TG_ENABLED = process.env.TG_ENABLED || false
DISC_ENABLED = process.env.DISC_ENABLED || false

// Log start message.
console.log(ts(), 'Starting Github version poller.')
console.log(ts(), `Poll time set to: ${pollTime / 60000} minute(s). \n` + ts() + ` Telegram alerts enabled: ${TG_ENABLED}\n` + ts() + ` Discord alerts enabled: ${DISC_ENABLED}`)

// Load repo's from repository file.
console.log(ts(), `Loading repositories from repositories.json.`)
try {
    var repositories = require('../repositories.json')
} catch (e) {
    return console.log(ts(), 'Could not parse repository file.')
}
if (Object.keys(repositories).length === 0) {
    return console.log(ts(), 'No repositories found in file. Please supply at least one repository to start the script.')
}
console.log(ts(), `Loaded ${Object.keys(repositories).length} repositories.`)

// Loop function
async function loop() {
    global.tags = {}
    console.log(ts(), `Initiate poll round.`)
    for (x in repositories) {
        await pullVersion(x, repositories[x])
    }
    setTimeout(() => {
        loop()
    }, pollTime)
}

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
            tags[repoName] = tag
            console.log(ts(), `No old version detected for ${repoName}`)
        } else {
            let old_tag = tags[repoName]
            if (old_tag != tag) {
                message = `Update detected for ${repoName}. Old version: ${old_tag} New version: ${tag}.`
                console.log(message)
                if (TG_ENABLED === true) {
                    sendTgAlert(message)
                }
                if (DISC_ENABLED === true) {
                    sendDiscAlert(message)
                }
            }
            tags[repoName] = tag
        }
    });
}

// Run loop.
loop()
