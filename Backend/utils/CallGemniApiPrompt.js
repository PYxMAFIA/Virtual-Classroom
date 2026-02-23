require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

async function callGeminiAPI(prompt) {
    console.log("Gemini API called");

    if (typeof fetch !== "function") {
        throw new Error("Use Node.js 18+ or add a fetch polyfill.");
    }

    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
            system_instruction: {
                parts: [
                    {
                        text:
                            "You are a helpful teaching assistant that compares model answers with student answers and provides constructive, structured feedback.",
                    },
                ],
            },
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }],
                },
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${errorText}`);
    }

    const data = await response.json();

    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

module.exports = { callGeminiAPI };