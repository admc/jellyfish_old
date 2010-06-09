var sys = require("sys")
  ,http = require("http")
  ,url = require("url")
  ,path = require('path')
  ,paperboy = require('./lib/paperboy')
  ,WEBROOT = path.join(path.dirname(__filename), 'static');

var tentacles = {};

var requestHandler = function (clientRequest, clientResponse) {
  var req = clientRequest;
  var res = clientResponse;
  var ip = req.connection.remoteAddress;
  var uri = url.parse(clientRequest.url);
  if (uri.port == undefined) {
    uri.port = {"http:":80,"https:":443}[uri.protocol]
  }
  var pathname = uri.search ? uri.pathname + uri.search : uri.pathname
  //sys.puts(pathname)
  
  //communcation loop
  if (pathname.indexOf('jelly-poll') != -1) {
    var tid = pathname.split("=")[1];
    var data = '';
    if (tentacles[tid].queue.length != 0){
      data = tentacles[tid].queue.shift();
    }
    var dataString = JSON.stringify(data);
    req.headers['content-type'] = 'application/json';
    req.headers['content-length'] = dataString.length;
    clientResponse.writeHead(200, req.headers);
    clientResponse.write(dataString);
    clientResponse.end();
  }
  //register frames
  else if (pathname.indexOf('jelly-net/add') != -1) {
    var newDate = new Date;
    var id = newDate.getTime();
    clientRequest.addListener("data", function (chunk) {
      sys.puts("Adding tentacle, "+id+" : "+chunk);
      eval("var tObj="+chunk);
      tObj.active = true;
      tObj.queue = [];
      tentacles[id] = tObj;
    })
    var data = {};
    data.id = id;
    var dataString = JSON.stringify(data);
    req.headers['content-type'] = 'application/json';
    req.headers['content-length'] = dataString.length;
    clientResponse.writeHead(200, req.headers);
    clientResponse.write(dataString);
    clientResponse.end();
  }
  //unregister frames
  else if (pathname.indexOf('jelly-net/rm') != -1) {
    var tid = pathname.split("=")[1];
    sys.puts("Removing tentacle: "+tid+": "+JSON.stringify(tentacles[tid]));
    delete tentacles[tid];
    
    var data = "OK";
    var dataString = JSON.stringify(data);
    req.headers['content-type'] = 'application/json';
    req.headers['content-length'] = dataString.length;
    clientResponse.writeHead(200, req.headers);
    clientResponse.write(JSON.stringify(dataString));
    clientResponse.end();
  }
  //Serve up static files
  else if (pathname.indexOf('jelly-serv') != -1) {
    //if jelly-serv is involved, we rm the whole path except the file
    //name and serve it from the static directory
    var fname = req.url.split("/");
    req.url = req.url.replace(pathname, "/" + fname[fname.length -1]);

    paperboy
    .deliver(WEBROOT, req, res)
    .before(function() {
      //sys.puts('About to deliver: '+req.url);
    })
    .after(function() {
      //sys.puts('Delivered: '+req.url);
    })
    .error(function() {
      //sys.puts('Error delivering: '+req.url);
    })
    .otherwise(function() {
      res.sendHeader(404, {'Content-Type': 'text/plain'});
      res.sendBody('Sorry, no paper this morning!');
      res.finish();
    });
  }
  else {
    //Actual proxying happens here
    var c = http.createClient(uri.port, uri.hostname);

    //Stop from requesting gzip
    clientRequest.headers['accept-encoding'] = "text/html";

    var proxyRequest = c.request(clientRequest.method, pathname, clientRequest.headers);
    proxyRequest.addListener("response", function (response) {
      clientResponse.writeHead(response.statusCode, response.headers);
      response.addListener("data", function (chunk) {
        // modify the html content
        if (response.headers['content-type'].indexOf("text/html") != -1) {
          if (chunk.toString().indexOf('</head>')) {
            var includes =  '<script type="text/javascript" src="/jelly-serv/jquery-1.4.2.js"></script><script type="text/javascript" src="/jelly-serv/jelly.js"></script></head>';
            chunk = chunk.toString().replace('</head>', includes);
          }
        }
        clientResponse.write(chunk, 'binary');
      })
      response.addListener("end", function () {
        clientResponse.end();
      })
    })
    
    clientRequest.addListener("data", function (chunk) {
      proxyRequest.write(chunk, 'binary');
    })
    clientRequest.addListener("end", function () {
      proxyRequest.end();
    })
  }
}

var server = http.createServer(requestHandler);
server.listen(8000);
sys.puts("Proxy Server running at http://127.0.0.1:8000/")

//Service communication server
http.createServer(function (req, res) {
  req.addListener("data", function(chunk) {
    eval('var wave='+chunk);
    var assign = function(who, what) {
      for (var nemato in tentacles) {
        var obj = tentacles[nemato];
        //needs to be expanded to match via url or title regex
        if (obj.title.indexOf(who) != -1) {
           obj.queue.push(what);
           sys.puts('Assigned: '+what+' to: '+obj.title+', nemato: '+nemato);
        }
      }
    }
    //Assign what commands to execute on what tentacles
    assign(wave.who, wave.what);
  });
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Thanks\n');
}).listen(8888);
sys.puts('Service Server running at http://127.0.0.1:8888/');
