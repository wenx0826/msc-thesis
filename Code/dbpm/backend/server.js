import fastify from "fastify";
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import projectsRoutes from "./modules/projects/projects.routes.js";
import documentsRoutes from "./modules/documents/documents.routes.js";
import modelsRoutes from "./modules/models/models.routes.js";
import tracesRoutes from "./modules/traces/traces.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = fastify({ logger: false });

// Register plugins
await app.register(import("@fastify/cors"), {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

await app.register(import("@fastify/static"), {
  root: path.join(__dirname, "..", "frontend"),
  prefix: "/",
});

await app.register(import("@fastify/static"), {
  root: path.join(__dirname, "..", "data"),
  prefix: "/data",
  decorateReply: false,
});

// Register routes
app.register(projectsRoutes, { prefix: "/projects" });
app.register(documentsRoutes, { prefix: "/documents" });
app.register(modelsRoutes, { prefix: "/models" });
app.register(tracesRoutes, { prefix: "/traces" });

// Start server
const start = async () => {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || "localhost";
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log("Database initialized successfully");
  } catch (err) {
    app.log.error(err);
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`);
    } else if (err.code === "EACCES") {
      console.error(`Permission denied for port ${PORT}.`);
    }
    process.exit(1);
  }
};

start();
