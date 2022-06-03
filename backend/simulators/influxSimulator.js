Influx = require('../../influxdb/influxManager')
const inquirer = require('inquirer')
const InfluxData = Influx.InfluxData
// metadata from the InfluxDB configuration
const token = InfluxData.token
const org = InfluxData.org
const host = InfluxData.host
const port = InfluxData.port
const buckets = InfluxData.buckets
const manager = new Influx.InfluxManager(host, port, token, org)


const influxSimulation = (gas, aqi) => {

    console.log('InfluxDB: init the manager...')
    gps = { lat: 44.497, lng: 11.353 }
    data = {
        id: '0321232bfa0sed',
        gps: { lat: 44.49700165, lng: 11.35299969 },
        rss: Math.floor((Math.random() * 87) + 69) * -1,
        temp: Math.round(Math.random() * 28 + 26, 3),
        hum: Math.round(Math.random() * 60 + 58, 3),
        gasv: { gas: gas, AQI: aqi },
        samF: 10000,
        ip: '192.168.1.9',
        protocol: 0
    }

    clientId = data['id']


    for (const [key, value] of Object.entries(InfluxData.buckets)) {
        console.log('Writing on bucket: ' + value)
        switch (value) {
            case "temperature": manager.writeApi(clientId, gps, value, data['temp'])
                break;
            case "humidity": manager.writeApi(clientId, gps, value, data['hum'])
                break;
            case "gas": manager.writeApi(clientId, gps, value, data['gasv']['gas'])
                break;
            case "aqi": manager.writeApi(clientId, gps, value, data['gasv']['AQI'])
                break;
            case "rss": manager.writeApi(clientId, gps, value, data['rss'])
                break;
            default:
                break;
        }
    }

    /*
    for (const [key, value] of Object.entries(buckets)) {
        let query = `
        from(bucket: "${value}") |> range(start: -10m) |> movingAverage(n: 5)
        ` // example of query
        console.log('InfluxDB: Starting query: ' + query + "\n")
        //manager.queryApi(query)
        res = manager.queryMeanApi(value, "409151bfa0cc", gps)
        console.log(res)
    }
    */
    console.log('InfluxDB: Ending main...')
}

const questions = [
    {
      type: 'input',
      name: 'name',
      message: "Introduce the input value for the interval on the simulation iteration, interval is in milliseconds (ms) and between 1000 and 12000: ",
    },
  ];

inquirer.prompt(questions[0]).then((answer) => {
    var interval = 5000 // default value 
    answer = answer.name
    if (parseInt(answer) != NaN) {
        answer = parseInt(answer)
        if (answer >= 1000 && answer <= 12000)
            interval = answer
        else {
            console.log('Simulator default value: On Set')
        }
    }
    console.log('Interval: ' + interval)
    var counter = 0;
    setInterval(() => {
        console.log('Counter: ' + counter)
        counter += 1

        if (counter < 15) {

            console.log('Invoke Gas detection measurement ' + counter + ' on ' + 15)
            console.log('-------------------------------')
            influxSimulation(Math.random() * 200 + 150, 2)
            console.log('-------------------------------')

        } else {
            if (counter == 30) {
                counter = 0
            } else {
                console.log('Invoke normal concentration measurement ' + counter + ' on ' + 30)
                console.log('-------------------------------')
                influxSimulation(Math.random() * 4500 + 4000, 1)
                console.log('-------------------------------')
            }

        }
    }, interval);
})



