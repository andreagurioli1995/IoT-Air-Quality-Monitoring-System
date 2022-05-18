const http = require("http");
const url = require("url")

// Getting data from the sensor
function updateData(request, response){
    console.log('HTTP: Update data received...')
    const temp = request.query.temp
    const hum = request.query.hum
    if(temp == NaN || hum == NaN){
        console.error('HTTP: NaN values on the http sensor request.')
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