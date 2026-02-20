import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "..", "..", "data");
const dbFiles = [
  "database.sqlite",
  "database.sqlite-wal",
  "database.sqlite-shm",
];

function deleteIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  fs.rmSync(filePath, { force: true });
  return true;
}

try {
  const deleted = dbFiles
    .map((file) => path.join(dataDir, file))
    .filter((filePath) => deleteIfExists(filePath));

  if (deleted.length === 0) {
    console.log("No database files found to delete.");
  } else {
    deleted.forEach((filePath) => console.log(`Deleted: ${filePath}`));
  }
} catch (err) {
  console.error("Failed to reset database files:", err.message);
  process.exit(1);
}
