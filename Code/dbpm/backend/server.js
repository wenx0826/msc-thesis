const express = require("express");
const path = require("path");

// Import routes
const logsRoutes = require("./routes/logs");
const projectsRoutes = require("./routes/projects");
const documentsRoutes = require("./routes/documents");
const modelsRoutes = require("./routes/models");
const tracesRoutes = require("./routes/traces");
const statsRoutes = require("./routes/stats");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.use("/data", express.static(path.join(__dirname, "..", "data")));

// Register routes
app.use("/logs", logsRoutes);
app.use("/projects", projectsRoutes);
app.use("/documents", documentsRoutes);
app.use("/models", modelsRoutes);
app.use("/traces", tracesRoutes);
app.use("/stats", statsRoutes);

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log("Database initialized successfully");
});

server.on("error", (err) => {
  console.error("Failed to start server:", err.message);
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
  } else if (err.code === "EACCES") {
    console.error(`Permission denied for port ${PORT}.`);
  }
});
