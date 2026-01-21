// server.js
// A minimal Express server with simple GET and POST endpoints.

const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3000;

const projectsPath = path.join(__dirname, "..", "data", "projects");

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
  fs.readdir(projectsPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read projects" });
    }
    const projects = files
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const id = f.replace(".json", "");
        try {
          const data = JSON.parse(
            fs.readFileSync(path.join(projectsPath, f), "utf8"),
          );
          console.log("Loaded project data:", data);
          return data;
        } catch (e) {
          return { id, name: "Error loading" };
        }
      });
    res.json(projects);
  });
});
app.get("/project/:id", (req, res) => {
  const projectId = req.params.id;
  const filePath = path.join(projectsPath, `${projectId}.json`);
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(JSON.parse(data));
  });
});
app.post("/project", (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: "Missing id or name" });
  }
  const filePath = path.join(projectsPath, `${id}.json`);
  fs.writeFile(filePath, JSON.stringify({ id, name }, null, 2), (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to write file" });
    }
    res.json({ message: "Project created", id, name });
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
