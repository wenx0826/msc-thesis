var express = require('express');
var CircularJSON = require('circular-json');
var app = express();
var fs = require("fs");

const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false})) 

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }))
// parse application/json
app.use(express.json())

// app.get('/', function (req, res) {
//    // fs.readFile( __dirname + "/" + "users.json", 'utf8', function (err, data) {
//    //    console.log( data );
//    //    res.end( data );
//    // });
//   console.log(req);
//   res.send('Hello World');
//    // res.end();
// })
app.post('/add', (req, res) => {
  console.log(req.body);
  const data = CircularJSON.stringify(req);
  fs.writeFileSync('test.txt',data, err => {
    if (err) {
      console.error(err)
      return
    }
  })
  res.send('Received a POST HTTP method');
});

// https://lehre.bpm.in.tum.de/~ga94hor/
var server = app.listen(12233, function() {
   var host = server.address().address
   var port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)
   // let data = "This is a file containing a collection" +
   //    " of programming languages.\n" +
   //    "1. C\n2. C++\n3. Python";
   // fs.writeFileSync("programming.txt", data + (new Date() - 0), {
   //    flag: 'a'
   // });
})
