

class HttpSimulator {

    constructor(host, port, api) {
        this.host = host;
        this.port = port;
        this.api = api;
    }

    request() {
        console.log('Sending a HTTP request to the proxy server...')

        //set a reference to the request module
        var request = require('request'),
        
        //stubs
        postData = {},
        postConfig = {},
        postSuccessHandler = null;

        //create an object to send as POST data
        postData = {
            minGas : 0,
            maxGas: 3000,
            sampleFrequency: 2000,
        };

        console.log(JSON.stringify(postData))
        //the config for our HTTP POST request
        const url = "http://" + this.host + ":"  + this.port + "/" + this.api;
        postConfig = {
            url: url,
            form: postData,
        };

        //the HTTP POST request success handler
        postSuccessHandler = function (err, httpResponse, body) {
            //look for this message in your JS console:
            console.log('JSON response from the server: ' + body);
        };
        //make the POST request
        request.post(postConfig, postSuccessHandler);
    }
}

const simulator = new HttpSimulator("localhost", 8080, "update-setup");
simulator.request();


