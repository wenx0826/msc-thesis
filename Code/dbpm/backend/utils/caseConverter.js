import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility functions for case conversion
const snakeToCamel = (str) => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

const camelToSnake = (str) => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

// Convert object keys from snake_case to camelCase
const convertKeysToCamelCase = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase);
  if (typeof obj !== "object") return obj;

  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    converted[snakeToCamel(key)] = convertKeysToCamelCase(value);
  }
  return converted;
};

// Convert object keys from camelCase to snake_case
const convertKeysToSnakeCase = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToSnakeCase);
  if (typeof obj !== "object") return obj;

  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    converted[camelToSnake(key)] = convertKeysToSnakeCase(value);
  }
  return converted;
};

export {
  snakeToCamel,
  camelToSnake,
  convertKeysToCamelCase,
  convertKeysToSnakeCase,
};
