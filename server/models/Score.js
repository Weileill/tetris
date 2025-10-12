// server/models/Score.js
const mongoose = require('mongoose');


const ScoreSchema = new mongoose.Schema({
name: { type: String, default: 'Anonymous' },
score: { type: Number, default: 0 },
lines: { type: Number, default: 0 },
date: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Score', ScoreSchema);