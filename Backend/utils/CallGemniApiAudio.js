require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

async function callGeminiAPIAudio(audioBase64, mimeType) {
    if (!audioBase64) return null;

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
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: `You are an AI teaching assistant. 
Summarize the following classroom audio in 2–3 sentences.
Do NOT transcribe.
Do NOT add disclaimers.
If audio is empty, return null.`,
                        },
                        {
                            inlineData: {
                                mimeType,
                                data: audioBase64,
                            },
                        },
                    ],
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

module.exports = { callGeminiAPIAudio };