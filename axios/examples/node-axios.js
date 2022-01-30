const http = require('http');
const axios = require('../lib/axios')

server = http.createServer(function (req, res) {
  setTimeout(function () {
    res.end();
  }, 10000);
}).listen(4444, function () {
  var success = false, failure = false;
  var error;
  console.log('333');

  axios.get('https://jsonplaceholder.typicode.com/todos/1', {
    timeout: 200,
  }).then(function (res) {
    success = true;
    console.log('res', res.data)
  }).catch(function (err) {
    error = err;
    failure = true;
  });
});
