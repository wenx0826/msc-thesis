import fs from "fs";
import path from "path";

const read = (filePath) => {
  return fs.readFileSync(filePath, "utf8");
};

const write = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const append = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, content);
};

const deleteFile = (filePath) => {
  fs.unlink(filePath, () => {}); // Ignore errors
};

const countWords = (text) => {
  return text.split(/\s+/).filter(Boolean).length || 0;
};

export { read, write, append, deleteFile as delete, countWords };
