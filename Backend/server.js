// ----------------------------
// 📌 CORE MODULES
// ----------------------------
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// ----------------------------
// 📌 EXTERNAL APIs
// ----------------------------
const twilio = require('twilio');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ----------------------------
// 📌 ROUTES
// ----------------------------
const authRoutes = require('./routes/auth');

const app = express();

// ----------------------------
// 📌 MIDDLEWARE
// ----------------------------
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------
// 📌 TWILIO CONFIG
// ----------------------------
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const twilioClient = new twilio(accountSid, authToken);

// ----------------------------
// 📌 MONGODB CONNECTION (Render + Atlas compatible)
// ----------------------------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✔ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ----------------------------
// 📌 AUTH ROUTES
// ----------------------------
app.use('/api/auth', authRoutes);

// ----------------------------
// 📌 SCHEMAS & MODELS
// ----------------------------

// Complaint Schema
const complaintSchema = new mongoose.Schema({
  name: String,
  email: String,
  complaint: String,
  date: { type: Date, default: Date.now }
});
const Complaint = mongoose.model("Complaint", complaintSchema);

// Food Request Schema
const foodRequestSchema = new mongoose.Schema({
  requestorName: { type: String, required: true },
  requestorMobile: { type: String, required: true },
  requestorLocation: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, default: 'pending', enum: ['pending', 'accepted'] }
});
const FoodRequest = mongoose.model("FoodRequest", foodRequestSchema);

// Donation Schema
const donationSchema = new mongoose.Schema({
  name: String,
  email: String,
  mobile: String,
  foodDetails: String,
  expiryDate: Date,
  location: String,
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'Listed on site', enum: ['Listed on site', 'Accepted'] }
});
const Donation = mongoose.model('Donation', donationSchema);

// ----------------------------
// 📌 DEFAULT ROUTE
// ----------------------------
app.get("/", (req, res) => {
  res.send("MealMitra Backend is running successfully!");
});

// ----------------------------
// 📌 COMPLAINT ROUTE
// ----------------------------
app.post("/api/submit-complaint", async (req, res) => {
  try {
    const { name, email, complaint } = req.body;

    if (!name || !email || !complaint)
      return res.status(400).json({ message: "All fields are required!" });

    await new Complaint({ name, email, complaint }).save();
    res.json({ message: "Complaint submitted successfully!" });

  } catch (error) {
    res.status(500).json({ message: "Error submitting complaint!", error: error.message });
  }
});

// ----------------------------
// 📌 FOOD REQUEST ROUTES
// ----------------------------
app.post("/api/request-food", async (req, res) => {
  try {
    const { requestorName, requestorMobile, requestorLocation } = req.body;

    if (!requestorName || !requestorMobile || !requestorLocation)
      return res.status(400).json({ message: "All fields are required!" });

    await new FoodRequest({ requestorName, requestorMobile, requestorLocation }).save();
    res.status(201).json({ message: "Food request submitted successfully!" });

  } catch (error) {
    res.status(500).json({ message: "Error submitting food request!", error: error.message });
  }
});

app.get("/api/food-requests", async (req, res) => {
  try {
    const requests = await FoodRequest.find().sort({ timestamp: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching requests!", error: error.message });
  }
});

app.patch("/api/food-requests/:id/accept", async (req, res) => {
  try {
    const request = await FoodRequest.findById(req.params.id);

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    request.status = 'accepted';
    await request.save();

    res.json({ message: "Request accepted successfully!" });

  } catch (error) {
    res.status(500).json({ message: "Error accepting request!", error: error.message });
  }
});

// ----------------------------
// 📌 DONATION ROUTES
// ----------------------------
app.post("/api/submit-donation", async (req, res) => {
  try {
    const { name, email, mobile, foodDetails, expiryDate, location } = req.body;

    if (!name || !email || !mobile || !foodDetails || !expiryDate || !location)
      return res.status(400).json({ message: "All fields are required!" });

    await new Donation({ name, email, mobile, foodDetails, expiryDate, location }).save();
    res.status(201).json({ message: "Donation submitted successfully!" });

  } catch (error) {
    res.status(500).json({ message: "Error submitting donation!", error: error.message });
  }
});

app.get("/api/donations", async (req, res) => {
  try {
    const donations = await Donation.find().sort({ submittedAt: -1 });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: "Error fetching donations!", error: error.message });
  }
});

app.patch("/api/donations/:id/accept", async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation)
      return res.status(404).json({ message: "Donation not found" });

    donation.status = 'Accepted';
    await donation.save();

    // Send SMS using Twilio
    await twilioClient.messages.create({
      body: 'Your donation has been accepted',
      from: twilioPhoneNumber,
      to: donation.mobile
    });

    res.json({ message: "Donation accepted & SMS sent!" });

  } catch (error) {
    res.status(500).json({ message: "Error accepting donation!", error: error.message });
  }
});

// ----------------------------
// 📌 AI CHATBOT (Gemini)
// ----------------------------
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: `You are MealMitra chatbot assistant.`
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 819,
};

const chatSessions = new Map();

app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;
  let sessionId = req.body.sessionId;

  if (!sessionId || !chatSessions.has(sessionId)) {
    sessionId = Math.random().toString(36).slice(2);
    const chat = model.startChat({ generationConfig });
    chatSessions.set(sessionId, { chat, lastUsed: Date.now() });

    const warmup = await chat.sendMessage("Hello");
    const warmupReply = warmup.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    return res.json({ reply: warmupReply || "Hi!", sessionId });
  }

  const session = chatSessions.get(sessionId);
  session.lastUsed = Date.now();

  try {
    const result = await session.chat.sendMessage(userMessage);
    const reply = result.response.candidates?.[0]?.content?.parts?.[0]?.text;

    return res.json({ reply, sessionId });

  } catch (err) {
    return res.status(500).json({ error: "Error processing message" });
  }
});

// Clean old sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of chatSessions) {
    if (now - session.lastUsed > 15 * 60 * 1000) chatSessions.delete(id);
  }
}, 10 * 60 * 1000);

// ----------------------------
// 🚀 START SERVER
// ----------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🔥 Server running on http://localhost:${PORT}`)
);
