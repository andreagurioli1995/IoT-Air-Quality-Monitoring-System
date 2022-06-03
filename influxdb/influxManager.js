const { InfluxDB } = require('@influxdata/influxdb-client')
const { Point } = require('@influxdata/influxdb-client')

class InfluxManager {
    constructor(host, port, token, org) {
        this.client = new InfluxDB({ url: 'http://' + host + ":" + port, token: token })
        this.host = host
        this.port = port
        this.token = token
        this.org = org
    }

    writeApi(clientId, gps, bucket, value) {
        const writeApi = this.client.getWriteApi(this.org, bucket)
        writeApi.useDefaultTags({ host: clientId.toString(), lat : gps.lat.toString(), lng : gps.lng.toString()})
        var point = new Point('val')
        if(bucket == undefined || value == null){
            return false;
        }
        if (bucket == "aqi" ) {
            point = point.intField('value', value)
        } else {
            point = point.floatField('value', value)
            // value = Math.round(value, 2)
        }
        writeApi.writePoint(point)

        writeApi.close()
            .then(() => {
                console.log('InfluxDB: Wrote value: ' + value + " on bucket: " + bucket + " with host: " + clientId + "; lat: " + gps.lat + "; lng: " + gps.lng)
            })
            .catch(e => {
                console.log('InfluxDB Error: ' + e)
            })
        return true
    }

    queryApi(query) {
        const queryApi = this.client.getQueryApi(this.org)
        queryApi.queryRows(query, {
            next(row, tableMeta) {
                const o = tableMeta.toObject(row)
                console.log(`${o._time} ${o._measurement}: ${o._field}=${o._value}`)
            },
            error(e) {
                console.log('InfluxDB Error: ' + e)
            },
            complete() {
                console.log('InfluxDB: Complete query')
            },
        })
    }

    queryMeanApi(bucket, host, gps) {
        // query in flux to receive the moving averages every n = 5 on 10 minutes before
        // the amount of values in the result table is related to the quantity of elements 
        // in the last 10 minutes.
        let query = `
        from(bucket: "${bucket}") 
        |> range(start: -10m)
        |> filter(fn: (r) => r["_measurement"] == "val")
        |> filter(fn: (r) => r["_field"] == "value")
        |> filter(fn: (r) => r["host"] == "${host}")
        |> filter(fn: (r)=> r["lat"] == "${gps.lat}")
        |> filter(fn: (r) => r["lng"] == "$${gps.lng}")
        |> movingAverage(n: 5)
        |> yield(name: "mean")
        `
        console.log('Query: ' + query)
        const queryApi = this.client.getQueryApi(this.org)
        var rowResult;
        queryApi.queryRows(query, {
            next(row, tableMeta) {
                rowResult = tableMeta.toObject(row)._value
                //console.log(`${rowResult._time} ${rowResult._measurement}: ${rowResult._field}=${rowResult._value}`)
            },
            error(e) {
                console.log('InfluxDB Error: ' + e)
                rowResult = -1
            },
            complete() {
                if(rowResult == undefined || rowResult == null){
                    rowResult = -1
                } else {
                    console.log("Bucket: " + bucket + " :-> " + rowResult)
                    return rowResult
                }
            },
        })
    }

}

const InfluxData = {
    token : 'cg27XjSPiYE-Hccxv53O_WTXKWnuAi9II7eTxN5y9Ig4-vagqUJ23LQNtfIH45fC6tgDPo91f_X8MbRz_zZHSQ==',
    host : 'localhost',
    org : 'iot-org',
    port : 8086,
    buckets : {
        temp: 'temperature',
        aqi: 'aqi',
        hum: 'humidity',
        rss: 'rss',
        gas: 'gas',
    },
}

function main() {
    // metadata from the InfluxDB configuration
    const token = InfluxData.token
    const org = InfluxData.org
    const host = InfluxData.host
    const port = InfluxData.port
    const buckets = InfluxData.buckets


    console.log('InfluxDB: init the manager...')
    manager = new InfluxManager(host, port, token, org)
    gps = {lat : 44.497, lng : 11.353}
    data = {
        id: '409151bfa0cc',
        gps: { lat: 44.49700165, lng: 11.35299969 },
        rss: -69,
        temp: 27.10000038,
        hum: 58.5,
        gasv: { gas: 150, AQI: 2 },
        samF: 3000,
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

//main()

module.exports = {
    InfluxManager,
    InfluxData,
}





