
var port = 6014;
var http = require('http');
var url = require('url')

var server = http.createServer(function (req, res) {
    var query = url.parse(req.url,true).query;
    var json = JSON.stringify(query, null, 4);
    console.log(json);
    res.writeHead(200, { 'Content-Type': 'application/json', "Access-Control-Allow-Origin":"*" });
    res.end(json);
});

server.listen(6014, () => {
    console.log(`Server listening on  port "${port}"...`);
});