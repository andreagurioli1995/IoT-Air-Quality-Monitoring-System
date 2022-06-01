const { json } = require('express/lib/response')
const mqtt = require('mqtt')
const influx = require('../influxdb/InfluxManager')
const coap = require('coap')
// Server session variables
var idValues = []

// ----- MQTT setup -----
const hostMqtt = '130.136.2.70' // Broker Mosquitto
const portMqtt = '1883' // listen port for MQTT
const clientId = `proxy_${Math.random().toString(16).slice(3)}` // subscriber id
const connectUrl = `mqtt://${hostMqtt}:${portMqtt}` // url for connection

// connection on Mosquitto broker
var client = null
const setupTopic = "sensor/1175/setup"
const topicMqtt = 'sensor/1175/data'
const producerTestMqtt = 'sensor/1175/test-mqtt'
const consumerTestMqtt = 'sensor/1175/test-mqtt-res'
const switchTopic = "sensor/1175/switchRequest"
const switchResponse = "sensor/1175/switch"
const latency = 500 // latency for operation in the proxy

// session sensors
var sensors = {}
var requestCoAP = {} // id : requestID


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
      client.subscribe(switchResponse) // for a case of response in switchMode or manual setting on the sensor
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
      processJSON(data)
    }

    if (topic == consumerTestMqtt) {
      console.log('MQTT: Trigger message on ' + consumerTestMqtt)
      try {
        data = JSON.parse(payload.toString())
        console.log(data)
        isPresent = false
        id = data.id
        if (checkId(id)) {
          sensors[id]['mqtt'] = data.time
          isPresent = true
        }

        if (isPresent) {
          console.log('MQTT: Testing response for sensor: ' + data.id + "\nSaved in session.")

        } else {
          console.log('MQTT: Sensor not in session during invoking of ' + consumerTestMqtt + ' for sensor ' + data.id)

        }
      } catch (e) {
        console.log('MQTT: Wrong formatting on ' + consumerTestMqtt + ' for sensor ' + data.id)
      }
    }

    if (topic == switchResponse) {
      console.log('MQTT: Trigger message on ' + switchResponse)
      data = JSON.parse(payload.toString())
      isPresent = false
      id = data.id
      if (checkId(id)) {
        sensors[id]['protocol'] = data.protocol
        isPresent = true
      }

      if (isPresent) {
        console.log('MQTT: Switch response for sensor: ' + id + "\nSaved in session.")
      } else {
        console.log('MQTT: Sensor not in session during invoking of ' + switchResponse + ' for sensor ' + data.id)
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
  console.log(data)

  client.publish(
    setupTopic,
    JSON.stringify(data),
    { qos: 1, retain: true },
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
const switchMode = (request, response) => {
  console.log('Invoke Switching Mode...')
  let id = request.body.id
  let protocol = request.body.protocol
  let ip = request.body.ip

  if (protocol == 0 || protocol == 1) {
    var switched;
    if (protocol == 0) {
      switched = 1
      requestCoAP[id] = setInterval(()=>{
        if (sensors[id] != undefined) {
          if (sensors[id]['protocol'] == 1) {
            console.log('Send request.')
            const req = coap.request('coap://' + sensors[id]['ip'] + '/data', { observe: true })
            if(sensors[id]['mode'] != undefined && sensors[id]['mode'] == 1){
              if(sensors[id]['counterTest'] == undefined){
                // first request
                sensors[id]['numPackage'] = 1
                sensors[id]['counterTest'] = 0
                sensors[id]['packagesTime'] = Date.now()
                sensors[id]['testingParams'] = [0, 0, 0, 0, 0] // list of time in the response
                sensors[id]['testingParams'][sensors[id]['counterTest']] = Date.now() // first request, got the first response
              } else {
                // other requests
                sensors[id]['numPackage'] += 1
                sensors[id]['testingParams'][sensors[id]['counterTest']] = Date.now() // last request for response i
                
              }
            }
            req.on('response', (res) => {
              now = Date.now() 
              processJSON(JSON.parse(res.payload.toString()))
              if(sensors[id]['mode'] != undefined && sensors[id]['mode'] == 1){
                if(sensors[id]['counterTest'] != undefined && sensors[id]['testingParams'] != undefined &&
                sensors[id]['counterTest'] < 5 && sensors[id]['mode'] != undefined && sensors[id]['mode'] == 1){
                  sensors[id]['testingParams'][sensors[id]['counterTest']] = now - sensors[id]['testingParams'][sensors[id]['counterTest']]
                  sensors[id]['counterTest'] = sensors[id]['counterTest'] + 1 // 1 to n 
    
                } else if(sensors[id]['counterTest'] != undefined &&  sensors[id]['testingParams'] != undefined && sensors[id]['counterTest'] == 5){
                  let numPackage = sensors[id]['numPackage']
                  sensors[id]['testingParams'][sensors[id]['counterTest']] = now - sensors[id]['testingParams'][sensors[id]['counterTest']]
                  sensors[id]['counterTest'] = undefined
                  sensors[id]['packageTime'] = undefined
                  sensors[id]['numPackage'] = undefined
                  let array = sensors[id]['testingParams']
                  let sum = 0
                  for(let i = 0; i < array.length; i++){
                    sum +=array[i]
                  }
                  sensors[id]['coap'] = Math.floor(sum / 5)
                  console.log('Package sent: ' + numPackage)
                  sensors[id]['packageLoss'] = Math.round(5 * 100 / numPackage, 2)
                  console.log('Latency on communication: ' + sensors[id]['coap'])
                  console.log('CoAP Loss Package: ' + sensors[id]['packageLoss'] + " %")
                  sensors[id]['mode'] = 0
                }
                  
              }
              res.on('end', () => {
                //
              })
            })
    
            req.on('error', (e) => {
              // do nothing
            })
            req.end()
          }
        }
      }, sensors[id]['sampleFrequency'])

    } else {
      switched = 0
      clearInterval(requestCoAP[id])
      requestCoAP[id] = undefined
    }

    // get data from the body
    let json = {
      id: id,
      ip: ip,
      protocol: switched,
      sampleFrequency : sensors[id]['sampleFrequency']
    }

    // publish data on sensors network
    client.publish(switchTopic, JSON.stringify(json), { qos: 1 }, (e) => {
      if (e) {
        console.log('Error during publishing on ' + switchTopic)
      } else {
        console.log('Publish successful on ' + switchTopic)
      }
    })
  } else {
    console.log('Switch Mode: Error, protocol value are not acceptable.')
    response.status(500).json(json)
  }
  // update sensor session data
  if (checkId(id)) {
    sensors[id]['protocol'] = switched
  }
  // send response
  response.status(200).json(json)
}


/**
 * testCoAP(request, response) active a request to test on CoAP for one of the connected sensor
 * @param request gives the input data
 * @param response defines the response with the test value on CoAP
 */
const testCoAP = (request, response) => {
  console.log('CoAP:  Invoking TestCoAP...')
  var id = request.body.id
  var ip = sensors[id]['ip']
  console.log('Sending /GET request to ' + ip)
  sensors[id]['mode'] = 1
  console.log('CoAP: Waiting on ' + id + '...')
  response.status(200).json(sensors)
}

/**
 * testMQTT(request, response) active a request to test on MQTT for one of the connected sensor
 * @param request gives the input data
 * @param response defines the response status of the request, do not contains the response data
 */
 const testMQTT = (request, response) => {
  console.log('----------------------------')
  console.log('MQTT: Sending Testing MQTT request on id: ' + request.body.id)
  console.log('----------------------------')
  client.publish(
    producerTestMqtt,
    JSON.stringify({ id: request.body.id }),
    { qos: 2 }, (e) => {
      if (e) {
        console.log('MQTT: Error during the sending ' + request.body.id + ' on topic ' + producerTestMqtt)
      } else {
        console.log('MQTT: Sending ' + request.body.id + ' correctly on topic ' + producerTestMqtt)
      }
    }
  );

  response.status(200).json(sensors)
}


/**
 * updateSetup(request, response) to setup minGas, maxGas, sampleFrequency and protocol 
 * @param request gives the input data
 * @param response defines the response status
 */
const updateSetup = (request, response) => {
  console.log('HTTP: Update data received...')
  console.log('-----------------------------')
  let id = request.body.id
  if (checkId(id)) {
    const data = {
      id: request.body.id,
      minGas: request.body.minGas,
      maxGas: request.body.maxGas,
      sampleFrequency: request.body.sampleFrequency,
    }
    sensors[id]['sampleFrequency'] = request.body.sampleFrequency

    // check data

    if (data.id == undefined || data.id == null || data.minGas > data.maxGas || data.sampleFrequency < 0) {
      console.log('HTTP Error: Invalid values received.')
      response.json({ status: 400 })
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

      if (data.sampleFrequency != undefined && data.sampleFrequency > 0 && data.sampleFrequency != null) {
        id = data.id

        console.log('-----------------------------')
        success = forwardData(data) // forward on MQTT channels
        if (!success) {
          console.log('Error during publishing setup data')
        }
      }
    }
    response.status(200).json(sensors)

  }
}

/**
 * getSensorData(request, response) to retrieves information about the session sensors
 * @param request is not considered
 * @param response is the json of sensors 
 */
const getSensorData = (request, response) => {
  // push session data to the front-end 
  response.json(sensors)
}

// ------ Common MQTT and CoAP functions --------
/**
 * processJSON(data, protocol) processes sensor data and setup information
 * @param data is data given by the sensor
 * @param protocol is the protocol used to the sensor
 */
const processJSON = (data) => {
  let idJSON = data['id']
  if (idJSON != undefined && idJSON != null) {
    if (!checkId(idJSON)) {
      sensors[idJSON] = {
        id: idJSON, // internal key
        ip: data['ip'], // ip
        mqtt: "", // MQTT ping testing
        coap: "", // CoAP ping testing
        mqttPackages: "", // MQTT package loss
        coapPackages: "", // CoAP package loss
        protocol: data['protocol'], // protocol
        sampleFrequency: data['samF'], // current sample frequency
        lastTime: Date.now() // timestamp in ms
      }

      console.log('Sending ' + idJSON + ' on ' + producerTestMqtt)
      client.publish(
        producerTestMqtt,
        JSON.stringify({ id: idJSON }),
        { qos: 2 }, (e) => {
          if (e) {
            console.log('Error during publishing on ' + producerTestMqtt + ' for sensor ' + idJSON)
          } else {
            console.log('MQTT: Publish correctly on ' + producerTestMqtt + " for sensor " + idJSON)
          }
        }
      );
    } else {
      // update values
      sensors[idJSON]['protocol'] = data['protocol']
      sensors[idJSON]['ip'] = data['ip']
      sensors[idJSON]['sampleFrequency'] = data['samF']
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
    switch (value) {
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
const checkId = (id) => {
  return sensors[id] != null && sensors[id] != undefined
}

const getSensorsList = () => {
  return sensors
}


// module export 
module.exports = {
  updateSetup,
  processJSON,
  forwardData,
  getSensorData,
  getSensorsList,
  switchMode,
  testMQTT,
  testCoAP,
  init,
}