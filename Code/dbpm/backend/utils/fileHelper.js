import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const documentsPath = path.join(__dirname, "..", "..", "data", "documents");
const modelsPath = path.join(__dirname, "..", "..", "data", "models");

const readDocumentContent = (docId) => {
  const contentFile = path.join(documentsPath, `${docId}.html`);
  return fs.readFileSync(contentFile, "utf8");
};

const writeDocumentContent = (docId, content) => {
  const contentFile = path.join(documentsPath, `${docId}.html`);
  fs.writeFileSync(contentFile, content);
};

const deleteDocumentFile = (docId) => {
  const contentFile = path.join(documentsPath, `${docId}.html`);
  fs.unlink(contentFile, () => {}); // Ignore errors
};

const readModelData = (modelId) => {
  const modelFile = path.join(modelsPath, `${modelId}.xml`);
  return fs.readFileSync(modelFile, "utf8");
};

const writeModelData = (modelId, data) => {
  const modelFile = path.join(modelsPath, `${modelId}.xml`);
  fs.writeFileSync(modelFile, data);
};

const deleteModelFile = (modelId) => {
  const modelFile = path.join(modelsPath, `${modelId}.xml`);
  fs.unlink(modelFile, () => {}); // Ignore errors
};

const countWords = (text) => {
  return text.split(/\s+/).filter(Boolean).length || 0;
};

export {
  readDocumentContent,
  writeDocumentContent,
  deleteDocumentFile,
  readModelData,
  writeModelData,
  deleteModelFile,
  countWords,
};
