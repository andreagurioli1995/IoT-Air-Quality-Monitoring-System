// MQTT library
const mqtt = require('./mqttSetup')

// HTTP libraries
const express = require('express')
const http = require('http')
const bodyParser = require('body-parser')
const path = require('path');
const httpRoute = require('./httpRoute')


// CoAP libraries
const coap = require('coap')
const coapRoute = require('./coapRoute')

// init MQTT
mqtt.init()

// ----- CoAP setup -----


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
app.get('/getIDs', httpRoute.getIDs)

// update data for sensor via http protocol
app.post('/update-setup', httpRoute.updateSetup)



// listening on http
http.createServer(app).listen(portHttp, ()=>{
  console.log(`Listening in http on port ${portHttp}.`)
})


