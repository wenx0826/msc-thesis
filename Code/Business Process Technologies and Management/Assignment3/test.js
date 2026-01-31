const {
  Client,
  logger,
  Variables
} = require("camunda-external-task-client-js");

const config = {
  baseUrl: "http://localhost:3000/engine-rest",
  use: logger
};

const client = new Client(config);
const processVariables = new Variables();

client.subscribe("generateMaterialList", async function({ task, taskService }) {
  const n = Math.floor(Math.random() * 4 + 2);
  const materialList = new Array();
  for (var i = 0; i < n; i++) {
    materialList.push("Material" + i);
  }
  processVariables.set("materialList", JSON.stringify(materialList));
  await taskService.complete(task, processVariables);
});

client.subscribe("generateBill", async function({ task, taskService }) {
  const refineTimes = task.variables.get("refineTimes");
  const buildMethod = task.variables.get("buildMethod");
  const designFee = (350 + 50 * refineTimes);
  const buildFee = buildMethod === 'company' ? 3000 : 0;
  processVariables.set("bill", `Design fee: ${designFee}€\nBuild Fee: ${buildFee}€\nTotal: ${designFee + buildFee}€`);
  await taskService.complete(task, processVariables);
});

