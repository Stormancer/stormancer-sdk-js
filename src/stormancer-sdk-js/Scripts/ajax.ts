// $http function is implemented in order to follow the standard Adapter pattern
export function $http(url, options?) {

    // A small example of object
    var core = {

        // Method that performs the ajax request
        ajax: function <T>(method, url, args, options): Promise<T> {

            // Creating a promise
            var promise = new Promise<T>(function (resolve, reject) {

                // Instantiates the XMLHttpRequest
                var xhr = new XMLHttpRequest();
                var uri = url;

                if (args && (method === 'POST' || method === 'PUT')) {
                    uri += '?';
                    var argcount = 0;
                    for (var key in args) {
                        if (args.hasOwnProperty(key)) {
                            if (argcount++) {
                                uri += '&';
                            }
                            uri += encodeURIComponent(key) + '=' + encodeURIComponent(args[key]);
                        }
                    }
                }

                xhr.open(method, uri);

                // set options
                var data = null;
                if (options) {
                    if (options.contentType) {
                        xhr.setRequestHeader("Content-Type", options.contentType);
                    }
                    if (options.headers) {
                        for (var key in options.headers) {
                            if (options.headers.hasOwnProperty(key)) {
                                xhr.setRequestHeader(key, options.headers[key]);
                            }
                        }
                    }
                    if (options.data) {
                        data = options.data
                    }
                }

                xhr.send(data);

                xhr.onload = function () {
                    if (xhr.status == 200) {
                        // Performs the function "resolve" when this.status is equal to 200
                        resolve(xhr.response);
                    }
                    else {
                        // Performs the function "reject" when this.status is different than 200
                        reject(xhr.statusText);
                    }
                };
                xhr.onerror = function () {
                    reject(xhr.statusText);
                };
            });

            // Return the promise
            return promise;
        }
    };

    // Adapter pattern
    return {
        'get': function <T>(args, options): Promise<T> {
            return core.ajax('GET', url, args, options);
        },
        'post': function <T>(args, options): Promise<T> {
            return core.ajax('POST', url, args, options);
        },
        'put': function <T>(args, options): Promise<T> {
            return core.ajax('PUT', url, args, options);
        },
        'delete': function <T>(args, options): Promise<T> {
            return core.ajax('DELETE', url, args, options);
        }
    };
};
