const express = require("express");
const router = express.Router();
const cloudinary = require("../config/cloudinaryConfig");
const multer = require("multer");
const Exam = require("../models/Exam");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const keysecret = process.env.SECRET_KEY;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Create a new exam
router.post('/exams', async (req, res) => {
  const { Creater, title, date, startTime, endTime, questions } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  try {
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decodedToken = jwt.verify(token, keysecret);

    const newExam = new Exam({
      Creater,
      title,
      date,
      startTime,
      endTime,
      questions,
      tokens: [token]
    });

    const savedExam = await newExam.save();
    res.status(201).json({ message: "Exam created successfully", exam: savedExam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put('/exams/:examId', async (req, res) => {
  try {
    const { questions } = req.body; // Extract the questions array from the request body
    const { examId } = req.params;

    // Validate the questions array
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Questions must be a non-empty array" });
    }

    // Validate each question object
    const isValid = questions.every(question =>
      typeof question.title === "string" &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      typeof question.correctAnswer === "number" &&
      question.correctAnswer >= 0 &&
      question.correctAnswer < question.options.length
    );

    if (!isValid) {
      return res.status(400).json({ message: "Invalid question format" });
    }

    // Update the exam in the database
    const updatedExam = await Exam.findByIdAndUpdate(
      examId,
      { $set: { questions } },
      { new: true }
    );

    if (!updatedExam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    res.status(200).json({ message: "Exam updated successfully", updatedExam });
  } catch (error) {
    console.error("Error updating exam:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



// Get all exams by creator
router.get('/exams', async (req, res) => {
  const userEmail = req.query.email;

  try {
    const exams = await Exam.find({ Creater: userEmail });
    res.status(200).json({ exams });
  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete an exam
router.delete('/exams', async (req, res) => {
  const { title, email } = req.body;
  console.log(title,email);

  try {
    const result = await Exam.deleteOne({ title, Creater: email });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Exam not found" });
    }
    res.status(200).json({ message: "Exam deleted successfully" });
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({ message: "Failed to delete exam" });
  }
});

// Get a specific exam by ID
router.get('/exams/:id', async (req, res) => {
  const { id } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid exam ID" });
  }

  try {
    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }
    res.status(200).json(exam);
  } catch (error) {
    console.error("Error fetching exam:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all created exams
router.get('/created-exams', async (req, res) => {
  try {
    const exams = await Exam.find();
    res.status(200).json(exams);
  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// API to upload an image and associate it with an exam
router.post('/:examId/upload-image', upload.single('image'), async (req, res) => {
  console.log(req.file);
  try {
    const { examId } = req.params;

    // Upload image to Cloudinary
    let imageUrl = null;
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { resource_type: "image" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });

      imageUrl = result.secure_url;
    }

    // Update the exam with the image URL
    const updatedExam = await Exam.findByIdAndUpdate(
      examId,
      { $push: { images: imageUrl } }, // Assuming 'images' is an array in the schema
      { new: true }
    );

    res.status(200).json(updatedExam);
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// API to delete an image from an exam
router.delete('/:examId/delete-image', async (req, res) => {
  try {
    const { examId } = req.params;
    const { imageUrl } = req.body;

    // Extract public ID from the image URL
    const publicId = imageUrl.split('/').pop().split('.')[0];

    // Delete image from Cloudinary
    await cloudinary.uploader.destroy(publicId);

    // Remove image URL from the exam document
    const updatedExam = await Exam.findByIdAndUpdate(
      examId,
      { $pull: { images: imageUrl } }, // Assuming 'images' is an array in the schema
      { new: true }
    );

    res.status(200).json(updatedExam);
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
