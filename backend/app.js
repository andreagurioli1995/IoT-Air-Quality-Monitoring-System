// MQTT library
const mqtt = require('mqtt')
const mqttSetup = require('./mqttSetup')

// HTTP libraries
const express = require('express')
const http = require('http')
const bodyParser = require('body-parser')
const httpRoute = require('./httpRoute')

// CoAP libraries
const coap = require('coap')
const coapRoute = require('./coapRoute')

// ----- MQTT setup -----
const hostMqtt = '130.136.2.70' // Broker Mosquitto
const portMqtt = '1883' // listen port for MQTT
const clientId = `mqtt_${Math.random().toString(16).slice(3)}` // subscriber id
const connectUrl = `mqtt://${hostMqtt}:${portMqtt}` // url for connection

// connection on Mosquitto broker
const client = mqtt.connect(connectUrl, {
  clientId,
  clean: true,
  connectTimeout: 4000,
  username: 'iot2020',
  password: 'mqtt2020*',
  reconnectPeriod: 1000,
})
const topicMqtt = 'sensor/1175/'
const channels = ["gas", "temp", "hum", "AQI", "sensorMetadata"]

mqttSetup.setup(client, portMqtt, topicMqtt, channels)

// ----- CoAP setup -----
const serverCoap = coap.createServer();
serverCoap.on('connection', ()=>{
  console.log('CoAP: Connection is activated.')
})
serverCoap.on('request', coapRoute.request)

serverCoap.listen(()=>{
  console.log(`Listening in CoAP on port 5683.`)
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
app.use("/static", express.static('./static/'));

// Http API
// default API
app.get("/", (request, response)=>{
  console.log('http request default API triggered')
  response.sendStatus(200)
})

// update data from sensor via http protocol
app.post('/update-data', httpRoute.updateData)


// listening on http
http.createServer(app).listen(portHttp, ()=>{
  console.log(`Listening in http on port ${portHttp}.`)
})


