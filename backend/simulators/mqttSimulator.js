
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
            id: 'EM01',
            gasv: {gas : Math.floor(Math.random()*4500), AQI : Math.floor(Math.random()*3)},
            temp: (Math.random()*35.0) + 28.0,
            hum: (Math.random()*50.0) + 45.0,
            rss: Math.floor(Math.random()*-80),
            gps: {lat : 41.40338, lng : 2.17403},
            };

        // handler
        client.on('connect', function () {
            console.log('Connected to the Mosquitto broker...')
            console.log('Publishing data...')
            client.publish('sensor/1175/data', JSON.stringify(payloads))
            client.end()
          })
        
        
    
    }
}

const simulator = new MqttSimulator("130.136.2.70", 1883, "EM01", "iot2020", "mqtt2020*");
simulator.publish();


