const express = require("express");
const { parseProblem } = require("../services/physicsParser");

const router = express.Router();

/**
 * POST /api/parse
 * Body: { problem: string }
 * Returns: structured physics simulation JSON
 */
router.post("/", (req, res) => {
    try {
        const { problem } = req.body;

        if (!problem || typeof problem !== "string" || problem.trim().length === 0) {
            return res.status(400).json({
                error: "Missing or empty 'problem' field.",
                hint: "Send a JSON body with a 'problem' string, e.g. { \"problem\": \"A ball is thrown upward at 25 m/s\" }"
            });
        }

        const result = parseProblem(problem.trim());

        if (result.error) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (err) {
        console.error("Parse error:", err);
        return res.status(500).json({ error: "Internal server error while parsing problem." });
    }
});

module.exports = router;
