const jwt = require("jsonwebtoken");
const User = require("../models/User");

const keysecret = process.env.SECRET_KEY;

const authenticate = async (reqOrToken, res, next) => {
  try {
    let token;
    if (typeof reqOrToken === 'string') {
      // If a token is passed directly (Socket.IO)
      token = reqOrToken;
    } else {
      // If a request object is passed (HTTP)
      const authHeader = reqOrToken.headers.authorization;
      if (!authHeader) {
        throw new Error("No token provided");
      }
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      throw new Error("Token format is incorrect");
    }

    const verifytoken = jwt.verify(token, keysecret);
    const rootUser = await User.findOne({ _id: verifytoken._id });

    if (!rootUser) {
      throw new Error("User not found");
    }

    if (next) {
      reqOrToken.token = token;
      reqOrToken.rootUser = rootUser;
      reqOrToken.userId = rootUser._id;
      next();
    } else {
      return rootUser; // For Socket.IO
    }
  } catch (error) {
    console.error("Authentication error:", error);
    if (res) {
      res.status(401).json({ status: 401, message: "Unauthorized, token invalid or expired" });
    } else {
      throw error; // For Socket.IO
    }
  }
};

module.exports = authenticate;