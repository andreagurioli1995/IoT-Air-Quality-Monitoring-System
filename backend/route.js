const http = require("http");

// Getting data from the sensor
function updateData(request, response){
    response.status(200)
}


// Exports module for app.js
module.exports = {
    updateData,
}