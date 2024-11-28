const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['photo', 'sign'], required: true } // To differentiate between photo and sign
});

const Image = mongoose.model("Image", imageSchema);
module.exports = Image; 