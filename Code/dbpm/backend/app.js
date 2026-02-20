import fastify from "fastify";
import path from "path";
import { fileURLToPath } from "url";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";

import projectsRoutes from "./modules/projects/routes.js";
import documentsRoutes from "./modules/documents/routes.js";
import modelsRoutes from "./modules/models/routes.js";
import tracesRoutes from "./modules/traces/routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildApp(options = {}) {
  const app = fastify({ logger: false, ...options });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(fastifyStatic, {
    root: path.join(__dirname, "..", "frontend"),
    prefix: "/",
  });

  await app.register(fastifyStatic, {
    root: path.join(__dirname, "..", "data"),
    prefix: "/data",
    decorateReply: false,
  });

  app.register(projectsRoutes, { prefix: "/projects" });
  app.register(documentsRoutes, { prefix: "/documents" });
  app.register(modelsRoutes, { prefix: "/models" });
  app.register(tracesRoutes, { prefix: "/traces" });

  return app;
}

export default buildApp;
