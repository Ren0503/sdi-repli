const { createClient } = require("redis");
let redisClient = createClient({ legacyMode: true });
redisClient.connect().catch(console.error)
const moment = require('moment');


module.exports = (req, res, next) => {
    redisClient.exists(req.headers.user, (err, reply) => {
        if (err) {
            console.log("Redis not working...");
            process.exit(0);
        }
        if (reply === 1) {
            // user exists
            // check time interval
            redisClient.get(req.headers.user, (err, reply) => {
                let data = JSON.parse(reply)
                let currentTime = moment().unix()
                let difference = (currentTime - data.startTime) / 60
                if (difference >= 1) {
                    let body = {
                        'count': 1,
                        'startTime': moment().unix()
                    }
                    redisClient.set(req.headers.user, JSON.stringify(body))
                    // allow the request
                    next();
                }
                if (difference < 1) {
                    if (data.count > 3) {
                        return res.json({ "error": 1, "message": "throttled limit exceeded..." })
                    }
                    // update the count and allow the request
                    data.count++
                    redisClient.set(req.headers.user, JSON.stringify(data))
                    // allow request
                    next();
                }
            })
        } else {
            // add new user
            let body = {
                'count': 1,
                'startTime': moment().unix()
            }
            redisClient.set(req.headers.user, JSON.stringify(body))
            // allow request
            next();
        }
    })
}