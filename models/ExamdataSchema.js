const { mongoose } = require("mongoose");
const examSchema = new mongoose.Schema({
  Creater: {
    type: String,
    required: true,
  },
  title: {
    type: String
  },
  date: {
    type: Date
  },
  startTime: {
    type: String
  },
  endTime: {
    type: String
  },
  questions: [
    {
      title: String,
      options: [String],
      correctAnswer: String
    },
  ],
  tokens: [String],
  Users: [
    {
      name: String,
      score: Number,
    },
  ],
});

const examData = mongoose.model("Examdata", examSchema);

module.exports = examData;
