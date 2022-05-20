const { InfluxDB, Point } = require('@influxdata/influxdb-client')
const token = process.env.INFLUXDB_TOKEN
const url = 'https://eu-central-1-1.aws.cloud2.influxdata.com'
const client = new InfluxDB({ url, token })

let org = `majdse65@gmail.com`
let buckets = {
    temp: `temperature`,
    hum: `humidity`,
    gas: `gas`,
    aqi: `aqi`,
    rss: `rss`,
}

class InfluxSimulator {
    constructor(url, token, org) {
        this.client = new InfluxDB({ url, token })
        this.org = org
    }

    init(bucket) {
        let writeClient = this.client.getWriteApi(org, bucket, 'ns')

        for (let i = 0; i < 5; i++) {
            let point = new Point('measurement1')
                .tag('tagname1', 'tagvalue1')
                .intField('field1', i)

            void setTimeout(() => {
                writeClient.writePoint(point)
            }, i * 1000) // separate points by 1 second

            void setTimeout(() => {
                writeClient.flush()
            }, 5000)
        }

    }

    retrieve(bucket, minutes) {
        console.log('InfluxDB: Retrieved called')
        let queryClient = this.client.getQueryApi(this.org)
        let fluxQuery = `from(bucket: "${bucket}")
     |> range(start: -${minutes}m)
     |> filter(fn: (r) => r._measurement == "measurement1")`

        queryClient.queryRows(fluxQuery, {
            next: (row, tableMeta) => {
                const tableObject = tableMeta.toObject(row)
                console.log(tableObject)
            },
            error: (error) => {
                console.error('\nError', error)
            },
            complete: () => {
                console.log('\nInfluxDB: Retrieve on ' + bucket + ' on the time range of ' + minutes + ' minutes: Success')
            },
        })
    }

    aggregate(bucket, minutes) {
        console.log('InfluxDB: Aggregate called')
        queryClient = this.client.getQueryApi(this.org)
        fluxQuery = `from(bucket: "${bucket}")
     |> range(start: -${minutes}m)
     |> filter(fn: (r) => r._measurement == "measurement1")
     |> mean()`

        queryClient.queryRows(fluxQuery, {
            next: (row, tableMeta) => {
                const tableObject = tableMeta.toObject(row)
                console.log(tableObject)
            },
            error: (error) => {
                console.error('\nError', error)
            },
            complete: () => {
                console.log('\nInfluxDB: Aggregate on ' + bucket + ' on the time range of ' + minutes + ' minutes: Success')
            },
        })
    }
}

simulator = new InfluxSimulator(url, token, org)
simulator.initData(buckets.temp) // store random 
simulator.retrieve(buckets.temp, 10) // temperatures retrieval in the last minutes specified by parameter
simulator.aggregate(buckets.temp, 10) // aggregate last minutes values of the time series as a mean
