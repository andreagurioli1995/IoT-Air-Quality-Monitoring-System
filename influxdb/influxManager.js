const { InfluxDB } = require('@influxdata/influxdb-client')
const { Point } = require('@influxdata/influxdb-client')
const { Telegraf } = require('telegraf')


class InfluxManager {
    constructor(host, port, token, org) {
        this.client = new InfluxDB({ url: 'http://' + host + ":" + port, token: token })
        this.host = host
        this.port = port
        this.token = token
        this.org = org
        this.bot = new Telegraf("5329123037:AAGWMTqbfvNir4KjIFpdNT7e250pfGabjF8")
        this.initBot();
    }

    initBot(){
        console.log('InfluxDB: Initialize Telegram Bot.')
        this.bot.start((context) => {
            console.log("InfluxDB: Alert Bot started")
            context.reply("Echo service started")
        })

        this.bot.command('temp', context=>{
            input = context.update.message
            host = input.text.slip(' ')[1]
            if(host == null || host == undefined || host == " "){
                context.reply('Need to specify a sensor host id!')
            } else {
                bucket = "temperature"
                let query = `
                from(bucket: "${bucket}") 
                |> range(start: -10m)
                |> filter(fn: (r) => r["_measurement"] == "val")
                |> filter(fn: (r) => r["_field"] == "value")
                |> filter(fn: (r) => r["host"] == "${host}")
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
                            context.reply("Bucket: " + bucket + " has " + rowResult + "° on host " + host)
                            return rowResult
                        }
                    },
                })
            }
        })
    }


    writeApi(clientId, bucket, value) {
        const writeApi = this.client.getWriteApi(this.org, bucket)
        writeApi.useDefaultTags({ host: clientId.toString() })
        console.log('Writing on bucket:' + bucket)
        var point = new Point('val')
        if(bucket == undefined || value == null){
            return false;
        }
        if (bucket == "aqi" ) {
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

    queryMeanApi(bucket, host) {
        // query in flux to receive the moving averages every n = 5 on 10 minutes before
        // the amount of values in the result table is related to the quantity of elements 
        // in the last 10 minutes.
        let query = `
        from(bucket: "${bucket}") 
        |> range(start: -10m)
        |> filter(fn: (r) => r["_measurement"] == "val")
        |> filter(fn: (r) => r["_field"] == "value")
        |> filter(fn: (r) => r["host"] == "${host}")
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

    const clientId = 'EM01' // temporal, we need to take it from the proxy server

    console.log('InfluxDB: init the manager...')
    manager = new InfluxManager(host, port, token, org)

    for (const [key, value] of Object.entries(buckets)) {
        let query = `
        from(bucket: "${value}") |> range(start: -10m) |> movingAverage(n: 5)
        ` // example of query
        console.log('InfluxDB: Starting query: ' + query + "\n")
        //manager.queryApi(query)
        manager.queryMeanApi(value, "409151bfa0cc")
    }

    console.log('InfluxDB: Ending main...')
}

main()

module.exports = {
    InfluxManager,
    InfluxData,
}





