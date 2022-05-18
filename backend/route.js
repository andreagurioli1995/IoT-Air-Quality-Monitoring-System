const http = require("http");
const url = require("url")

// Getting data from the sensor
async function updateData(request, response){
    const temp = request.query.temp
    const hum = request.query.hum
    if(temp == NaN || hum == NaN){
        console.error('NaN values on the http sensor request.')
        response.status(412)
    } else {
        console.log('HTTP: Received Temperature:', value +"°")
        console.log('HTTP: Received Humidity:', value + " %")
        response.status(200)
    }
}


// Exports module for app.js
module.exports = {
    updateData,
}