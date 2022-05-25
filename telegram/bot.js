
const { InfluxDB } = require('@influxdata/influxdb-client')
const { Telegraf } = require('telegraf')

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
client = new InfluxDB({ url: 'http://' + InfluxData.host + ":" + InfluxData.port, token: InfluxData.token })

bot = new Telegraf("5329123037:AAGWMTqbfvNir4KjIFpdNT7e250pfGabjF8")
bot.start((context) => {
    console.log("InfluxDB: Alert Bot started")
    context.reply("Alert Bot is ready for you! Type one of the following command to check measurements on one of the indoor sensors!\nYou can choose between:\n- \/temp <sensor-id>\n- \/hum <sensor-id>\n- \/gas <sensor-id>\n- \/rss <sensor-id>\n- \/aqi <sensor-id>\n ")
})

bot.command('temp', context=>{
    let textBot = context.update.message
    let host = textBot.text.split(' ')[1]
    if(host == null || host == undefined || host == " "){
        context.reply('Need to specify a sensor host id!')
    } else {
        let bucket = "temperature"
        let query = `
        from(bucket: "${bucket}") 
        |> range(start: -10m)
        |> filter(fn: (r) => r["_measurement"] == "val")
        |> filter(fn: (r) => r["_field"] == "value")
        |> filter(fn: (r) => r["host"] == "${host}")
        |> movingAverage(n: 5)
        |> yield(name: "mean")
        `
        const queryApi = client.getQueryApi(InfluxData.org)
        var rowResult;
        queryApi.queryRows(query, {
            next(row, tableMeta) {
                rowResult = tableMeta.toObject(row)._value
            },
            error(e) {
                context.reply("Sensor is offline, try later!")
            },
            complete() {
                if(rowResult == undefined || rowResult == null){
                    context.reply("Sensor is offline, try later!")
                } else {
                    console.log('Writing bot...')
                    context.reply("The current " + bucket + " is " + Math.round(rowResult, 2) + "° on sensor " + host)
                    
                }
            },
        })
    }
})

bot.launch()
