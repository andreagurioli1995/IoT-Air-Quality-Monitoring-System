/**
 * Testing Script for OpenWeatherMap APIs
 */

const request = require('request'); 
var API_KEY = 'dbd3b02d8958d62185d02e944cd5f522'; 
  
let temp = 0
const forecast = function (latitude, longitude) { 
  
var url = `http://api.openweathermap.org/data/2.5/weather?`
            +`lat=${latitude}&lon=${longitude}&appid=${API_KEY}`
  
    request({ url: url, json: true }, function (error, response) { 
        if (error) { 
            console.log('Unable to connect to Forecast API'); 
        } 
          else { 
  
            console.log('It is currently '
                + response.body.main.temp
                + ' degrees out.'
            ); 
  
            console.log('The high today is '
                + response.body.main.temp_max 
                + ' with a low of '
                + response.body.main.temp_min
            ); 
  
            console.log('Humidity today is '
                + response.body.main.humidity
            ); 
            temp = response.body.main.temp
        } 
    }) 
} 
  
var latitude = 22.7196; // Indore latitude 
var longitude = 75.8577; // Indore longitude 
  
// Function call 
forecast(latitude, longitude); 

console.log(temp)