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

    writeApi(clientId, bucket, value) {
        const writeApi = this.client.getWriteApi(this.org, bucket)
        writeApi.useDefaultTags({ host: clientId.toString() })

        var point = new Point('val')
        if (bucket == "aqi") {
            point = point.intField('value', value)
        } else {
            point = point.floatField('value', value)
        }
        writeApi.writePoint(point)

        writeApi.close()
            .then(() => {
                console.log('InfluxDB: Wrote value: ' + value + " on bucket: " + bucket + " with host: " + clientId)
            })
            .catch(e => {
                console.log('InfluxDB Error: ' + e)
            })
    }

    queryApi(query) {
        const queryApi = this.client.getQueryApi(this.org)
        queryApi.queryRows(query, {
            next(row, tableMeta) {
                const o = tableMeta.toObject(row)
                console.log(`${o._time} ${o._measurement}: ${o._field}=${o._value}`)
            },
            error(error) {
                console.log('InfluxDB Error: ' + e)
            },
            complete() {
                console.log('InfluxDB: Complete query')
            },
        })
    }
}

function main() {
    // metadata from the InfluxDB configuration
    const token = 'cg27XjSPiYE-Hccxv53O_WTXKWnuAi9II7eTxN5y9Ig4-vagqUJ23LQNtfIH45fC6tgDPo91f_X8MbRz_zZHSQ=='
    const org = 'iot-org'
    const host = 'localhost'
    const port = 8086
    const buckets = {
        temp: 'temperature',
        aqi: 'aqi',
        hum: 'humidity',
        rss: 'rss',
        gas: 'gas',
    }

    const clientId = 'EM01' // temporal, we need to take it from the proxy server

    console.log('InfluxDB: init the manager...')
    manager = new InfluxManager(host, port, token, org)
    console.log('InfluxDB: Init the randomly writing...')

    for (const [key, value] of Object.entries(buckets)) {
        if (value == 'temperature' || value == 'humidity') {
            let min = 0
            let max = 35
            manager.writeApi(clientId, value, (Math.random() * (max - min) + min).toFixed(4))
        } else if (value == 'aqi') {
            manager.writeApi(clientId, value, Math.floor(Math.random() * 3))
        } else if (value == 'gas') {
            manager.writeApi(clientId, value, Math.floor(Math.random() * 4500))
        } else {
            manager.writeApi(clientId, value, Math.floor(Math.random() * 75) * -1)
        }
    }


    console.log('InfluxDB: End Writing...')

    for (const [key, value] of Object.entries(buckets)) {
        let query = `from(bucket: "${value}") |> range(start: -1h)` // example of query
        console.log('InfluxDB: Starting query: ' + query + "\n")
        manager.queryApi(query)
    }

    console.log('InfluxDB: Ending main...')
}

main()

module.exports = {
    InfluxManager,
}






