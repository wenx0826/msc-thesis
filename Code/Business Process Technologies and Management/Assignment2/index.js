// const parseString = require('xml2js').parseString

// console.log(parseString)
const express = require('express');
console.log(express)

const PORT = process.env.PORT || 3000;
const app = express();
console.log(PORT)
app.use((req, res, next) => {
 console.log('%O', req);
 next();
});

app.get('/', (req, res) => {
 res.send('Hello World');
});

app.listen(PORT, () => {
 console.log('Server running on port %d', PORT);
});



