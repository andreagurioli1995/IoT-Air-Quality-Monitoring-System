from influxdb_client.client.write_api import SYNCHRONOUS
from influxdb_client import InfluxDBClient, Point, WriteOptions
from flask import Flask, jsonify
from datetime import datetime
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
import pickle
import pandas as pd
from RepeatedTimer import RepeatedTimer
from os import path

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

# initial models
model_temp = pickle.load(open('../models/temp-base', 'rb'))
model_hum = pickle.load(open('../models/hum-base', 'rb'))
model_gas = pickle.load(open('../models/gas-base', 'rb'))


freqs = {}
# threads and models in continous updating 
timer = {
    "temp" : {
        # host : thread
    },
    "hum" : {
        # host : thread
    },
    "gas" : {
        # host : thread
    },
}

# main root (used only to check )
@app.route("/")
def serverAlive():
    return f"<p>The server is working on {org}</p>"

@app.route("/changeFreq/<host>/<freq>")
def changeFreq(host, freq):
    if(freqs[host] != None):
        freqs[host] = freq
    return jsonify("")

# forecasting recall
@app.route("/forecast/<pred>/<host>/<bucket>/<freq>")
def forecastModel(pred, host, bucket, freq):
    # pick the model if already exists
    freqs[host] = float(freq)
    model = None
    print('Invoke forecast for {} on {} with lang {} and {}'.format(host, bucket, pred, freq))
    print("--------------------------------------------------")
    try:
        handler = open('../models/{}/{}'.format(bucket, host), "rb")
        model = pickle.load(handler)
    except FileNotFoundError or pickle.UnpicklingError:
        print('Except called: Old model load...')
        print("--------------------------------------------------")
        if bucket == "gas":
            model = model_gas
        elif bucket == "temp":
            model = model_temp
        else:
            model = model_hum
        
        update(host, bucket)

        if(timer[bucket] != {} and  host in timer[bucket] and timer[bucket][host] != None):
            try:
                timer[bucket][host].stop()
            except:
                print('Error during closing thread')


        print("--------------------------------------------------")
        print('Saving thread on {} for {}'.format(bucket, host))
        print("--------------------------------------------------")
    if(timer[bucket] != {} and host in timer[bucket] and timer[bucket][host] != None):
        update(host, bucket)
        timer[bucket][host].stop()
        timer[bucket][host] = RepeatedTimer(freqs[host], update, host, bucket)        
    else:
        update(host, bucket)
        timer[bucket][host] = RepeatedTimer(freqs[host], update, host, bucket)        
    # model is available for forecasting 
    if int(pred) > 1:
        output = []
        pred = int(pred)
        val = model.forecast(steps=pred)
        output = list(val)
    return jsonify(output)


# threading to update models every x seconds
def update(host, bucket):
    print('Training on {} for {}'.format(host, bucket))
    print("--------------------------------------------------")
    # define initial query
    query = None
    if bucket == "temp":
        query = 'from(bucket: "temperature")'\
        '|> range(start: -1d)'\
        '|> filter(fn: (r) => r["_field"] == "temperature")'\
        '|> filter(fn: (r) => r["host"] == "{}")'\
        '|> filter(fn: (r) => r["prediction"] == "no")'.format(host)
    elif bucket == "hum":
        query = 'from(bucket: "humidity")'\
        '|> range(start: -1d)'\
        '|> filter(fn: (r) => r["_field"] == "humidity")'\
        '|> filter(fn: (r) => r["host"] == "{}")'\
        '|> filter(fn: (r) => r["prediction"] == "no")'.format(host)
    elif bucket == "gas":
        query = 'from(bucket: "gas")'\
        '|> range(start: -1d)'\
        '|> filter(fn: (r) => r["_field"] == "gas")'\
        '|> filter(fn: (r) => r["host"] == "{}")'\
        '|> filter(fn: (r) => r["prediction"] == "no")'.format(host)
    else:
        print('Error, bucket not supported')

    print(query)
    # retrieves data from InfluxDB 
    result = client.query_api().query(org=org, query=query)
    #setting the raw results on a pandas dataframe
    raw = []
    if result == None:
        print('Error: Void results')
        return False
    else:
        print('Enter in the processing phase...')
        print("--------------------------------------------------")
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
            return False
        else:
            df = pd.DataFrame(raw, columns=columns)
            # history defining
            history = np.asarray(df['y']).astype(float)
            if bucket == "gas":
                # gas
                model = ARIMA(history, order=(1,2,0)) # the best order was been chosen in the notebook
            elif bucket == "temp":
                # temp
                model = ARIMA(history, order=(1,2,2)) # the best order was been chosen in the notebook
            else:
                # hum
                model = ARIMA(history, order=(2,1,1)) # the best order was been chosen in the notebook
            model = model.fit()
            fh = open("../models/{}/{}".format(bucket, host), "wb")
            pickle.dump(model, fh)
            print('Completed training for {} on {}'.format(host, bucket))
            print("--------------------------------------------------")
    return True 






