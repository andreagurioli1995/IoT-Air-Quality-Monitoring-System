# IoT Air Quality Monitoring System

<p>
  <img src="https://img.shields.io/static/v1?label=build&message=passing&color=%3CCOLOR%3E" alt="alternatetext">
	<img src="https://img.shields.io/badge/state-develop-yellow" alt="alternatetext">
  <img src="https://img.shields.io/badge/Climate-DHT22-blue" alt="alternatetext">
  <img src="https://img.shields.io/badge/Gas-MQ2-green" alt="alternatetext">
</p>

The project consists in the deployment of an IoT application for smart home scenarios, including functionalities of IoT-based monitoring of indoor environ- mental parameters such as temperature, humidity and gas concentration, data collection and data forecasting. More information about the semantics on the introduction section.

## Introduction
Project for Air Quality Monitoring in an indoor environment with gas and climate sensors and a monitoring system for the analysis of the quality of air with an alarm subroutine. 

## Dependencies 
The entire project run on a Node.js proxy server, firstly we need to install dependencies with `npm install`.<br>
For the sensor we uses some libraries installed from the library manager on the Arduino IDE like coap-simple, mqtt and ArduinoJSON. 


## InfluxDB Setup
If we want to set InfluxDB locally and use it for the Internet of Things air quality monitoring, we need to follows these terminal commands:
- Focus the InfluxDB initialization and setup on https://docs.influxdata.com/influxdb/v2.2/install/.
- Setup your global variable for the Influx token given by `export INFLUX_TOKEN=<token-here>`.
- Open the first terminal and digit `influxd` to open the InfluxDB logging system.
- Digit `telegraf --config http://localhost:8086/api/v2/telegrafs/<serial-code>` in a second terminal with the serial code given during the telegraf installation.

## Contributors
- Andrea Gurioli (@andreagurioli1995)
- Mario Sessa (@kode-git)
