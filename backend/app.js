/**
 * app.js is the main module for the proxy server, it is composed by the main communications and API for the sensors and back-end components interconnection. 
 * It provides a front-end dashboard with notification channel on socketio via HTTP and internal multicasting communication with sensors in MQTT and CoAP within 
 * testing modes and forwarding mechanics with InfluxDB and Grafana.
 */


// -------- Dependencies --------
const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const protocols = require('./protocols')
const bodyParser = require('body-parser')
const path = require('path');
const os = require('os')
const { Server } = require('eiows')


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

//  -------- Public IP --------
const host = resultsNet[Object.keys(resultsNet)[0]][0]

// ----- Express setup -----

const portHttp = 8080
const portSocket = 2000
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
  index: false,  // no index
  immutable: true,  // immutable static files
  cacheControl: true, // always in cache
  maxAge: "30d" // death time
}));

// Http API
// default API for setup tool
app.get("/", (request, response)=>{
  response.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
})

app.get('/map', (request, response) =>{
  response.sendFile(path.join(__dirname, '../frontend/map.html'))
})

// Retrieve connected sensors ids
app.get('/get-sensor-data', protocols.getSensorData)

// register a new node as a device for the IoT network
app.post('/registerModel', protocols.registerModel)

// register a new node as a device for the IoT network
app.post('/registerNode', protocols.registerNode)

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
  console.log(`Listening in HTTP  on ${host}:${portHttp}.`)
})

