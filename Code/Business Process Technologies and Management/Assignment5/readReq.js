const fs = require('fs')

fs.readFile('test.txt', 'utf8' , (err, data) => {
  if (err) {
    console.error(err)
    return
  }
  console.log(JSON.stringify(JSON.parse(data), null, "  "))
  // console.log(JSON.parse(data))
})
