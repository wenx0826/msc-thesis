import fs from "fs";
import fastify from "fastify";
import path from "path";
import { fileURLToPath } from "url";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensurePersistenceFolders(persistenceRoot) {
  [
    persistenceRoot,
    path.join(persistenceRoot, "documents"),
    path.join(persistenceRoot, "models"),
    path.join(persistenceRoot, "logs"),
  ].forEach((dirPath) => {
    fs.mkdirSync(dirPath, { recursive: true });
  });
}

export default async function (options = {}) {
  const app = fastify({ logger: false, ...options });
  const persistenceRoot = path.join(__dirname, "..", "persistence");
  ensurePersistenceFolders(persistenceRoot);

  const [
    { default: projectsRoutes },
    { default: documentsRoutes },
    { default: modelsRoutes },
    { default: documentModelLinksRoutes },
  ] = await Promise.all([
    import("./modules/projects/routes.js"),
    import("./modules/documents/routes.js"),
    import("./modules/models/routes.js"),
    import("./modules/document_model_links/routes.js"),
  ]);

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
    root: persistenceRoot,
    prefix: "/persistence",
    decorateReply: false,
  });

  app.register(projectsRoutes, { prefix: "/projects" });
  app.register(documentsRoutes, { prefix: "/documents" });
  app.register(modelsRoutes, { prefix: "/models" });
  app.register(documentModelLinksRoutes, { prefix: "/document-model-links" });

  return app;
}
