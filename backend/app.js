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

// ----- CoaP setup -----

const coapPort = 5683

 //Connect CoAP client to a server
 const coap = require('coap')
 const serverCoAP = coap.createServer({ type: 'udp6' })

 serverCoAP.on('connection', ()=>{
   console.log('CoAP: New sensor connected!')
 })

 serverCoAP.on('request', (req, res) => {

  dispatching = req.url.split('/')[1]
  if(dispatching == 'data'){
    protocols.processJSON(JSON.parse(req.payload.toString()), 'CoAP');
    res.end('200')
  } else {
    // not supported URI
    res.end('200')
  }
})

// the default CoAP port is 5683
serverCoAP.listen(() => {
  console.log(`Listening in CoAP on ${host}:${coapPort}.`)
})


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


// listening on http
app.listen(portHttp, host, ()=>{
  console.log(`Listening in HTTP on ${host}:${portHttp}.`)
})


