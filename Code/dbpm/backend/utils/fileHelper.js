import fs from "fs";

const read = (filePath) => {
  return fs.readFileSync(filePath, "utf8");
};

const write = (filePath, content) => {
  fs.writeFileSync(filePath, content);
};

const append = (filePath, content) => {
  fs.appendFileSync(filePath, content);
};

const deleteFile = (filePath) => {
  fs.unlink(filePath, () => {}); // Ignore errors
};

const countWords = (text) => {
  return text.split(/\s+/).filter(Boolean).length || 0;
};

export { read, write, append, deleteFile as delete, countWords };
