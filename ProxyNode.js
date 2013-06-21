
// import the libraries needed to 
//     access file (fs), the http
//         protocol (http), and the
//             buffers (buffer). 
var fs = require("fs");
var http = require('http');
var buffer = require("buffer");

// initialize the blacklist
var blacklist = fs.readFileSync("./.blacklist").toString().split("\n").filter(function(re) { return re.length })
              .map(function(re) { return RegExp(re) });;

// tell NodeJS to watch the file for
//    changes and reload the blacklist
//        when a change occurs.
fs.watchFile("./.blacklist",function() {
	blacklist = fs.readFileSync("./.blacklist").toString().split("\n").filter(function(re) { return re.length })
              .map(function(re) { return RegExp(re) });;
	console.log(blacklist);
});
console.log(blacklist);

// Create the ProxyNode Server
var ProxyNode = http.createServer(function(clientRequest, clientResponse) {
	
	// Check the host against the blacklist.
	for (var i = 0; i < blacklist.length; i++) {
		// If it matches, kick it out.
		if (blacklist[i].test(clientRequest.headers['host'])) {
			clientResponse.writeHead(403, {"Content-Type":"text/plain"});
			clientResponse.end("This action has been forbidden by the proxy.");
			return false;
		}
	};
	
	// Get rid of the "Accept-Encoding" header to
	//    enable content-searches. (TODO: content-searches)
	delete clientRequest.headers['Accept-Encoding']
	
	// Set the options for the request.
	var options = {
		host: clientRequest.headers['host'].split(":")[0],
		port: clientRequest.headers['host'].split(":")[1] || 80,
		path: clientRequest.url,
		method: clientRequest.method,
		headers: clientRequest.headers,
	}
	
	// Make the request.
	var proxyRequest = http.request(options, function(proxyResponse) {
		
		// When data comes back from the request,
		//    send it to the client.
		proxyResponse.on('data', function(chunk) {
			clientResponse.write(chunk, 'binary');
		});
		
		// When the server closes the connection,
		//    close the client connection.
		proxyResponse.on('end', function() {
			clientResponse.end();
		});
		
		// Write the proper headers. (Passing in Status & Headers.)
		clientResponse.writeHead(proxyResponse.statusCode, proxyResponse.headers);
		
	});
	
	// when data comes from the client,
	//    send it to the request.
	clientRequest.on('data', function(chunk) {
		proxyRequest.write(chunk, 'binary');
	});
	
	// When the client closes the connection,
	//    close the server connection.
	clientRequest.on('end', function() {
		proxyRequest.end();
	});
	
	// On an error, log it.
	clientRequest.on("error", function(err) {
		console.error(err);
	});
});

// Start the ProxyNode Server
//    on port 8080.
ProxyNode.listen(8080);

