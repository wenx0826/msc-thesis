<?php
header("content-type: application/json");
//header("CPEE-CALLBACK: true");
$task = array();
$task["headers"] = getallheaders();
$task["content"] = $_REQUEST;
//$task["post"] = $_POST;
//$key = $task["headers"]["Cpee-Callback-Id"];
//$role = $_REQUEST["role"];
//$tasks_json = file_get_contents("tasks.json");
//$tasks = json_decode("tasks_json", true);
//$tasks[$key] = $task;
file_put_contents("task", json_encode($task, JSON_PRETTY_PRINT));
//echo json_encode($task, JSON_PRETTY_PRINT);
exit;
?>