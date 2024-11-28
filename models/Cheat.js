const mongoose = require("mongoose");

const cheatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Cheat = mongoose.model("Cheat", cheatSchema);
module.exports = Cheat; 