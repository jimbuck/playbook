
let http = require('http');
const PORT = 6014;

let server = http.createServer((request, response) => {
  response.end('Request Path: ' + request.url);
});

server.listen(PORT, () => {
  console.log(`node-b server listening on: http://localhost:${PORT}`);
});