const express = require("express");
const jwt = require("jsonwebtoken");
const meetRouter = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { liveSummary, summarizeCaptions, summarizeText } = require("../controllers/meetController");


const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadDir);
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, uniqueSuffix + path.extname(file.originalname));
	},
});

const upload = multer({ storage });

// Generate a fresh VideoSDK JWT token (valid for 24 hours)
function generateVideoSdkToken() {
	const apiKey = process.env.VIDEOSDK_API_KEY;
	const secret = process.env.VIDEOSDK_SECRET;

	const payload = {
		apikey: apiKey,
		permissions: ["allow_join", "allow_mod"],
	};

	return jwt.sign(payload, secret, {
		algorithm: "HS256",
		expiresIn: "24h",
	});
}

// Endpoint for frontend to get a fresh token
meetRouter.get("/get-token", (req, res) => {
	try {
		const token = generateVideoSdkToken();
		console.log("✅ Generated fresh VideoSDK token");
		res.json({ token });
	} catch (error) {
		console.error("❌ Error generating VideoSDK token:", error.message);
		res.status(500).json({ error: "Failed to generate token" });
	}
});

meetRouter.post("/create-room", async (req, res) => {
	try {
		if (typeof fetch !== 'function') {
			return res.status(500).json({ error: "Server fetch() is not available. Use Node.js 18+." });
		}
		const token = generateVideoSdkToken();

		const response = await fetch("https://api.videosdk.live/v2/rooms", {
			method: "POST",
			headers: {
				authorization: token,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({}),
		});

		if (!response.ok) {
			const errorBody = await response.text();
			console.error("❌ VideoSDK API error:", response.status, errorBody);
			throw new Error(`VideoSDK API error: ${response.statusText}`);
		}

		const data = await response.json();
		console.log("✅ Room created:", data.roomId);

		res.json({ roomId: data.roomId });
	} catch (error) {
		console.error("❌ Error creating VideoSDK room:", error.message);
		res.status(500).json({ error: "Failed to create meeting room" });
	}
});


const authenticateToken = require('../utils/auth');

meetRouter.post("/live-summary", upload.single("audio"), liveSummary)

meetRouter.post('/summarize-captions', authenticateToken, summarizeCaptions);

const { startMeet, endMeet } = require("../controllers/meetController");

meetRouter.post("/start-classroom-meet", authenticateToken, startMeet);
meetRouter.post("/end-classroom-meet", authenticateToken, endMeet);
meetRouter.post("/end-meet", authenticateToken, endMeet);
meetRouter.post("/summarize-text", authenticateToken, summarizeText);

module.exports = { meetRouter };
