var sys = require("sys")
  ,http = require("http")
  ,url = require("url")
  ,path = require('path')
  ,paperboy = require('./lib/paperboy')
  ,WEBROOT = path.join(path.dirname(__filename), 'static')
  ,ADMIN = path.join(path.dirname(__filename), 'admin');

//Global registry of browsers
var tentacles = {};

//Assign jobs to available tentacles that match
var assign = function(who, what) {
  var matches = {};

  for (var nemato in tentacles) {
    var obj = tentacles[nemato];
    //needs to be expanded to match via url or title regex
    if (obj.title.indexOf(who) != -1) {
       obj.queue.push(what);
       sys.puts('Assigned: '+what+' to: '+obj.title+', nemato: '+nemato);
       matches[nemato] = obj;
    }
  }
  return matches;
}

//Finish the request
var finish = function(req, res, data) {
  var dataString = JSON.stringify(data);
  req.headers['content-type'] = 'application/json';
  req.headers['content-length'] = dataString.length;
  res.writeHead(200, req.headers);
  res.write(dataString);
  res.end();
}

var requestHandler = function (req, res) {
  var ip = req.connection.remoteAddress;
  var uri = url.parse(req.url);
  if (uri.port == undefined) {
    uri.port = {"http:":80,"https:":443}[uri.protocol]
  }
  var pathname = uri.search ? uri.pathname + uri.search : uri.pathname;

  //communcation loop
  if (pathname.indexOf('jelly-poll') != -1) {
    var tid = pathname.split("=")[1];
    var data = '';
    if (tentacles[tid] && (tentacles[tid].queue.length != 0)){
      data = tentacles[tid].queue.shift();
    }
    finish(req, res, data);
  }
  //register frames
  else if (pathname.indexOf('jelly-net/add') != -1) {
    var newDate = new Date;
    var id = newDate.getTime();
    req.addListener("data", function (chunk) {
      sys.puts("Adding tentacle, "+id+" : "+chunk);
      eval("var tObj="+chunk);
      tObj.active = true;
      tObj.queue = [];
      tentacles[id] = tObj;
    })
    var data = {};
    data.id = id;
    finish(req, res, data);
  }
  //unregister frames
  else if (pathname.indexOf('jelly-net/rm') != -1) {
    var tid = pathname.split("=")[1];
    sys.puts("Removing tentacle: "+tid+": "+JSON.stringify(tentacles[tid]));
    delete tentacles[tid];

    var data = "OK";
    finish(req, res, data);
  }
  //Serve up static files
  else if (pathname.indexOf('jelly-serv') != -1) {
    //if jelly-serv is involved, we rm the whole path except the file
    //name and serve it from the static directory
    var fname = req.url.split("/");
    req.url = req.url.replace(pathname, "/" + fname[fname.length -1]);

    paperboy
    .deliver(WEBROOT, req, res)
    .otherwise(function() {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.write('Sorry, no paper this morning!');
      res.close();
    });
  }
  else {
    //Actual proxying happens here
    var c = http.createClient(uri.port, uri.hostname);

    //Stop from requesting gzip
    req.headers['accept-encoding'] = "text/html";

    var proxyRequest = c.request(req.method, pathname, req.headers);
    proxyRequest.addListener("response", function (response) {
      res.writeHead(response.statusCode, response.headers);
      response.addListener("data", function (chunk) {
        // modify the html content
        if (response.headers['content-type'].indexOf("text/html") != -1) {
          if (chunk.toString().indexOf('</head>')) {
            var includes =  '<script type="text/javascript" src="/jelly-serv/jquery-1.4.2.js"></script><script type="text/javascript" src="/jelly-serv/jelly.js"></script><script type="text/javascript" src="/jelly-serv/wm.js"></script></head>';
            chunk = chunk.toString().replace('</head>', includes);
          }
        }
        res.write(chunk, 'binary');
      })
      response.addListener("end", function () {
        res.end();
      })
    })

    req.addListener("data", function (chunk) {
      proxyRequest.write(chunk, 'binary');
    })
    req.addListener("end", function () {
      proxyRequest.end();
    })
  }
}

var server = http.createServer(requestHandler);
server.listen(8000);
sys.puts("Proxy Server running at http://127.0.0.1:8000/")

//Service communication server
http.createServer(function (req, res) {
  var uri = url.parse(req.url);
  if (uri.port == undefined) {
    uri.port = {"http:":80,"https:":443}[uri.protocol]
  }
  var pathname = uri.search ? uri.pathname + uri.search : uri.pathname;

  if (pathname.indexOf("assign") != -1) {
    req.addListener("data", function(chunk) {
        eval('var wave='+chunk);
        //Assign what commands to execute on what tentacles
        var resp = assign(wave.who, wave.what);
        finish(req, res, resp);
    });
  }
  else {
    paperboy
    .deliver(ADMIN, req, res)
    .otherwise(function() {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.write('Sorry, no paper this morning!');
      res.close();
    });
  }
}).listen(8888);
sys.puts('Service Server running at http://127.0.0.1:8888/');
