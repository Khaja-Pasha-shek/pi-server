const express = require("express");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const Session = require("./models/session");
const cors = require('cors');
require('dotenv').config();


const app = express();
const PORT = 3000;
const mongoURI = process.env.MONGO_URL;

// const mongoURI = "mongodb+srv://khajapasha:khaja@cluster0.iuqny57.mongodb.net/pi_validation?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const piDigits = fs.readFileSync("Million_pi.txt", "utf8").trim();
app.use(cors()); // Enable CORS for all origins by default

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "online", message: "Pi Validator is running." });
});

app.post("/session", async (req, res) => {
  const { chipId } = req.body;

  if (!chipId) {
    return res.status(400).json({ status: "error", reason: "chipId is required" });
  }

  const retryCount = await Session.countDocuments({ chipId });

  const newSession = new Session({
    chipId,
    uuid: uuidv4(),
    validChunks: [],
    invalidChunks: [],
    validCount: 0,
    invalidCount: 0,
    isActive: true
  });

  await newSession.save();

  res.json({ status: "ok", uuid: newSession.uuid, retryCount });
});

app.put("/validate", async (req, res) => {
  const { uuid, offset, digits } = req.body;

  if (!uuid || typeof offset !== "number" || typeof digits !== "string" || digits.length !== 100) {
    return res.status(400).json({ status: "error", reason: "Invalid input format" });
  }

  const session = await Session.findOne({ uuid });

  if (!session) {
    return res.status(404).json({ status: "error", reason: "Session not found" });
  }

  if (!session.isActive) {
    return res.status(403).json({ status: "error", reason: "Session is closed" });
  }

  const expected = piDigits.slice(offset, offset + 100);
  const chunk = { offset, digits, timestamp: new Date() };

  if (digits === expected) {
    session.validChunks.push(chunk);
    session.validCount++;
    await session.save();
    return res.json({ status: "ok" });
  } else {
    session.invalidChunks.push(chunk);
    session.invalidCount++;
    session.isActive = false;
    await session.save();
    return res.json({ status: "error", reason: "Digits mismatch. Session closed." });
  }
});


app.get("/sessions", async (req, res) => {
  const allSessions = await Session.find().sort({ createdAt: -1 });

  const chips = {};

  allSessions.forEach(session => {
    if (!chips[session.chipId]) {
      chips[session.chipId] = {
        id: session.chipId,
        sessions: [],
        createdAt: session.createdAt
      };
    }

    chips[session.chipId].sessions.push({
      "session id": session.uuid,
      dataset: {
        valid: session.validChunks.map(c => ({
          offset: c.offset,
          data: c.digits,
          timestamp: c.timestamp
        })),
        invalid: session.invalidChunks.map(c => ({
          offset: c.offset,
          data: c.digits,
          timestamp: c.timestamp
        }))
      }
    });
  });

  res.json({ status: "ok", data: Object.values(chips) });
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
