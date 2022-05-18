//set a reference to the request module
var request = require('request'),
	//stubs
	postData = {},
	postConfig = {},
	postSuccessHandler = null;

//create an object to send as POST data
postData = {
    clientId:'138713571',
    AQI: 1,
    gas: 300,
    temp: 32.20,
    hum: 40.20,
    rss: -60,
    gps: (41.40338, 2.17403),
};
console.log(JSON.stringify(postData))
//the config for our HTTP POST request
postConfig = {
    url:'http://localhost:8080/update-data',
    form: postData,
};

//the HTTP POST request success handler
postSuccessHandler = function (err, httpResponse, body) {
	//look for this message in your JS console:
	console.log('JSON response from the server: ' + body);
};

//make the POST request
request.post(postConfig, postSuccessHandler);