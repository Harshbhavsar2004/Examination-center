const express = require("express");
const router = express.Router();
const Cheat = require("../models/Cheat");
const jwt = require("jsonwebtoken");
const keysecret = process.env.SECRET_KEY;
const limiter = require("../middleware/limiter");

// Store left action
router.post("/left", limiter, async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];

  try {
    const decodedToken = jwt.verify(token, keysecret);
    const userId = decodedToken._id;

    const newCheat = new Cheat({
      userId: userId,
      type: "left"
    });

    await newCheat.save();
    res.status(200).json({ message: "Left action recorded successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Store right action
router.post("/right", limiter, async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];

  try {
    const decodedToken = jwt.verify(token, keysecret);
    const userId = decodedToken._id;

    const newCheat = new Cheat({
      userId: userId,
      type: "right"
    });

    await newCheat.save();
    res.status(200).json({ message: "Right action recorded successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Store voice action
router.post("/voice", limiter, async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];

  try {
    const decodedToken = jwt.verify(token, keysecret);
    const userId = decodedToken._id;

    const newCheat = new Cheat({
      userId: userId,
      type: "voice"
    });

    await newCheat.save();
    res.status(200).json({ message: "Voice action recorded successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Fetch cheat data on submit
router.post("/submit", limiter, async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];

  try {
    const decodedToken = jwt.verify(token, keysecret);
    const userId = decodedToken._id;

    const cheats = await Cheat.find({ userId: userId });

    if (cheats.length > 0) {
      res.status(200).json({ cheats });
    } else {
      res.status(404).json({ message: "No cheat data found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Fetch cheat data for a specific user
router.get("/cheat/:userId", async (req, res) => {
  try {
    const cheats = await Cheat.find({ userId: req.params.userId });
    res.status(200).json(cheats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/erase/:userId", async (req, res) => {
  const userId = req.params.userId;
  await Cheat.deleteMany({ userId: userId });
  res.status(200).json({ message: "Cheat data erased successfully" });
});


module.exports = router; 