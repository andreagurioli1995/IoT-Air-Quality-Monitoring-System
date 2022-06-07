from pyexpat import model
from influxdb_client.client.write_api import SYNCHRONOUS
from influxdb_client import InfluxDBClient, Point, WriteOptions
from flask import Flask
from datetime import datetime
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
import pickle
import pandas as pd
import threading, time
from RepeatedTimer import RepeatedTimer

#creating flask instance
app = Flask(__name__)

# models 
temp_path = "../models/temp-model"
hum_path = "../models/hum-model"
gas_path = "../models/gas-model"

temp_models = {} # host : temp model
hum_models = {} # host : humidity model
gas_models = {} # host: gas model
counters_host = {} # host : counter

# setting up variables for influx query
token = 'XsaAgTTIvwmy0G9jrEMf2S2-hQfS2myED2PR_bEsZHoydrfol8qqE-Mnae63BxRDM8qsREHCGYrqsTz0zygdKQ=='
bucket = '$my-bucket'
org = 'iot-org'
client = InfluxDBClient(url="http://localhost:8086", token=token, org=org)

# connecting to influx for quering and writing
query_api = client.query_api()
write_api = client.write_api(write_options=SYNCHRONOUS)



@app.route("/")
def serverAlive():
    return f"<p>The server is working on {org}</p>"


@app.route("/forecast/<pred>/<host>/<bucket>")
def forecast(pred, host, bucket):
    pass


@app.route('/updateSensors/id')
def update(id):
    pass


# threading to update models every x seconds
def update(host, bucket):

    # define initial query
    query = None
    if bucket == "temp":
        query = 'from(bucket: "temperature")'\
        '|> range(start: -1h)'\
        '|> filter(fn: (r) => r["_field"] == "temperature")'\
        '|> filter(fn: (r) => r["host"] == "{}")"'.format(host)
    elif bucket == "hum":
        query = 'from(bucket: "humidity")'\
        '|> range(start: -1h)'\
        '|> filter(fn: (r) => r["_field"] == "temperature")'\
        '|> filter(fn: (r) => r["host"] == "{}")"'.format(host)
    elif bucket == "gas":
        query = 'from(bucket: "gas")'\
        '|> range(start: -1h)'\
        '|> filter(fn: (r) => r["_field"] == "temperature")'\
        '|> filter(fn: (r) => r["host"] == "{}")"'.format(host)
    else:
        print('Error, bucket not supported')


    # retrieves data from InfluxDB 
    result = client.query_api().query(org=org, query=query)
        #settling the raw results on a pandas dataframe
    raw = []
    if table == None:
        print('Error: Void results')
    else:
        for table in result:
            for record in table.records:
                raw.append((record.get_value(), record.get_time()))
        columns = None
        if bucket == "gas":
            columns = ['y', 'Time']
        else:
            columns = ['y', 'time']
        if columns == None:
            print('Error during columns defining')
        else:
            df = pd.DataFrame(raw, columns=columns)
            # history defining
            history = [x for x in df]
            model = ARIMA(history, order=(1,2,2)) # the best order was been chosen in the notebook
            if(bucket == "gas"):
                gas_models[host] = model
            elif(bucket == "temp"):
                temp_models[host] = model
            else:
                hum_models[host] = model


def updateModels(bucket):
    # update every model or make a new one
    for el in temp_models.keys:
        update(el, bucket)
    



timerTemp = RepeatedTimer(60, updateModels, "temp") # in loop every minutes
timerHum = RepeatedTimer(60, updateModels, "hum") # in loop every minutes
timerGas = RepeatedTimer(60, updateModels, "gas") # in loop every minutes