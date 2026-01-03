// server.js
// A minimal Express server with simple GET and POST endpoints.

const express = require("express");
const app = express();
const PORT = 3000;

app.use(express.json()); // Middleware to parse JSON bodies

// Simple GET endpoint
app.get("/hello", (req, res) => {
  console.log("Request headers?????", req.headers);
  res.send("Hello, world!");
});

// Simple POST endpoint
app.post("/echo", (req, res) => {
  const data = req.body;
  res.json({ message: "You sent:", data });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
