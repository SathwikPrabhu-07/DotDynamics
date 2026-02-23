import { parseProblem } from "./services/physicsParser.js";

/**
 * Vercel Serverless Function: /api/analyze
 * Replaces the Express.js POST /analyze route.
 */
export default async function handler(req, res) {
    // 1. Method verification
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method Not Allowed",
            hint: "Please use POST to /api/analyze"
        });
    }

    try {
        // 2. Input extraction
        const { problem } = req.body;

        // 3. Validation
        if (!problem || typeof problem !== "string" || problem.trim().length === 0) {
            return res.status(400).json({
                error: "Missing or empty 'problem' field.",
                hint: 'Send { "problem": "A ball is thrown upward at 25 m/s" }'
            });
        }

        // 4. Physics Analysis
        const result = parseProblem(problem.trim());

        // 5. Error handling for parser
        if (result.error) {
            return res.status(400).json(result);
        }

        // 6. Success Response
        return res.status(200).json(result);

    } catch (error) {
        console.error("Vercel API Error (/api/analyze):", error);

        return res.status(500).json({
            error: "Internal Server Error",
            message: process.env.NODE_ENV === "development" ? error.message : "Physics engine failure"
        });
    }
}
