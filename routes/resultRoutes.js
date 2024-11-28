const express = require("express");
const router = express.Router();
const Result = require("../models/Result");
const jwt = require("jsonwebtoken");
const keysecret = process.env.SECRET_KEY;

// Store result
router.post('/results', async (req, res) => {
  const { examId, score } = req.body;
  const token = req.headers.authorization.split(" ")[1];

  try {
    const decodedToken = jwt.verify(token, keysecret);
    const userId = decodedToken._id;

    // Create a new result document
    const newResult = new Result({
      userId: userId,
      examId: examId,
      score: score
    });

    await newResult.save();
    res.status(200).json({ message: "Result recorded successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/results/:userId", async (req, res) => {
  const userId = req.params.userId;
  const results = await Result.find({ userId: userId });
  res.status(200).json(results);
});

router.get('/exam/:examId', async (req, res) => {
  try {
    const results = await Result.find({ examId: req.params.examId })
      .populate('userId', 'fname lname email'); // Populate user details

    if (!results.length) {
      return res.status(404).json({ message: "No results found for this exam" });
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
module.exports = router; 