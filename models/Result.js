const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    score: { type: Number, required: true }
});

const Result = mongoose.model("Result", resultSchema);
module.exports = Result; 