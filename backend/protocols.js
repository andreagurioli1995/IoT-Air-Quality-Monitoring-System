const mqtt = require('mqtt')
const InfluxManager = require('../influxdb/influxManager')

// Server session variables
var idValues = []

// ----- MQTT setup -----
const hostMqtt = '130.136.2.70' // Broker Mosquitto
const portMqtt = '1883' // listen port for MQTT
const clientId = `mqtt_${Math.random().toString(16).slice(3)}` // subscriber id
const connectUrl = `mqtt://${hostMqtt}:${portMqtt}` // url for connection

// connection on Mosquitto broker
var client = null
const topicMqtt = 'sensor/1175/data'
const fields = ["gas", "temp", "hum", "aqi", "rss", "id", "gps"]

// Influx Data
const InfluxData = {
  token : 'cg27XjSPiYE-Hccxv53O_WTXKWnuAi9II7eTxN5y9Ig4-vagqUJ23LQNtfIH45fC6tgDPo91f_X8MbRz_zZHSQ==',
  host : 'iot-org',
  org : 'localhost',
  port : 8086,
  buckets : {
      temp: 'temperature',
      aqi: 'aqi',
      hum: 'humidity',
      rss: 'rss',
      gas: 'gas',
  },
}

// ---------- Functions for MQTT -----------

init = () => {
  client = mqtt.connect(connectUrl, {
      clientId,
      clean: true,
      connectTimeout: 4000,
      username: 'iot2020',
      password: 'mqtt2020*',
      reconnectPeriod: 1000,
  })

  // reference name topic :-> name
  references = {}

  // topic setup

  // mqtt handler
  client.on('connect', () => {
      console.log(`MQTT: Listening in mqtt on port ${portMqtt}.`)
      console.log('---------------------')
      console.log('MQTT Subscriptions: ')
      try{
          client.subscribe(topicMqtt)
      } catch(e){
          console.log('MQTT Error: ' + e)
      }
      console.log('Subscription to', topicMqtt + ' : Success')
      console.log('---------------------')
  })

  
  client.on('message', (topic, payload) => {
      supported = false
      if(topic == topicMqtt){
          supported = true
      }
      if (supported) {
          data = JSON.parse(payload.toString()) // stringify is used for different encoding string
          if(data['id'] != undefined && data['id'] != null){
              addId(data['id'])
          }
          // checks
          for (var key in data) {
              if (data.hasOwnProperty(key)) {
                  if(key == 'gasv'){
                      console.log('MQTT: ' + key + ":-> [ gas: " + data[key]['gas'] + ", AQI: " + data[key]['AQI'] + "]")
                  } else if(key == 'gps'){
                      console.log('MQTT: ' + key + ":-> [ lat: " + data[key]['lat'] + ", lng: " + data[key]['lng'] + "]")
                  } else {
                      console.log('MQTT: ' + key + ":-> " +  data[key])
                  }
              }
          }

          console.log('---------------------')
          // To-Do: Save it on InfluxDB using the InfluxManager
          // const influxManager = new InfluxManager(InfluxData.host, InfluxData.port, InfluxData.token, InfluxData.org)
      }
  })
}

forwardData = (data)=> {
  if (client == null) {
      console.log('Error, no sensors connected.')
  }
  // publish with QoS 1 for secure setup, possible propagation doesn't have effect on the runtime.

  client.publish(
      "sensor/1175/setup",
      JSON.stringify(data),
      {qos: 1, retain : true}, 
      (e) =>{
          if(e){
            return false;
          } else {
            console.log('MQTT: Published with success on the setup topic.')
            return true;
          }
      })
  return true;
}



// ---------- Functions for HTTP -----------

updateSetup = (request, response) => {
  console.log('HTTP: Update data received...')
  console.log('-----------------------------')
  const data = {
    id : request.body.id,
    minGas: request.body.minGas,
    maxGas: request.body.maxGas,
    sampleFrequency: request.body.sampleFrequency,
  }

  // check data

  if (data.id == undefined || data.id == null){
    console.log('HTTP Error: Invalid data received, no valid id specification')
  }

  if (data.id in idValues){
    console.log('HTTP: Valid id found for setup propagation')
  } else {
    console.log('HTTP: Invalid id received, sensor are not connected with id: ' + data.id.toString())
  }

  if (data.minGas > data.maxGas || data.sampleFrequency < 0) {
    console.log('HTTP Error: Invalid values received.')
    console.log('-----------------------------')
  }
  else {

    if (data.minGas != undefined  && data.minGas != null) {
      console.log('HTTP: Received MIN_GAS_VALUE from the dashboard: ' + data.maxGas)
    } else {
      data.minGas = -1;
    }

    if (data.maxGas != undefined && data.maxGas != null) {
      console.log('HTTP: Received MAX_GAS_VALUE from the dashboard: ' + data.maxGas)
    } else {
      data.maxGas = -1
    }

    if (data.sampleFrequency != undefined && data.sampleFrequency != null) {
      console.log('HTTP: Received SAMPLE_FREQUENCY from the dashboard: ' + data.sampleFrequency)
    } else {
      data.sampleFrequency = -1
    }
    console.log('-----------------------------')
    success = forwardData(data) // forward on MQTT channels
    if(!success){
      console.log('Error during publishing setup data')
    }
  }
  response.redirect("/")

}


getIDs = (request, response) => {
  jsonIDs = {id: idValues}
  response.json(jsonIDs)
}

// utils functions to update the current id
addId = (id) =>{
  if(!idValues.includes(id)){
    idValues.push(id)
  }
}

module.exports = {
  updateSetup,
  addId,
  getIDs,
  init, 
  forwardData,
}