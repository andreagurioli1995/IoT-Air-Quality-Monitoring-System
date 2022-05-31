// libraries
const express = require('express')
const bodyParser = require('body-parser')
const path = require('path');
const protocols = require('./protocols')
const os = require('os')



// --------- MQTT setup -------------
protocols.init()

const netInterface = os.networkInterfaces();
var resultsNet = {}

// filtering nets on the interface of the host system
for (const name of Object.keys(netInterface)) {
    for (const net of netInterface[name]) {
        // If the IP is IPv4 type and it is not equal to localhost
        if (net.family === 'IPv4' && !net.internal) {
            if (!resultsNet[name]) {
                resultsNet[name] = [];
            }
            resultsNet[name].push(net.address);
        }
    }
}

// Public IP
const host = resultsNet[Object.keys(resultsNet)[0]][0]



// ----- HTTP setup -----

const portHttp = 8080
const app = express()

// bodyParser for POST
app.use(bodyParser.json())
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
)

// static directory used to the app
app.use(express.static(__dirname + "/public", {
  index: false, 
  immutable: true, 
  cacheControl: true,
  maxAge: "30d"
}));

// Http API
// default API for setup tool
app.get("/", (request, response)=>{
  response.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
})

// Retrieve connected sensors ids
app.get('/get-sensor-data', protocols.getSensorData)

// update data for sensor via http protocol
app.post('/update-setup', protocols.updateSetup)

// request a test on MQTT
app.post('/test-mqtt', protocols.testMQTT)

// request a test on CoAP
app.post('/test-coap', protocols.testCoAP)

// switch mode
app.post('/switch-mode', protocols.switchMode)

// listening on http
app.listen(portHttp, host, ()=>{
  console.log(`Listening in HTTP on ${host}:${portHttp}.`)
})


