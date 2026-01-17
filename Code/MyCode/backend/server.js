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
app.post("/test", (req, res) => {
  const data = req.body;
  res.json({ message: "You sent:", data });
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
