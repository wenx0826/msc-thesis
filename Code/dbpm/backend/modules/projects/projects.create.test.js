import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import buildApp from "../app.js";
import db from "../database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, "..", "..", "data", "logs");

test("POST /projects creates a new project", async (t) => {
  const app = await buildApp();
  let createdProjectId = null;

  // t.after(async () => {
  //   await app.close();
  //   if (createdProjectId) {
  //     db.prepare("DELETE FROM projects WHERE id = ?").run(createdProjectId);
  //     await new Promise((resolve) => setTimeout(resolve, 50));
  //     await fs.rm(path.join(logsDir, `${createdProjectId}.yaml`), {
  //       force: true,
  //     });
  //   }
  // });

  const response = await app.inject({
    method: "POST",
    url: "/projects",
    payload: {
      name: `test-project-${Date.now()}`,
    },
  });

  assert.equal(response.statusCode, 200);

  const body = response.json();
  assert.equal(typeof body.id, "string");
  assert.ok(body.id.length > 0);

  createdProjectId = body.id;
  const inserted = db
    .prepare("SELECT id FROM projects WHERE id = ?")
    .get(createdProjectId);
  assert.equal(inserted?.id, createdProjectId);
});
