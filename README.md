# IoT Air Quality Monitoring System
The project consists in the deployment of an IoT application for smart home scenarios, including functionalities of IoT-based monitoring of indoor environ- mental parameters such as temperature, humidity and gas concentration, data collection and data forecasting.


## Dependencies 
The entire project run on a Node.js proxy server, firstly we need to install dependencies with `npm install`.<br>
For the sensor we uses some libraries installed from the library manager on the Arduino IDE like coap-simple, mqtt and ArduinoJSON. 


## InfluxDB Setup
If we want to set InfluxDB locally and use it for the Internet of Things air quality monitoring, we need to follows these terminal commands:
- Focus the InfluxDB initialization and setup on https://docs.influxdata.com/influxdb/v2.2/install/.
- Setup your global variable for the Influx token given by the initialization `export INFLUX_TOKEN=<token-here>`.
- Open the first terminal and digit `influxd` to open the InfluxDB logging system.
- Open the second teminal and digit `telegraf --config http://localhost:8086/api/v2/telegrafs/<serial-code>` with the serial code given during the telegraf installation.
