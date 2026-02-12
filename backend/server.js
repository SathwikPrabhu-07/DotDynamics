const express = require("express");
const cors = require("cors");
const parseRouter = require("./routes/parse");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware — explicit CORS for cross-origin fetch from frontend
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
}));
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/parse", parseRouter);

// POST /analyze — alternate route for frontend compatibility
app.post("/analyze", (req, res) => {
    const { parseProblem } = require("./services/physicsParser");
    const { problem } = req.body;

    if (!problem || typeof problem !== "string" || problem.trim().length === 0) {
        return res.status(400).json({
            error: "Missing or empty 'problem' field.",
            hint: 'Send { "problem": "A ball is thrown upward at 25 m/s" }'
        });
    }

    const result = parseProblem(problem.trim());
    if (result.error) return res.status(400).json(result);
    return res.json(result);
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error." });
});

// Start server with EADDRINUSE auto-recovery
const startServer = () => {
    const server = app.listen(PORT, () => {
        console.log(`\n  🟢 DotDynamics Backend running on http://localhost:${PORT}`);
        console.log(`  📡 Health check: http://localhost:${PORT}/api/health`);
        console.log(`  🔬 Parse API:    POST http://localhost:${PORT}/api/parse\n`);
    });

    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.error(`\n  ⚠️  Port ${PORT} is already in use. Attempting to free it...`);
            const { execSync } = require("child_process");
            try {
                // Windows: find and kill the process using this port
                const result = execSync(
                    `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT} ^| findstr LISTENING') do @echo %a`,
                    { shell: "cmd.exe", encoding: "utf-8" }
                ).trim();
                const pids = [...new Set(result.split("\n").map(p => p.trim()).filter(Boolean))];
                for (const pid of pids) {
                    try {
                        execSync(`taskkill /PID ${pid} /F`, { shell: "cmd.exe", stdio: "ignore" });
                        console.log(`  ✅ Killed process ${pid} on port ${PORT}`);
                    } catch { }
                }
                // Retry after a short delay
                setTimeout(() => {
                    console.log(`  🔄 Retrying on port ${PORT}...\n`);
                    startServer();
                }, 1000);
            } catch (killErr) {
                console.error(`  ❌ Could not free port ${PORT}. Please run manually:`);
                console.error(`     netstat -ano | findstr :${PORT}`);
                console.error(`     taskkill /PID <PID> /F\n`);
                process.exit(1);
            }
        } else {
            console.error("Server error:", err);
            process.exit(1);
        }
    });

    // Graceful shutdown — releases port cleanly on Ctrl+C
    const shutdown = () => {
        console.log("\n  🔴 Shutting down gracefully...");
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 3000);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
};

startServer();

