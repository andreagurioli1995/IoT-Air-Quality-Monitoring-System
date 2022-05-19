#include<Wire.h> 
#include<SPI.h> 
#include <DHT.h> 
#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <String.h>
#include <Arduino_JSON.h>


 
#define DHTPIN 4 // Warning: data pin location can change during installation 
#define SMOKE 34 // Warning: data pin location can change during installation

const char *gps = "44.497,11.353";
const char *id = "EA60";

// setting metadata
int SAMPLE_FREQUENCY = 2000;
int MIN_GAS_VALUE = 4095;
int MAX_GAS_VALUE = 500;

// AQI and WiFi RSS
int AQI = 2;
float RSS = 0; 

// Variables for AQI calculations
int gas_values[5]= {0,0,0,0,0};
float avg_gas;  

//counter for gas mean purposes
int loops = 0;


// Protocol switching variables
char prot_mode = '1';
char temp;
// WiFi Data
 const char *ssid = "iPhone"; // Warning: enter your WiFi name
 const char *password = "19951995";  // Warning: enter WiFi password
//const char *ssid = "Vodafone-C01410160"; // Warning: enter your WiFi name
//const char *password = "PhzX3ZE9xGEy2H6L";  // Warning: enter WiFi password

// MQTT Broker
const char *mqtt_broker = "130.136.2.70";
const char *topic = "sensor/1175/";
const char *topic_receive_freq = "sensor/1175/freq";
const char *topic_receive_mingas = "sensor/1175/ming";
const char *topic_receive_maxgas = "sensor/1175/maxg";

const char *temperature_topic = "sensor/1175/temp";
const char *humidity_topic = "sensor/1175/hum";
const char *gas_topic = "sensor/1175/gas";
const char *aqi_topic = "sensor/1175/aqi";
const char *rss_topic = "sensor/1175/rss";
const char *gps_topic = "sensor/1175/gps";
const char *id_topic = "sensor/1175/id";

const char *mqtt_username = "iot2020";
const char *mqtt_password = "mqtt2020*";
const int mqtt_port = 1883;

// Http protocol
// deployed proxy server on Heroku
String http_hostname = "proxy-iot-quality-air.herokuapp.com:8080/update-data";
// String http_hostname = "localhost:8080/update-data";


// WiFi client declaration for Mqtt
WiFiClient mqttClient;

// WiFi client declaration for Http
WiFiClient httpClient;

// Declaration of the PubSubClient on the sensor wifi connection.
PubSubClient client(mqttClient);

// DHT22 sensor with setup on pin
DHT dht_sensor(DHTPIN,DHT22); 


void coap_connection(){
  // to-do: manage the same value trasmission on coap protocol
}


void mqtt_connection(){
  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(callback); // setup the callback for the client connection (MQTT) 
  while (!client.connected()) {
     String client_id = "esp32-client-";
     client_id += String(WiFi.macAddress());
     Serial.printf("The client %s connects to the public mqtt broker\n", client_id.c_str());
     if (client.connect(client_id.c_str(), mqtt_username, mqtt_password)) {
         Serial.println("Public emqx mqtt broker connected");
         client.subscribe(topic_receive_freq);
         client.subscribe(topic_receive_mingas);
         client.subscribe(topic_receive_maxgas);
         
     } else {
         // connection error handler
         Serial.print("failed with state ");
         Serial.print(client.state());
         delay(2000);
     }
    }
}


void setup() { 
  
  pinMode(SMOKE, INPUT);
  Serial.begin(19200); 
  dht_sensor.begin(); 
  // connecting to a WiFi network
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi..");
  while (WiFi.status() != WL_CONNECTED) {
    delay(5000);
    Serial.print(".");
    }
  Serial.println();
  Serial.println("Connected to the WiFi network");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
  RSS = WiFi.RSSI(); //checking the signal strength
  // setup mqtt and coap
  mqtt_connection();
  coap_connection();

 
}

void callback(char *topic, byte *payload, unsigned int length) {
 Serial.print("Message arrived on topic: ");
 Serial.println(topic);
 char bufferfreq[length];
 
 if(!strcmp(topic,topic_receive_freq)){
   for (int i = 0; i < length; i++) {
     bufferfreq[i]=(char) payload[i];
      }
    SAMPLE_FREQUENCY = atoi(bufferfreq);  

 }

  if(!strcmp(topic,topic_receive_mingas)){
   for (int i = 0; i < length; i++) {
     bufferfreq[i]=(char) payload[i];
      }
     MIN_GAS_VALUE = atoi(bufferfreq);  

 }
   if(!strcmp(topic,topic_receive_maxgas)){
   for (int i = 0; i < length; i++) {
     bufferfreq[i]=(char) payload[i];
      }
     MAX_GAS_VALUE = atoi(bufferfreq);  

 }

 
 Serial.print("Message:");
 for (int i = 0; i < length; i++) {
     Serial.print((char) payload[i]);
 }
 Serial.println();
 Serial.println("-----------------------");
}





 
void loop() { 
  //loop for mqtt subscribe 
  client.loop();
  
  RSS = WiFi.RSSI();
  Serial.println("--------- Data -----------");
  Serial.print("WiFi RSS Strength: ");
  Serial.println(RSS);
  loops++;
  temp = Serial.read();
  if(temp=='1'|| temp=='2' || temp=='3'){
    prot_mode=temp;
  }
    
  //analogue reading from gas sensor
 int gas = analogRead(SMOKE);

  //calculating Average Gas Value
  for(int c=3; c>=0; c--){
    gas_values[c+1] = gas_values[c];
  }
  gas_values[0] = gas;
  int sum = 0;
   for(int c=0; c<5; c++){
    sum+=gas_values[c];
  }
  if(loops<=5){
    avg_gas = sum/loops;
  }else{
    avg_gas = sum/5;
  }

  // defining value of AQI based on the average value
  if(avg_gas<= MAX_GAS_VALUE){
    AQI=0;
  }else if(MIN_GAS_VALUE>=avg_gas>MAX_GAS_VALUE){
    AQI=1;
  }else{
    AQI=2;
  }
  Serial.print("AQI:");
  Serial.println(AQI);
  
  float humidity = dht_sensor.readHumidity(); 
  float temperature = dht_sensor.readTemperature(); 

  // print of the sensor values

  Serial.print("Gas sensor: ");
  Serial.println(gas); 
  Serial.print("Temperature in Celsius: ");
  Serial.println(temperature); 
  Serial.print("Humidity value: " );
  Serial.println(humidity);


  // preparing buffers for string conversation
  char buffer_temp[sizeof(double)];
  snprintf(buffer_temp, sizeof buffer_temp, "%lf", temperature);
  char buffer_hum[sizeof(double)];
  snprintf(buffer_hum, sizeof buffer_hum, "%lf", humidity);
  char buffer_gas[sizeof(double)];
  snprintf(buffer_gas, sizeof buffer_gas, "%lf", gas);
  char buffer_aqi[sizeof(double)];
  snprintf(buffer_aqi, sizeof buffer_aqi, "%lf", AQI);
  char buffer_rss[sizeof(double)];
  snprintf(buffer_rss, sizeof buffer_rss, "%lf", RSS);
  char buffer_id[sizeof(double)];
  snprintf(buffer_id, sizeof buffer_id, "%lf", id);


  ///////////////////////////////////test purposes
  /*
  char buffer_ff[sizeof(double)];
  snprintf(buffer_ff, sizeof buffer_ff, "%d", SAMPLE_FREQUENCY);
  client.publish(topic_receive_freq, buffer_ff);
  */
  ////////////////////////////////////////
  
  if (prot_mode == '1'){
    Serial.println("Protocol: MQTT");
    // mqtt publish
    client.publish(temperature_topic, buffer_temp,0);
    client.publish(humidity_topic, buffer_hum,0);
    client.publish(gas_topic, buffer_gas,0);
    client.publish(aqi_topic, buffer_aqi,0);
    client.publish(rss_topic, buffer_rss,0);
    client.publish(gps_topic, gps,0);
    client.publish(id_topic, id,0);
  } else if(prot_mode == '2'){
    Serial.println("Protocol: CoAP");
    // to-do, sending to coap
  } else if(prot_mode == '3'){
    // http request didn't need setup() configuration except for WiFi connection.
    Serial.println("Protocol: Http");
    WiFiClient client;
    HTTPClient http;
    http.begin(client, http_hostname );
    http.addHeader("Content-Type", "text/plain");
    char PostData[60];
    sprintf(PostData, "{\"temp\" : %5.2f,\"hum\": %5.2f,\"gas\": %d}", temperature, humidity, gas);
    int httpResponseCode = http.POST(PostData);
    if(httpResponseCode < 0){
      Serial.println("Error response received...");
    }
  }
  
  Serial.println("--------------------------");
  delay(SAMPLE_FREQUENCY); 
  client.loop();
}
