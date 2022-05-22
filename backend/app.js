// libraries
const express = require('express')
const http = require('http')
const bodyParser = require('body-parser')
const path = require('path');
const protocols = require('./protocols')

// init MQTT
protocols.init()

// ----- HTTP setup -----
const portHttp = 8080
const app = express()

// bodyParser for POST
app.use(bodyParser.json())
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
)

// static directory used to the app
app.use(express.static(__dirname + "/public", {
  index: false, 
  immutable: true, 
  cacheControl: true,
  maxAge: "30d"
}));

// Http API
// default API for setup tool
app.get("/", (request, response)=>{
  response.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
})
// Retrieve connected sensors ids
app.get('/getIDs', protocols.getIDs)

// update data for sensor via http protocol
app.post('/update-setup', protocols.updateSetup)


// listening on http
http.createServer(app).listen(portHttp, ()=>{
  console.log(`Listening in http on port ${portHttp}.`)
})


