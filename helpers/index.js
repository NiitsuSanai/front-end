(function (){
  'use strict';
  const {
    HttpHeaders: Header,
    Annotation
  } = require('zipkin');
  var request = require("request");
  var helpers = {};

  helpers.useTracer = function(tracer) {
	helpers.tracer = tracer;
  }
  /* Public: errorHandler is a middleware that handles your errors
   *
   * Example:
   *
   * var app = express();
   * app.use(helpers.errorHandler);
   * */
  helpers.errorHandler = function(err, req, res, next) {
    var ret = {
      message: err.message,
      error:   err
    };
    res.
      status(err.status || 500).
      send(ret);
  };

  helpers.sessionMiddleware = function(err, req, res, next) {
    if(!req.cookies.logged_in) {
      res.session.customerId = null;
    }
  };


  /* Responds with the given body and status 200 OK  */
  helpers.respondSuccessBody = function(res, body) {
    helpers.respondStatusBody(res, 200, body);
  }

  /* Public: responds with the given body and status
   *
   * res        - response object to use as output
   * statusCode - the HTTP status code to set to the response
   * body       - (string) the body to yield to the response
   */
  helpers.respondStatusBody = function(res, statusCode, body) {
    res.writeHeader(statusCode);
    res.write(body);
    res.end();
  }

  /* Responds with the given statusCode */
  helpers.respondStatus = function(res, statusCode) {
    res.writeHeader(statusCode);
    res.end();
  }

  /* Public: performs an HTTP GET request to the given URL
   *
   * url  - the URL where the external service can be reached out
   * res  - the response object where the external service's output will be yield
   * next - callback to be invoked in case of error. If there actually is an error
   *        this function will be called, passing the error object as an argument
   *
   * Examples:
   *
   * app.get("/users", function(req, res) {
   *   helpers.simpleHttpRequest("http://api.example.org/users", res, function(err) {
   *     res.send({ error: err });
   *     res.end();
   *   });
   * });
   */
  helpers.simpleHttpRequest = function(url, res, next) {
	  var headers = {};
	  var traceId
    helpers.ZipkinHeaders(url, headers, traceId)
    console.log("header sent:" + traceId); 
	  request.get({url: url, headers: headers},
		  function(error, response, body) {
      			if (error) return next(error);
      			helpers.respondSuccessBody(res, body);
		  }.bind({res: res})
	  ).on("response", function(response){
		  // TODO: This response needs to be sorted
	  	  //	  var tracer = helpers.tracer
		  //tracer.scoped(() => {
		  //		  tracer.setId(traceId);
		  //		  tracer.recordBinary('http.status_code', response.statusCode);
		  //		  tracer.recordAnnotation(new Annotation.ClientRecv());
		  //	  });
		});
  }

  helpers.ZipkinHeaders = function(url, headers, traceId) {
          var tracer = helpers.tracer
	  tracer.scoped(() => {
	    tracer.setId(tracer.createChildId());
	    const traceId = tracer.id;
	    this.traceId = traceId;

	    headers[Header.TraceId] = traceId.traceId;
	    headers[Header.SpanId] = traceId.spanId;
	    traceId._parentId.ifPresent(psid => {
	      headers[Header.ParentSpanId] = psid;
	    });
	    traceId.sampled.ifPresent(sampled => {
	      headers[Header.Sampled] = sampled ? '1' : '0';
	    });

	    const method = "GET";
	    tracer.recordServiceName("frontend");
	    tracer.recordRpc(method);
	    tracer.recordBinary('http.url', url);
	    tracer.recordAnnotation(new Annotation.ClientSend());
	    tracer.recordAnnotation(new Annotation.ServerAddr({
	      ServiceName: url
	    }));
	});
    }



  /* TODO: Add documentation */
  helpers.getCustomerId = function(req, env) {
    // Check if logged in. Get customer Id
    var logged_in = req.cookies.logged_in;

    // TODO REMOVE THIS, SECURITY RISK
    if (env == "development" && req.query.custId != null) {
      return req.query.custId;
    }

    if (!logged_in) {
      if (!req.session.id) {
        throw new Error("User not logged in.");
      }
      // Use Session ID instead
      return req.session.id;
    }

    return req.session.customerId;
  }
  module.exports = helpers;
}());
