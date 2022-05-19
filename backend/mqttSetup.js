function setup(client, portMqtt, topicMqtt, channels) {
    
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
            if (topic != (topicMqtt + "sensorMetadata"))
                value = parseFloat(payload.toString()).toFixed(2)
            else {
                value = JSON.parse(payload.toString());
            }
            if (value == NaN) {
                console.error('MQTT: NaN value found with on the subscription', topic)
            } else {
                const channels = ["gas", "temp", "hum", "AQI", "sensorMetadata"]

                switch(references[topic]){
                    case "temp": console.log('MQTT: '+topic+' :-> Received Temperature:', value + "°"); break; // temp
                    case "gas": console.log('MQTT: '+topic+' :-> Received Gas:', value + ""); break; // gas
                    case "hum": console.log('MQTT: '+topic+' :-> Received Humidity:', value + " %"); break; // hum
                    case "AQI": console.log('MQTT: '+topic+' :-> Received AQI:', value + ""); break; // AQI
                    case "sensorMetadata": console.log('MQTT: '+topic+' :-> Received: RSS: '+ value.rss + " dBm, clientId: " + value.clientId + ", GPS: (" + value.gps.lat + "°, " + value.gps.long + "°)\n"); break; //metadata
                    default: console.log('MQTT: '+topic+' :-> Channel not supported.'); break; // unsupport trigger
                }
            }
            
        }
    })
}

module.exports = {    
    setup,
}
