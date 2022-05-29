const { json } = require('express/lib/response')
const mqtt = require('mqtt')
const influx = require('../influxdb/InfluxManager')

// Server session variables
var idValues = []

// ----- MQTT setup -----
const hostMqtt = '130.136.2.70' // Broker Mosquitto
const portMqtt = '1883' // listen port for MQTT
const clientId = `proxy_${Math.random().toString(16).slice(3)}` // subscriber id
const connectUrl = `mqtt://${hostMqtt}:${portMqtt}` // url for connection

// connection on Mosquitto broker
var client = null
const setupTopic =  "sensor/1175/setup"
const topicMqtt = 'sensor/1175/data'
const producerTestMqtt = 'sensor/1175/test-mqtt'
const consumerTestMqtt = 'sensor/1175/test-mqtt-res'
const switchTopic = "sensor/1175/switchRequest"
const fields = ["gas", "temp", "hum", "aqi", "rss", "id", "gps"]

// session sensors
var sensors = []

// Influx Data
const InfluxData = {
  token: 'cg27XjSPiYE-Hccxv53O_WTXKWnuAi9II7eTxN5y9Ig4-vagqUJ23LQNtfIH45fC6tgDPo91f_X8MbRz_zZHSQ==',
  host: 'localhost',
  org: 'iot-org',
  port: 8086,
  buckets: {
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
    console.log(`Listening in MQTT on ${hostMqtt}:${portMqtt}.`)
    console.log('---------------------')
    console.log('MQTT Subscriptions: ')
    try {
      client.subscribe(topicMqtt) // 
      client.subscribe(consumerTestMqtt) // for testing mode on MQTT sensors receiving the response
    } catch (e) {
      console.log('MQTT Error: ' + e)
    }
    console.log('Subscription to', topicMqtt + ' : Success')
    console.log('---------------------')
  })


  client.on('message', (topic, payload) => {

    if (topic == topicMqtt) {
      console.log('MQTT: Trigger message on ' + topicMqtt)
      data = JSON.parse(payload.toString()) // stringify is used for different encoding string
      processJSON(data, 'MQTT')
    }

    if(topic == consumerTestMqtt){
      console.log('MQTT: Trigger message on ' + consumerTestMqtt)
      try{
        data = JSON.parse(payload.toString())
        console.log(data)
        for(let i = 0; i < sensors.length; i++){
          if(sensors[i].id == data.id){
            sensors[i].mqtt = data.time
          }
        }
      } catch(e){
        console.log('Wrong formatting')
      }

    }

  })
}

/**
 * forwardData(request, response) forwards the setup information to sensor via MQTT
 * @param data is not considered
 * @return true in case of good forwarding, false otherwise
 */
forwardData = (data) => {
  if (client == null) {
    console.log('Error, no sensors connected.')
    return false
  }

  client.publish(
    setupTopic,
    JSON.stringify(data),
    {qos: 1, retain: true },
    (e) => {
      if (e) {
        return false;
      } else {
        console.log('MQTT: Published with success on the setup topic.')
        return true;
      }
    })
  return true;
}

// ---------- Functions for HTTP -----------

/**
 * switchMode(request, response) modify the protocol mode on a specific sensor given by the request data
 * @param request gives the input data for id, ip and protocol of the sensor
 * @param response defines the response with the status of the operation
 */
const switchMode = (request, response) =>{
   console.log('Invoke Switching Mode...')
   let idBody = request.body.id
   let protocolBody = request.body.protocol
   let ipBody = request.body.ip
   
   if (protocolBody == 0 || protocolBody == 1){
     var switched;
     if(protocolBody == 0){
      switched = 1
     } else {
       switched = 0
     }

     // get data from the body
     let json = {
       id: idBody,
       ip : ipBody,
       protocol : switched
     }

     // publish data on sensors network
     client.publish(switchTopic, JSON.stringify(json), {qos : 1}, (e)=>{
       if(e){
         console.log('Error during publishing on ' + switchTopic)
       } else {
         console.log('Publish successful on ' + switchTopic)
       }
     })
   } else {
     console.log('Switch Mode: Error, protocol value are not acceptable.')
     response.status(500).json("")
   }
   
   // prepare response to update the front-end status
   let responseJson = {
     id : idBody,
     ip : ipBody,
     protocol : switched
   }
   // update sensor session data
   for(let i = 0; i < sensors.length; i++){
     if(sensors[i].id == idBody){
       sensors[i].protocol = switched
       break
     }
   }
   // send response
   response.status(200).json(JSON.stringify(responseJson))
}


/**
 * testCoAP(request, response) active a request to test on CoAP for one of the connected sensor
 * @param request gives the input data
 * @param response defines the response with the test value on CoAP
 */
const testCoAP = (request, response) =>{
   // TO-DO: testing CoAP
   console.log('Invoking TestCoAP...')
   response.json("")
}


/**
 * testMQTT(request, response) active a request to test on MQTT for one of the connected sensor
 * @param request gives the input data
 * @param response defines the response status of the request, do not contains the response data
 */
const testMQTT = (request, response) =>{
  console.log('----------------------------')
  console.log('Sending Testing MQTT request on id: ' + request.body.id)
  console.log('----------------------------')
  client.publish(
    producerTestMqtt,
    request.body.id,
    { qos: 2}
    );
}


/**
 * updateSetup(request, response) to setup minGas, maxGas, sampleFrequency and protocol 
 * @param request gives the input data
 * @param response defines the response status
 */
const updateSetup = (request, response) => {
  console.log('HTTP: Update data received...')
  console.log('-----------------------------')
  
  const data = {
    id: request.body.id,
    minGas: request.body.minGas,
    maxGas: request.body.maxGas,
    sampleFrequency: request.body.sampleFrequency,
  }

  console.log(data.id)

  // check data

  if (data.id == undefined || data.id == null) {
    console.log('HTTP Error: Invalid data received, no valid id specification')
  }


  if (data.minGas > data.maxGas || data.sampleFrequency < 0) {
    console.log('HTTP Error: Invalid values received.')
    response.json({status : 400})
    console.log('-----------------------------')
  }

  else {

    if (data.minGas != undefined && data.minGas != null) {
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
    if (!success) {
      console.log('Error during publishing setup data')
    }
  }
  response.json("")

}



/**
 * getSensorData(request, response) to retrieves information about the session sensors
 * @param request is not considered
 * @param response is the json of sensors 
 */
const getSensorData = (request, response) => {
  response.json(sensors) 
}


// ------ Common MQTT and CoAP functions --------

/**
 * processJSON(data, protocol) processes sensor data and setup information
 * @param data is data given by the sensor
 * @param protocol is the protocol used to the sensor
 */
const processJSON = (data, protocol) => {

  if (data['id'] != undefined && data['id'] != null) {
    if(!checkId(data['id'])){
      sensors.push({
        id : data['id'],
        ip : data['ip'],
        mqtt : "",
        coap : "",
        protocol: 0,
      })
      console.log('Sending ' + data['id'] + ' on ' + producerTestMqtt)
      client.publish(
        producerTestMqtt,
        data['id'],
        { qos: 2}
        );
    }
  }
  // checks tests 
  console.log('---------------------')
  console.log(data)
  console.log('---------------------')

  // Write on InfluxDB
  const influxId = data['id']
  const influxManager = new influx.InfluxManager(InfluxData.host, InfluxData.port, InfluxData.token, InfluxData.org)
  for (const [key, value] of Object.entries(InfluxData.buckets)) {
    switch(value){
      case "temperature": influxManager.writeApi(influxId, value, data['temp'])
      break;
      case "humidity": influxManager.writeApi(influxId, value, data['hum'])
      break;
      case "gas": influxManager.writeApi(influxId, value, data['gasv']['gas'])
      break;
      case "aqi": influxManager.writeApi(influxId, value, data['gasv']['AQI'])
      break;
      case "rss": influxManager.writeApi(influxId, value, data['rss'])
      break;
      default:
        break;
    }
  }

  console.log('---------------------')

}

// --------- Utils ----------

/*+
 * checkId(id) checks if an id is present in the session sensor collection
 * @param id to trigger
 * @return true if it is included, false otherwise
 */
const checkId = (id) =>{
  included = false
  sensors.forEach((value, index) =>{
    if (value.id == id){
      included = true
    }
  });
  return included
}


// module export 
module.exports = {
  updateSetup,
  processJSON,
  forwardData,
  getSensorData,
  switchMode,
  testMQTT,
  testCoAP,
  init,
}