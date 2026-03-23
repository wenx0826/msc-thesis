import buildApp from "./app.js";

// Start server
const start = async () => {
  const PORT = process.env.PORT || 6688;
  const HOST = process.env.HOST || "localhost";
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log("Database initialized successfully");
  } catch (err) {
    app.log.error(err);
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Another backend instance is likely still running. Stop it first or use "npm run dev:restart".`,
      );
    } else if (err.code === "EACCES") {
      console.error(`Permission denied for port ${PORT}.`);
    }
    process.exit(1);
  }
};

start();
