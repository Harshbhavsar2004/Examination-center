const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 1000, // 1 second
    max: 1, // Limit each IP to 1 request per `windowMs`
    message: {
      message: "Too many requests, please try again after a second",
    },
  });

module.exports = limiter