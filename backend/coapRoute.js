
request = (req, res) =>{
    console.log('Payload: ' + req.payload + '\n')
    res.end(200); // void response
  }

module.exports = {
    request,
}