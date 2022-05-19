const path = require('path')
const mqtt = require('./mqttSetup')
const { body } = require('express-validator');

updateSetup = (request, response) => {
  console.log('HTTP: Update data received...')
  console.log('-----------------------------')
  const data = {
    minGas: request.body.minGas,
    maxGas: request.body.maxGas,
    sampleFrequency: request.body.sampleFrequency,
  }

  // check data

  if (data.minGas > data.maxGas || data.sampleFrequency < 0) {
    console.log('HTTP Error: Invalid values received.')
    console.log('-----------------------------')
  }
  else {

    if (data.minGas != undefined) {
      console.log('HTTP: Received MIN_GAS_VALUE from the dashboard: ' + data.maxGas)
    }

    if (data.maxGas != undefined) {
      console.log('HTTP: Received MAX_GAS_VALUE from the dashboard: ' + data.maxGas)
    }

    if (data.sampleFrequency != undefined) {
      console.log('HTTP: Received SAMPLE_FREQUENCY from the dashboard: ' + data.sampleFrequency)
    }
    console.log('-----------------------------')
    mqtt.forward(data) // forward on MQTT channels
  }
  response.redirect("/")

}

module.exports = {
  updateSetup,
}