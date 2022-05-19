updateData = (request, response)=>{
    console.log('HTTP: Update data received...')
    const data = JSON.parse(JSON.stringify(request.body));
    if(data.temp == undefined || data.hum == undefined || data.temp==NaN || 
      data.hum == NaN || data.gas == undefined || data.clientId == undefined ||
      data.gps == undefined || data.rss == NaN || data.AQI == NaN || data.clientId == undefined){
      // case of undefined for no parameters or NaN for not valid values
        console.error('HTTP: Invalid values on the http sensor request.')
        response.status(412).send()
    } else {
      console.log('HTTP: Device Id: ' + data.clientId + " with location: (" + data.gps.lat + "°, " +  data.gps.long +"°)")
      console.log('HTTP: Temperature: ' + data.temp + "°, Humidity: " + data.hum  + " %, Gas: " + data.gas)
      console.log('HTTP: WiFi RSS: ' + data.rss + " dBm, AQI: " + data.AQI + "\n")
      response.sendStatus(200)
    }
  }

  module.exports = {
      updateData,
  }