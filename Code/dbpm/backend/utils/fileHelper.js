import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsPath = path.join(__dirname, "..", "..", "data", "models");

const readTextFile = (filePath) => {
  return fs.readFileSync(filePath, "utf8");
};

const writeTextFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const deleteFile = (filePath) => {
  fs.unlink(filePath, () => {}); // Ignore errors
};

const readModelData = (modelId) => {
  const modelFile = path.join(modelsPath, `${modelId}.xml`);
  return readTextFile(modelFile);
};

const writeModelData = (modelId, data) => {
  const modelFile = path.join(modelsPath, `${modelId}.xml`);
  writeTextFile(modelFile, data);
};

const deleteModelFile = (modelId) => {
  const modelFile = path.join(modelsPath, `${modelId}.xml`);
  deleteFile(modelFile);
};

const countWords = (text) => {
  return text.split(/\s+/).filter(Boolean).length || 0;
};

export {
  readTextFile,
  writeTextFile,
  deleteFile,
  readModelData,
  writeModelData,
  deleteModelFile,
  countWords,
};
