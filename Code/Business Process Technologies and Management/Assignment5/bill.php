<?php
header('content-type: application/json');
$refineTimes = $_REQUEST["refineTimes"];
$buildMethod = $_REQUEST["buildMethod"];
$result = array();
$result['designFee'] = 350 + 50 * $refineTimes;
if ($buildMethod === "company") {
  $result['buildFee'] = 3000;
} else {
  $result['buildFee'] = 0;
}
echo json_encode($result, true);
exit();
?>