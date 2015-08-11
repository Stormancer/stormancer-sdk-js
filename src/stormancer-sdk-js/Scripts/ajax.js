'use strict';

// $http function is implemented in order to follow the standard Adapter pattern
function $http(url, options)
{
	// A small example of object
	var core = {

		// Method that performs the ajax request
		ajax : function (method, url, args, options) {

			// Creating a promise
			var promise = new Promise( function (resolve, reject) {

				// Instantiates the XMLHttpRequest
				var client = new XMLHttpRequest();
				var uri = url;

				if (args && (method === 'POST' || method === 'PUT'))
				{
					uri += '?';
					var argcount = 0;
					for (var key in args)
					{
						if (args.hasOwnProperty(key))
						{
							if (argcount++)
							{
								uri += '&';
							}
							uri += encodeURIComponent(key) + '=' + encodeURIComponent(args[key]);
						}
					}
				}

				client.open(method, uri);

				// set options
				var data = null;
				if (options)
				{
					if (options.contentType)
					{
						client.setRequestHeader("Content-Type", options.contentType);
					}
					if (options.headers)
					{
						for (var key in options.headers)
						{
							if (options.headers.hasOwnProperty(key))
							{
								client.setRequestHeader(key, options.headers[key]);
							}
						}
					}
					if (options.data)
					{
						data = options.data
					}
				}

				client.send(data);

				client.onload = function () {
					if (this.status == 200)
					{
						// Performs the function "resolve" when this.status is equal to 200
						resolve(this.response);
					}
					else
					{
						// Performs the function "reject" when this.status is different than 200
						reject(this.statusText);
					}
				};
				client.onerror = function () {
					reject(this.statusText);
				};
			});

			// Return the promise
			return promise;
		}
	};

	// Adapter pattern
	return {
		'get': function(args, options) {
			return core.ajax('GET', url, args, options);
		},
		'post': function(args, options) {
			return core.ajax('POST', url, args, options);
		},
		'put': function(args, options) {
			return core.ajax('PUT', url, args, options);
		},
		'delete': function(args, options) {
			return core.ajax('DELETE', url, args, options);
		}
	};
};
