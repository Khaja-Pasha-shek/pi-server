// models/Session.js
const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema({
  offset: { type: Number, required: true },
  digits: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  chipId: { type: String, required: true, index: true },     // Chip ID of ESP32
  uuid: { type: String, required: true, unique: true },      // Unique session ID
  validCount: { type: Number, default: 0 },                  // # of valid chunks
  invalidCount: { type: Number, default: 0 },                // # of invalid chunks
  validChunks: [chunkSchema],                                // All valid data
  invalidChunks: [chunkSchema],                              // All invalid data
  isActive: { type: Boolean, default: true },                // 👈 Added: session status
  createdAt: { type: Date, default: Date.now, index: true }  // Timestamp
});

module.exports = mongoose.model("Session", sessionSchema);
