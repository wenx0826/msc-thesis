#!/usr/bin/env node

const fs = require('fs')
const parseString = require('xml2js').parseString;
fs.readFile("./YMY.bpmn", "utf8", function(err, data) {
  let xml = data
  parseString(xml, function(err, result) {
    const content = JSON.stringify(result, null, 2)
    fs.writeFile('YMY.json', content, (err) => {})
  })
});
