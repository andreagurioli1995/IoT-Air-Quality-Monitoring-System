const { InfluxDB } = require('@influxdata/influxdb-client')
const { Point } = require('@influxdata/influxdb-client')
const { QueryAPI } = require('@influxdata/influxdb-client-apis')

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
        writeApi.useDefaultTags({ prediction: "no", host: clientId.toString(), lat: gps.lat.toString(), lng: gps.lng.toString() })
        var point = new Point('val')
        if (bucket == undefined || value == null) {
            return false;
        }
        if (bucket == "aqi" || bucket == "gas") {
            point = point.intField(bucket, value)
        } else {
            point = point.floatField(bucket, value)
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
        |> filter(fn: (r) => r["_field"] == "${host}")
        |> filter(fn: (r)=> r["lat"] == "${gps.lat}")
        |> filter(fn: (r) => r["lng"] == "$${gps.lng}")
        |> filter(fn: (r) => r["prediction"] == "no") 
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
                if (rowResult == undefined || rowResult == null) {
                    rowResult = -1
                } else {
                    console.log("Bucket: " + bucket + " :-> " + rowResult)
                    return rowResult
                }
            },
        })
    }

    writeForecastApi(host, gps, collection, bucket, frequency) {
        // getting the first timestamp
        const writeApi = this.client.getWriteApi(this.org, bucket)
        const queryApi = this.client.getQueryApi(this.org)
        let query = `
        from(bucket: "${bucket}")
            |> range(start: -1d)
            |> filter(fn: (r) => r["_measurement"] == "val")
            |> filter(fn: (r) => r["host"] == "${host}")
            |> filter(fn: (r) => r["lat"] == "${gps.lat}")
            |> filter(fn: (r) => r["lng"] == "${gps.lng}")
            |> filter(fn: (r) => r["prediction"] == "no")
            |> keep(columns: ["_time"])
            |> sort(columns: ["_time"], desc: false)
            |> last(column: "_time")
        `
        let timestamp;
        var rowResult;

        queryApi.queryRows(query, {
            next(row, tableMeta) {
                rowResult = tableMeta.toObject(row)._time
                timestamp = rowResult // JIT on the first and unique row
            },
            error(e) {
                console.log('InfluxDB Read Error: ' + e)
                rowResult = -1
            },
            complete() {
                // we have the timestamp and the frequency, the idea is to adapt the
                // timestamps of the next n predictions to focus the same interval of 
                // the sensor.
                let numSamples = collection.length
                for (let i = 0; i < numSamples; i++) {
                    let time = new Date(timestamp)
                    let value = collection[i]
                    time.setMilliseconds(time.getMilliseconds() + frequency * (i + 1))
                    writeApi.useDefaultTags({ prediction: "yes", host: host.toString(), lat: gps.lat.toString(), lng: gps.lng.toString() })
                    var point = new Point('val').timestamp(time)
                    if (bucket == undefined || value == null) {
                        return false;
                    }
                    if (bucket == "aqi" || bucket == "gas") {
                        point = point.intField(bucket, value)
                    } else {
                        point = point.floatField(bucket, value)
                        // value = Math.round(value, 2)
                    }
                    writeApi.writePoint(point)
                    console.log('InfluxDB: Wrote prediction value: ' + value + " on bucket: " + bucket + " with host: " + host + "; lat: " + gps.lat + "; lng: " + gps.lng + ", and timestamp: " + time)

                }
                writeApi.close()
                    .then(() => {
                        //
                    })
                    .catch(e => {
                        console.log('InfluxDB Write Error: ' + e)
                    })
            },
        })
    }


}

const InfluxData = {
    token: 'XsaAgTTIvwmy0G9jrEMf2S2-hQfS2myED2PR_bEsZHoydrfol8qqE-Mnae63BxRDM8qsREHCGYrqsTz0zygdKQ==',
    host: 'localhost',
    org: 'iot-org',
    port: 8086,
    buckets: {
        temp: 'temperature',
        aqi: 'aqi',
        hum: 'humidity',
        rss: 'rss',
        gas: 'gas',
    },
}


module.exports = {
    InfluxManager,
    InfluxData,
}





