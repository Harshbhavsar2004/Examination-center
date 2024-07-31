require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http").Server(app); 
const io = require("socket.io")(http);
const cors = require("cors");
const cookiParser = require("cookie-parser");
const userdb = require("./models/userSchema");

const jwt = require("jsonwebtoken");
const keysecret = process.env.SECRET_KEY; 

require("./db/conn");
// Middleware
app.use(cors({ origin: process.env.BASE_URL, credentials: true }));
app.use(express.json());
app.use(cookiParser());

// Routes
const router = require("./routes/router");
app.use(router);

// Default route
app.get('/', (req, res) => {
  res.send('Server is running...')
});
const checkValuesGreaterThan50 = async (token) => {
  try {
    if (!token) {
      throw new Error('Token not provided');
    }

    // Verify the token
    const decodedToken = jwt.verify(token, keysecret);

    // Find the user by ID
    const user = await userdb.findById(decodedToken._id);

    if (!user) {
      throw new Error('User not found');
    }
    const hasHighValues = user.left > 10 || user.right > 10 || user.Voice > 10;
    return hasHighValues;
  } catch (error) {
    console.error('Error checking values:', error);
    return false;
  }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');



  // Receive token from the client when connecting
  socket.on('verifyToken', async (token) => {
    try {
      const result = await checkValuesGreaterThan50(token);
      socket.emit('valuesCheck', result);
    } catch (error) {
      console.error('Error verifying token:', error);
      socket.emit('valuesCheck', false); // Send false in case of error
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
