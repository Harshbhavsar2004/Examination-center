const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true },
    image: { type: String }
});

const examSchema = new mongoose.Schema({
    Creater: { type: String, required: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    questions: [questionSchema],
    images: [String],
    tokens: [String],
    Users: [{ name: String, score: Number }]
});

const Exam = mongoose.model("Exam", examSchema);
module.exports = Exam; 