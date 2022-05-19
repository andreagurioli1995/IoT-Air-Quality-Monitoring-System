const mqtt = require('mqtt')

// ----- MQTT setup -----
const hostMqtt = '130.136.2.70' // Broker Mosquitto
const portMqtt = '1883' // listen port for MQTT
const clientId = `mqtt_${Math.random().toString(16).slice(3)}` // subscriber id
const connectUrl = `mqtt://${hostMqtt}:${portMqtt}` // url for connection

// connection on Mosquitto broker
var client = null
const topicMqtt = 'sensor/1175/'
const channels = ["gas", "temp", "hum", "aqi", "rss", "id", "gps"]


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
    for (i = 0; i < channels.length; i++) {
        nameChannel = channels[i]
        channels[i] = topicMqtt + nameChannel
        references[channels[i]] = nameChannel
    }

    // mqtt handler
    client.on('connect', () => {
        console.log(`MQTT: Listening in mqtt on port ${portMqtt}.`)
        console.log('---------------------')
        console.log('MQTT Subscriptions: ')
        channels.forEach(channel => {
            client.subscribe([channel], () => {
                console.log(`MQTT: Subscribe to topic '${channel}'`)
            })
        });
        console.log('---------------------')
    })
    client.on('message', (topic, payload) => {
        supported = false
        channels.forEach(channel => {
            if (topic == channel) supported = true
        })
        if (supported) {
            if (topic != (topicMqtt + "id") && topic != (topicMqtt + "gps"))
                value = parseFloat(payload.toString()).toFixed(2)
            else {
                value = payload.toString();
            }
            if (value == NaN) {
                console.error('MQTT: NaN value found with on the subscription', topic)
            } else {

                switch (references[topic]) {
                    case "temp": console.log('MQTT: ' + topic + ' :-> Received Temperature:', value + "°"); break; // temp
                    case "gas": console.log('MQTT: ' + topic + ' :-> Received Gas:', value + ""); break; // gas
                    case "hum": console.log('MQTT: ' + topic + ' :-> Received Humidity:', value + " %"); break; // hum
                    case "aqi": console.log('MQTT: ' + topic + ' :-> Received AQI:', value + ""); break; // AQI
                    case "id": console.log('MQTT: ' + topic + ' :-> Received ClientId:', value + ""); break; // id
                    case "rss": console.log('MQTT: ' + topic + ' :-> Received WiFi RSS:', value + ""); break; // rss
                    case "gps": break; // gps
                    default: console.log('MQTT: ' + topic + ' :-> Channel not supported.'); break; // unsupport trigger
                }

                if (references[topic] === "gps") {
                    coords = value.split(/\s*,\s*/);
                    console.log('MQTT: ' + topic + ' :-> Received Sensor GPS: (', coords[0] + "," + coords[1] + ")");
                }
            }

        }
    })
}

function forward(data) {
    if (client == null) {
        console.log('Error, no sensors connected.')
    }

    client.publish("sensor/1175/freq", data.sampleFrequency.toString())
    client.publish("sensor/1175/ming", data.minGas.toString())
    client.publish("sensor/1175/maxg", data.maxGas.toString())
}

module.exports = {
    init,
    forward,
}
