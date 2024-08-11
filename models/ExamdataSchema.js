const { mongoose } = require("mongoose");

const examSchema = new mongoose.Schema({
    Creater :{
      type:String,
    },
    title: String,
    date: Date,
    startTime: String,
    endTime: String,
    questions: [
      {
        title: String,
        options: [String],
        correctAnswer: String,
      },
    ],
    tokens: [ String ],
    Users : [{
      name:String,
      score:Number
    }]
  });
 

  const examData = new mongoose.model("Examdata" , examSchema)
  
  module.exports = examData