// Home Init - Entry point for index.html
import { initProjectsUI } from "./projects.ui.js";

console.log(
  "home/init.js - Starting initialization...",
  new Date().toISOString(),
);

$(function () {
  initProjectsUI();
});
