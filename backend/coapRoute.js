
const coap = require('coap')

request = (req, res) =>{
  coap.request({
    port: 5867,
    pathname: "/r/hello",
    method: 'PUT'
  })
}

module.exports = {
    request,
}