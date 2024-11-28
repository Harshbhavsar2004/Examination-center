require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("./db/conn");
const Cheat = require("./models/Cheat"); // Assuming you have a Cheat model
const authenticate = require("./middleware/authenticate");

// Middleware
app.use(cors({ origin: process.env.BASE_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
const userRoutes = require("./routes/userRoutes");
const examRoutes = require("./routes/examRoutes");
const cheatRoutes = require("./routes/cheatRoutes");
const resultRoutes = require("./routes/resultRoutes");

app.use("/api/users", userRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/cheats", cheatRoutes);
app.use("/api/results", resultRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('Server is running...')
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('verifyToken', async (token) => {
    try {
      const user = await authenticate(token); // Now returns the user directly
      if (user) {
        const cheatCount = await Cheat.countDocuments({ userId: user._id });
        if (cheatCount > 20) {
          socket.emit('blockExam', true);
        }
      }
    } catch (error) {
      console.error("Error verifying token:", error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`server is running on ${port}`);
});