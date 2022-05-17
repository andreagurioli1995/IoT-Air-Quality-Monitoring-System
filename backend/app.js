const mqtt = require('mqtt')
const express = require('express')
const bodyParser = require('body-parser')
const route = require('./route')
const host = '130.136.2.70'
const portMqtt = '1883'
const portHttp = 8080
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`

const app = express()
const connectUrl = `mqtt://${host}:${portMqtt}`
const client = mqtt.connect(connectUrl, {
  clientId,
  clean: true,
  connectTimeout: 4000,
  username: 'iot2020',
  password: 'mqtt2020*',
  reconnectPeriod: 1000,
})

const topicMqtt = 'sensor/1175/'
const topicTemp = topicMqtt + "temp"
const topicHum = topicMqtt + "hum"

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
                console.log('Received Temperature:', value +"°")
            } else {
                console.log('Received Humidity:', value + " %")
            } 
        }
    }
})

app.use(bodyParser.json())
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
)

// static directory used to the app
app.use("/static", express.static('./static/'));
app.get('/', route.main)

app.listen(portHttp, ()=>{
  console.log(`Listening in http on port ${portHttp}.`)
})