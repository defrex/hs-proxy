#!/usr/bin/env node

var http = require('http'),
    fs = require('fs'),
    cli = require('cli'),
    _ = require('underscore')._;

cli.parse({
  map: ['m', 'Map of hostnames to local ports', 'path', './hosts.json']
});

cli.main(function(args, opt){
  fs.readFile(opt.map, 'utf8', function(err, data){
    if (err) cli.fatal(err);
    try{
      var map = JSON.parse(data);
    }catch(e){
      cli.fatal('Unable to parse host mpa: '+e.stack);
    }

    http.createServer(function(request, response) {
      var port = map[request.headers['host']];
      if (_.isUndefined(port))
        return cli.error('No port for host: '+request.headers['host']);
      cli.info('passing request from: '+request.headers['host']
          +' to port: '+port);

      var proxy = http.createClient(port, '127.0.0.1');
      var proxy_request = proxy.request(request.method,
            request.url, request.headers);
      proxy_request.addListener('response', function (proxy_response) {
        proxy_response.addListener('data', function(chunk) {
          response.write(chunk, 'binary');
        });
        proxy_response.addListener('end', function() {
          response.end();
        });
        response.writeHead(proxy_response.statusCode, proxy_response.headers);
      });
      request.addListener('data', function(chunk) {
        proxy_request.write(chunk, 'binary');
      });
      request.addListener('end', function() {
        proxy_request.end();
      });
    }).listen(80, '0.0.0.0');
    cli.info('proxy listening on http://0.0.0.0:80')
  });
});
