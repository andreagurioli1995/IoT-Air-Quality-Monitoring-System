// libraries
const express = require('express')
const bodyParser = require('body-parser')
const path = require('path');
const protocols = require('./protocols')
const os = require('os')
// init MQTT
protocols.init()


const netInterface = os.networkInterfaces();
var resultsNet = {}

// filtering nets on the interface of the host system
for (const name of Object.keys(netInterface)) {
    for (const net of netInterface[name]) {
        // If the IP is IPv4 type and it is not equal to localhost
        if (net.family === 'IPv4' && !net.internal) {
            if (!resultsNet[name]) {
                resultsNet[name] = [];
            }
            resultsNet[name].push(net.address);
        }
    }
}
  
// ----- HTTP setup -----
const hostHttp = resultsNet[Object.keys(resultsNet)[0]][0]
const portHttp = 8080
const app = express()
const ws = require('express-ws')(app)

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

// default API on WebSocket wrapper
app.ws('/', function(ws, req) {
  ws.on('message', function(msg) {
    console.log(msg);
  });
  console.log('Connected');
});

// Retrieve connected sensors ids
app.get('/getIDs', protocols.getIDs)

// update data for sensor via http protocol
app.post('/update-setup', protocols.updateSetup)


// listening on http
app.listen(portHttp, hostHttp, ()=>{
  console.log(`Listening in http on ${hostHttp}:${portHttp}.`)
})


