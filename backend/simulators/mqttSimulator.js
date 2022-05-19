
const mqtt = require('mqtt')

class MqttSimulator {

    constructor(host, port, clientId, username, password) {
        this.host = host;
        this.port = port;
        this.options = {
            // Clean session fields
            clean: true,
            connectTimeout: 4000,
            // Authentication fields
            clientId: clientId,
            username: username,
            password: password,
        }
    }

    publish() {
        console.log('MQTT connection to' + "mqtt://" + this.host + ":" + this.port)
        const client = mqtt.connect("mqtt://" + this.host + ":" + this.port, this.options)

        //create an object to send as POST data
        const payloads = {
            clientId: '138713571',
            AQI: 1,
            gas: 300,
            temp: 32.20,
            hum: 40.20,
            rss: -60,
            gps: {lat : 41.40338, long : 2.17403},
            };

        // handler
        client.on('connect', function () {
            console.log('Connected to the Mosquitto broker...')
            client.subscribe('#')
            console.log('Publishing data...')
            client.publish('sensor/1175/temp', payloads.temp + "")
            client.publish('sensor/1175/hum', payloads.hum + "")
            client.publish('sensor/1175/gas', payloads.gas + "")
            client.publish('sensor/1175/AQI', payloads.AQI + "")
            client.publish('sensor/1175/sensorMetadata', JSON.stringify({rss: payloads.rss, clientId: payloads.clientId, gps: payloads.gps}))
            client.end()
          })
        
        
    
    }
}

const simulator = new MqttSimulator("130.136.2.70", 1883, "simulator-" + Math.floor(Math.random() * 10) + 1, "iot2020", "mqtt2020*");
simulator.publish();


