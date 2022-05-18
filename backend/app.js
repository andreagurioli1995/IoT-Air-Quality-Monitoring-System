// MQTT library
const mqtt = require('mqtt')

// HTTP libraries
const express = require('express')
const http = require('http')
const fs = require('fs')
const bodyParser = require('body-parser')

// CoAP libraries
const coap = require('coap')

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

// topic setup
const topicMqtt = 'sensor/1175/'
const topicTemp = topicMqtt + "temp"
const topicHum = topicMqtt + "hum"


// mqtt handler
client.on('connect', () => {
  console.log(`Listening in mqtt on port ${portMqtt}.`)
  client.subscribe([topicTemp], () => {
    console.log(`Subscribe to topic '${topicTemp}'`)
  })

  client.subscribe([topicHum], () => {
    console.log(`Subscribe to topic '${topicHum}'`)
  })

})
client.on('message', (topic, payload) => {
    if(topic  == topicTemp || topic == topicHum){
        value = parseFloat(payload.toString()).toFixed(2)
        if(value == NaN){
            console.error('NaN value found with on the subscription',  topic)
        } else{
            if(topic == topicTemp){
                console.log('MQTT: Received Temperature:', value +"°")
            } else {
                console.log('MQTT: Received Humidity:', value + " %")
            } 
        }
    }
})

// ----- CoAP setup -----
const serverCoap = coap.createServer();

serverCoap.on('request', (req, res) =>{
  console.log('Payload: ' + req.payload + '\n')
  res.end(); // void response
})

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
  response.status(200).send();
})

// update data from sensor via http protocol
app.post('/update-data', (request, response)=>{
  console.log('HTTP: Update data received...')
  const data = JSON.parse(JSON.stringify(request.body));
  console.log("HTTP: Request JSON:")
  console.log(data)
  if(data.temp == undefined || data.hum == undefined || data.temp==NaN || 
    data.hum == NaN || data.gas == undefined || data.clientId == undefined){
    // case of undefined for no parameters or NaN for not valid values
      console.error('HTTP: Invalid values on the http sensor request.')
      response.status(412).send()
  } else {
    temp = data.temp
    hum = data.hum
    console.log('HTTP: Received Temperature:', temp +"°")
    console.log('HTTP: Received Humidity:', hum + " %")
    response.status(200).send()
  }
})


// listening on http
http.createServer(app).listen(portHttp, ()=>{
  console.log(`Listening in http on port ${portHttp}.`)
})


