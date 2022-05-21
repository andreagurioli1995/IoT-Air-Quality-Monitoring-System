const mqtt = require('mqtt')
const  http = require('./httpRoute')
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
const InfluxManager = require('../influxdb/influxManager')
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

function init() {
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
                http.addId(data['id'])
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

            // To-Do: Save it on InfluxDB using the InfluxManager
            // const influxManager = new InfluxManager(InfluxData.host, InfluxData.port, InfluxData.token, InfluxData.org)
        }
    })
}

function forward(data) {
    if (client == null) {
        console.log('Error, no sensors connected.')
    }

    // To-DO Change it with unique JSON structure
    client.publish("sensor/1175/freq", data.sampleFrequency.toString(), {QoS : 1})
    client.publish("sensor/1175/ming", data.minGas.toString(), {QoS : 1})
    client.publish("sensor/1175/maxg", data.maxGas.toString(), {QoS : 1})
}

module.exports = {
    init,
    forward,
}
