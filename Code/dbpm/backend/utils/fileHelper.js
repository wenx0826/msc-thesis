import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsPath = path.join(__dirname, "..", "..", "data", "models");

const read = (filePath) => {
  return fs.readFileSync(filePath, "utf8");
};

const write = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const deleteFile = (filePath) => {
  fs.unlink(filePath, () => {}); // Ignore errors
};

const countWords = (text) => {
  return text.split(/\s+/).filter(Boolean).length || 0;
};

export { read, write, deleteFile as delete, countWords };
