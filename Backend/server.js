const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const twilio = require('twilio');
const OpenAI = require('openai');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Twilio Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'A**********************************';
const authToken = process.env.TWILIO_AUTH_TOKEN || '2***************************************e';
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+1**************5';
const twilioClient = new twilio(accountSid, authToken);

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/foodDonationDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.error("MongoDB connection error:", err));

// Routes
app.use('/api/auth', authRoutes);

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

// Handle Complaint Submission
app.post("/api/submit-complaint", async (req, res) => {
    try {
        const { name, email, complaint } = req.body;
        if (!name || !email || !complaint) {
            return res.status(400).json({ message: "All fields are required!" });
        }
        const newComplaint = new Complaint({ name, email, complaint });
        await newComplaint.save();
        console.log("Complaint saved:", newComplaint);
        res.json({ message: "Complaint submitted successfully!" });
    } catch (error) {
        console.error("Error saving complaint:", error);
        res.status(500).json({ message: "Error submitting complaint!", error: error.message });
    }
});

// Handle Food Request Submission
// Handle Food Request Submission
app.post("/api/request-food", async (req, res) => {
    try {
        const { requestorName, requestorMobile, requestorLocation } = req.body;
        if (!requestorName || !requestorMobile || !requestorLocation) {
            return res.status(400).json({ message: "All fields are required!" });
        }
        const newRequest = new FoodRequest({ requestorName, requestorMobile, requestorLocation });
        await newRequest.save();
        console.log("Food request saved:", newRequest);
        res.status(201).json({ message: "Food request submitted successfully!" });
    } catch (error) {
        console.error("Error saving food request:", error);
        res.status(500).json({ message: "Error submitting food request!", error: error.message });
    }
});

// Get All Food Requests
app.get("/api/food-requests", async (req, res) => {
    try {
        const requests = await FoodRequest.find().sort({ timestamp: -1 });
        res.json(requests);
    } catch (error) {
        console.error("Error fetching food requests:", error);
        res.status(500).json({ message: "Error fetching requests!", error: error.message });
    }
});

// Accept a Food Request
app.patch("/api/food-requests/:id/accept", async (req, res) => {
    try {
        const request = await FoodRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }
        request.status = 'accepted';
        await request.save();
        console.log("Food request accepted:", request);
        res.json({ message: "Request accepted successfully!" });
    } catch (error) {
        console.error("Error accepting request:", error);
        res.status(500).json({ message: "Error accepting request!", error: error.message });
    }
});


// Handle Donation Submission
app.post("/submit-donation", async (req, res) => {
    try {
        const { name, email, mobile, foodDetails, expiryDate, location } = req.body;
        if (!name || !email || !mobile || !foodDetails || !expiryDate || !location) {
            return res.status(400).json({ message: "All fields are required!" });
        }
        const newDonation = new Donation({
            name,
            email,
            mobile,
            foodDetails,
            expiryDate,
            location
        });
        await newDonation.save();
        console.log("Donation saved:", newDonation);
        res.status(201).json({ message: "Donation submitted successfully!" });
    } catch (error) {
        console.error("Error saving donation:", error);
        res.status(500).json({ message: "Error submitting donation!", error: error.message });
    }
});

// Get All Donations
app.get("/api/donations", async (req, res) => {
    try {
        const donations = await Donation.find().sort({ submittedAt: -1 });
        res.json(donations);
    } catch (error) {
        console.error("Error fetching donations:", error);
        res.status(500).json({ message: "Error fetching donations!", error: error.message });
    }
});

// Accept a Donation + Send SMS
app.patch("/api/donations/:id/accept", async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) {
            return res.status(404).json({ message: "Donation not found" });
        }
        donation.status = 'Accepted';
        await donation.save();
        console.log("Donation accepted:", donation);

        // Send SMS
        await twilioClient.messages.create({
            body: 'Your donation has been accepted',
            from: twilioPhoneNumber,
            to: donation.mobile
        });
        console.log(`SMS sent to ${donation.mobile}`);

        res.json({ message: "Donation accepted successfully!" });
    } catch (error) {
        console.error("Error accepting donation or sending SMS:", error);
        res.status(500).json({ message: "Error accepting donation or sending SMS!", error: error.message });
    }
});

// AI Chat Endpoint (OpenAI GPT Chatbot)
 
const { GoogleGenerativeAI } = require("@google/generative-ai");

 
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// 🌟 System instruction for the chatbot
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `System Prompt / Instruction for AI Chatbot:
 You are a helpful, friendly, and intelligent AI assistant designed to assist users on the Community Food Donation Platform. Your goal is to provide clear, accurate, and easy-to-understand guidance on how users can donate food, request food, log in or sign up, manage donations, and use other features of the platform. Always maintain a warm, welcoming tone and answer in simple, step-by-step language suitable for all users, including those who are new to using technology.

The chatbot must understand and respond to user queries related to:

✅ Main Topics to Cover
How to Donate Food

Steps to donate food

Required information while donating

How to select food categories and quantity

Scheduling pickup (if applicable)

Confirmation after donation

How to Request Food

Who is the founder of this Platform ?
Answer - Udit Kumar

Who is the CEO of this Platform ?
Answer - Hema Charan

Who is the Operations Manager of this Platform ?
Answer - Dheeraj Kotla

Who is the Community Outreach of this Platform ?
Answer - Nihar Reddy

Who is the Team Behind this platform?
Answer - Udit Kumar (Founder)
      Hema Charan (CEO)
      Nihar Reddy (Community Outreach)
      Kotla Dheeraj (Operations Manager)

Steps to place a food request

Location-based search

How to filter or sort by food type/availability

Request status tracking

Login / Signup Help

How to create an account as a Donor or Requester

Required fields: Name, Mobile Number, Role, Password

Password requirements (min. 6 characters, etc.)

Login troubleshooting (e.g., forgot password)

Accepting or Managing Donations (For Requesters)

How to view available donations

Steps to accept a donation

Notifications for accepted donations

Cancellation policy or process (if allowed)

Profile & Session

How to update profile information

How to log out

Switching roles between Donor and Requester

Contact Us & Reporting Issues

How to contact support

How to report a problem or give feedback

Where reports are stored (MongoDB)

Chatbot Smart Features

Answer follow-up questions

Guide the user if their query is unclear (e.g., “Could you please specify if you are trying to donate or request food?”)

Detect user role (Donor/Requester) from the conversation context and tailor responses accordingly

🧠 Intelligent Prompting Behavior Examples
If a user asks “I want to give food”, the bot should respond:

Great! Here's how you can donate food on our platform...

If a user types “How do I sign up?” or “Can I login without mobile number?”, the bot should respond:

To sign up, you’ll need to provide your name, mobile number, password, and select your role (Donor or Requester)...

If a user says “I accepted a donation, now what?”, the bot should respond:

Once you've accepted a donation, you’ll receive a confirmation with pickup/delivery instructions. You can also view it under the 'My Requests' section...

🛠 Technical and Platform-Specific Instructions (Internal Use)
Assume the platform uses MongoDB for storing user data, donations, and requests.

Role-based access: Only Donors can post food, only Requesters can accept.

Use localStorage for session tracking.

Login is handled via a popup modal (not a separate page).

After login, a profile icon replaces the login button.

Show/hide password option in the login form.

Twilio integration is used for sending SMS alerts for accepted donations.,
`
});

// 🔧 Chat generation config
const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 819,
};

// 💬 In-memory session store
const chatSessions = new Map();

// 🧠 Handle chat messages
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;
    let sessionId = req.body.sessionId;

    // If no sessionId provided or invalid, create a new one
    if (!sessionId || !chatSessions.has(sessionId)) {
        sessionId = Math.random().toString(36).substring(2, 15);
        const chat = model.startChat({ generationConfig });
        chatSessions.set(sessionId, { chat, lastUsed: Date.now() });

        try {
            const warmup = await chat.sendMessage("Hello");
            const warmupReply = warmup.response?.candidates?.[0]?.content?.parts?.[0]?.text || "Hi there!";
            return res.json({ reply: warmupReply, sessionId });
        } catch (err) {
            console.error("Warm-up error:", err);
            return res.status(500).json({ error: "Failed to initialize chat session." });
        }
    }

    const session = chatSessions.get(sessionId);
    session.lastUsed = Date.now();

    if (userMessage) {
        try {
            const result = await session.chat.sendMessage(userMessage);
            const responseText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

            console.log(`[Session: ${sessionId}] User: ${userMessage}`);
            console.log(`[Session: ${sessionId}] Bot: ${responseText}`);

            if (responseText) {
                return res.json({ reply: responseText, sessionId });
            } else {
                return res.status(500).json({ error: 'No response from the AI.' });
            }
        } catch (err) {
            console.error("Chat error:", err);
            return res.status(500).json({ error: 'Error processing your message.' });
        }
    }

    return res.status(200).json({ reply: "How can I help you?", sessionId });
});

// ♻️ Optional: Clean up inactive sessions (every 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [id, session] of chatSessions) {
        if (now - session.lastUsed > 15 * 60 * 1000) {
            chatSessions.delete(id);
        }
    }
}, 10 * 60 * 1000);

// 🚀 Start the server
app.listen(port, () => {
    console.log(`✅ AI Chatbot Server running at http://localhost:${port}`);
});



// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
