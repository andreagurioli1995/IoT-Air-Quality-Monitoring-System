
const { InfluxDB } = require('@influxdata/influxdb-client')
const { Telegraf, Markup } = require('telegraf')

const InfluxData = {
    token : 'XsaAgTTIvwmy0G9jrEMf2S2-hQfS2myED2PR_bEsZHoydrfol8qqE-Mnae63BxRDM8qsREHCGYrqsTz0zygdKQ==',
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

client  = new InfluxDB({ url: 'http://' + InfluxData.host + ":" + InfluxData.port, token: InfluxData.token })

bot = new Telegraf("5329123037:AAGWMTqbfvNir4KjIFpdNT7e250pfGabjF8")
bot.start((context) => {
    console.log("InfluxDB: Alert Bot started")
    context.reply("Hello! I am an Alert Bot, in my private chat you can ask me the mean value of a bucket filtered by host. Hosts are ESP32 with DHT22 and MQ2 sensors for temperature, humidity and gas concentration." +
    "I can provide you some additional metadata like WiFi RSS and AQI in mean view. If you want to know what can I do, click on help! " +
    "")
})

const buttons = Markup.inlineKeyboard([
     Markup.button.callback('Help!', 'help') 
    ])


bot.command('help', async (ctx) => {

    ctx.reply('👋 I can help you create and manage a notification system on your personal device.\n\n' +
    'I am an accademic product made by my lovely creators @kodetme and @andr195 for the project of Internet of Things. 👇\n\n\n'+

    'COMMANDS:\nEach command is preceded by a back slash\n\n' + 
    'help - it is the current message.\n\n' + 
    'buckets - list the current monitored influx buckets.\n\n'  +
    '<bucket-id> - it has one parameter equals to the id of the host to monitor, the <bucket-id> is given by \\buckets command.\n\n\n' +
    'OWNER:\n' + 
    'Telegram owner is @kodetme, internal configuration is open-source and consultable at the following link:')

    ctx.reply("github.com/andreagurioli1995/IoT-Air-Quality-Monitoring-System")


})

bot.command('buckets', (ctx)=>{
    ctx.reply("Actually, buckets are:\n\n" + 
    "temp - it provides the mean temperature in celsius\n\n " +
    "hum  - it display the mean humidity concentration\n\n " + 
    "gas - it provides the mean gas concentration (inverse value from 4500 [low] to 0 [high])\n\n " + 
    "rss -  it is the WiFi RSS of selected host\n\n " + 
    "aqi - it is the mean AQI on the past 5 iteration\n " +
    "\n\nIf you want to invoke them, you must put a back slash before and specify the id of the host")
})
for (const [key, value] of Object.entries(InfluxData.buckets)) {
    console.log('Creation of command /'+ key + ' to query on bucket ' + value)
    bot.command(key, context=>{
        let textBot = context.update.message
        let host = textBot.text.split(' ')[1]
        if(host == null || host == undefined || host == " "){
            context.reply('Need to specify a sensor host id!')
        } else {
            let bucket = value
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
                        console.log('Writing bot for /' + value + " command");
                        switch(value){
                            case "temperature": context.reply("The current mean " + bucket + " is " + Math.round(rowResult, 2) + "° on sensor " + host); break;
                            case "humidity" : context.reply("The current mean " + bucket + " is " + Math.round(rowResult, 2) + "% on sensor " + host); break;
                            case "rss": context.reply("The current mean " + bucket + " is " + Math.round(rowResult, 2) + " dBm on sensor " + host); break;
                            case "aqi": context.reply("The current mean " + bucket + " is " + Math.round(rowResult, 2) + " on sensor " + host); break;
                            case "gas": context.reply("The current mean " + bucket + " is " + Math.round(rowResult, 2) + " ppm on sensor " + host); break;
                            default: break;
                        }
                        
                    }
                },
            })
        }
    })

}
console.log('Status: Success')
console.log('Launching bot...')
bot.launch()
console.log('Bot listening...')
