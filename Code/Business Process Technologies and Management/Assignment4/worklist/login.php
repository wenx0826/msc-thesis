<?PHP
header("Content-Type: text/html; charset=utf8");
$user_id = $_POST['uid'];
$doc = new DOMDocument();
$doc->load('orgmodel.xml');
$subjects = $doc->getElementsByTagName("subject");
foreach ($subjects as $subject) {
  $uid = $subject->getAttribute("uid");
  if ($uid == $user_id) {
    header("refresh:0;url=worklist.html");
    exit;
  } else {
    echo "Invalid user id";
    header('refresh:3; url=login.html');
  }
}
?>
