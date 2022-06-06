from influxdb_client.client.write_api import SYNCHRONOUS
from influxdb_client import InfluxDBClient, Point, WriteOptions
import time
from datetime import datetime
import pandas as pd
from statsmodels.tsa.arima_model import ARIMA
from flask import Flask


#creating flask instance
app = Flask(__name__)

#setting up variables for influx query
token = 'XcmfhaTm0yJzZhnThQBO26FZvYgtP0QJAocHVUucCoXcr9Vmymk69vOrJJ42_G03Y3h35KG0iapZM4dSE49AwQ=='
bucket = '$my-bucket'
org = 'iot-org'
client = InfluxDBClient(url="http://localhost:8086", token=token, org=org)


#connecting to influx for quering and writing
query_api = client.query_api()
write_api = client.write_api(write_options=SYNCHRONOUS)

#query on influx
query = 'from(bucket:"temperature")' \
        ' |> range(start:2007-12-10T15:00:00Z, stop:2016-01-20T15:00:00Z)'\
        ' |> filter(fn: (r) => r._measurement == "views")' \
        ' |> filter(fn: (r) => r._field == "y")'


@app.route("/")
def serverAlive():
    return f"<p>The server is working on {org}</p>"

#importing the number of timestamps required
@app.route('/post/<int:predLen>')
def show_post(predLen):

    #Quering influx db
    result = client.query_api().query(org=org, query=query)

    #settling the raw results on a pandas dataframe
    raw = []
    for table in result:
        for record in table.records:
            raw.append((record.get_value(), record.get_time()))
    print("=== influxdb query into dataframe ===")
    print()
    df=pd.DataFrame(raw, columns=['y','ds'], index=None)
    df['ds'] = df['ds'].values.astype('<M8[D]')
    df.head()


    history = [x for x in df]
    predictions = list()
    for t in range(len(df.index),(len(df.index)+predLen),1):
        model = ARIMA(history, order=(1,2,2))
        model_fit = model.fit()
        output = model_fit.forecast()
        yest = output[0]
        predictions.append(yest)
        print ('predicted=%f' % (yest))

    timestamps= [x for x in range(len(df.index),(len(df.index)+predLen),1)]

    forecast = pd.DataFrame(zip(timestamps,predictions),columns =['time', 'val'])
    forecast['measurement'] = "views"

    cp = forecast.copy()
    lines = [str(cp["measurement"][d]) 
            + ",type=forecast" 
            + " " 
            + "yhat=" + str(cp["val"][d]) 
            + " " + str(int(time.mktime(cp['time'][d].timetuple()))) + "000000000" for d in range(len(cp))]




    #writing data predicted back on influx 
    _write_client = client.write_api(write_options=WriteOptions(batch_size=1000, 
                                                                flush_interval=10_000,
                                                                jitter_interval=2_000,
                                                                retry_interval=5_000))

    _write_client.write(bucket, org, lines)
        # show the post with the given id, the id is an integer
    return f'Forcasted for {predLen} timestamps'