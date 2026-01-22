// server.js
// A minimal Express server with simple GET and POST endpoints.

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const app = express();
const PORT = 3000;

const projectsFile = path.join(__dirname, "..", "data", "projects.json");

app.use(express.json()); // Middleware to parse JSON bodies

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

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Simple GET endpoint
app.get("/hello", (req, res) => {
  console.log("Request headers?????", req.headers);
  res.send("Hello, world!");
});

// Simple POST endpoint
app.post("/test", (req, res) => {
  const data = req.body;
  res.json({ message: "You sent:", data });
});

//

app.get("/projects", (req, res) => {
  console.log("Fetching project list...");
  fs.readFile(projectsFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.json([]); // File doesn't exist, return empty array
      }
      return res.status(500).json({ error: "Failed to read projects file" });
    }
    try {
      let projects = data.trim() ? JSON.parse(data) : [];
      projects = projects.map(({ documents, ...rest }) => rest);
      res.json(projects);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse projects file" });
    }
  });
});
app.get("/projects/:id", (req, res) => {
  const projectId = req.params.id;
  fs.readFile(projectsFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({ error: "Project not found" });
      }
      return res.status(500).json({ error: "Failed to read projects file" });
    }
    try {
      const projects = data.trim() ? JSON.parse(data) : [];
      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse projects file" });
    }
  });
});

app.post("/projects", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Missing name" });
  }
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const project = {
    id,
    name,
    updatedAt: timestamp,
    documents: [],
  };
  fs.readFile(projectsFile, "utf8", (err, data) => {
    let projects = [];
    if (!err) {
      try {
        projects = data.trim() ? JSON.parse(data) : [];
      } catch (e) {
        return res.status(500).json({ error: "Failed to parse projects file" });
      }
    }

    projects.push(project);
    fs.writeFile(projectsFile, JSON.stringify(projects, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to write projects file" });
      }
      res.json({ message: "Project created", id, name, updatedAt: timestamp });
    });
  });
});

app.get("/test", async (req, res) => {
  try {
    const fd = new FormData();
    fd.append(
      "rpst_xml",
      new Blob([`<description xmlns="http://cpee.org/ns/description/1.0"/>`], {
        type: "text/xml",
      }),
      "rpst.xml",
    );
    fd.append(
      "user_input",
      new Blob(["hello"], { type: "text/plain" }),
      "input.txt",
    );
    fd.append(
      "llm",
      new Blob(["gemini-2.0-flash"], { type: "text/plain" }),
      "llm.txt",
    );

    // 2️⃣ 后端直接发 POST 请求
    const response = await fetch("https://autobpmn.ai/llm/", {
      method: "POST",
      body: fd,
    });

    // 3️⃣ 把结果完整返回出来，方便你看
    const text = await response.text();

    res.status(200).json({
      upstreamStatus: response.status,
      upstreamHeaders: Object.fromEntries(response.headers.entries()),
      upstreamBody: text,
    });
  } catch (err) {
    res.status(500).json({
      error: String(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
