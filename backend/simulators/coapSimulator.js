const coap = require('coap')
class CoapSimulator{

    constructor(host, port){
        this.host = host
        this.port = port
    }

    request(){
        console.log('Request to: ' + 'coap://' + this.host + "/")
        const req = coap.request({
            port: this.port,
            pathname: "/",
            method: 'PUT'
          })
        const payload = {
            clientId: '138713571',
            gasv:{ gas : 300, AQI: 1},
            temp: 32.20,
            hum: 40.20,
            rss: -60,
            gps: {lat : 41.40338, long : 2.17403},
        }   
        req.write(JSON.stringify(payload));
        
        req.on('response', (res) => {
            res.pipe(process.stdout)
            req.end()
        })
    }
}

console.log('Starting CoAP simulation...')
const simulator = new CoapSimulator("localhost", 5684)
simulator.request()