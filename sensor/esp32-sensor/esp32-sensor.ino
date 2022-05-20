#include<Wire.h> 
#include<SPI.h> 
#include <DHT.h> 
#include <WiFi.h>
#include <WiFiUdp.h>
#include <PubSubClient.h>
#include <String.h>
#include <ArduinoJson.h>
#include <coap-simple.h>

#define DHTPIN 4 // Warning: data pin location can change during installation 
#define SMOKE 34 // Warning: data pin location can change during installation

const float lat = 44.497;
const float lng = 11.353;
const char *id = "EA60";

// setting metadata
int SAMPLE_FREQUENCY = 2000;
int MIN_GAS_VALUE = 4095;
int MAX_GAS_VALUE = 500;

// AQI and WiFi RSS
int AQI = 2;
float RSS = 0; 

// Variables for AQI calculations
int gas_values[5] = {0,0,0,0,0};
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

//coap instantiation
WiFiUDP udp;
Coap coap(udp);
// setup variables
const char *topic_receive_freq = "sensor/1175/freq";
const char *topic_receive_mingas = "sensor/1175/ming";
const char *topic_receive_maxgas = "sensor/1175/maxg";

// sensor variables
const char *data_topic = "sensor/1175/data";
const char *id_topic = "sensor/1175/id";

// mqtt variables
const char *mqtt_username = "iot2020";
const char *mqtt_password = "mqtt2020*";
const int mqtt_port = 1883;

// CoAP protocol
// deployed proxy server on Heroku
String http_hostname = "proxy-iot-quality-air.herokuapp.com";
// String http_hostname = "localhost"


// WiFi client declaration for Mqtt
WiFiClient mqttClient;



  

// Declaration of the PubSubClient on the sensor wifi connection.
PubSubClient client(mqttClient);

// DHT22 sensor with setup on pin
DHT dht_sensor(DHTPIN,DHT22); 

// CoAP server endpoint URL
void callback_light(CoapPacket &packet, IPAddress ip, int port) {

}

void coap_connection(){
  coap.server(callback_light, "data");
  coap.start();
  
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
 
 // updating the sample_frequency value
 if(!strcmp(topic,topic_receive_freq)){
   for (int i = 0; i < length; i++) {
     bufferfreq[i]=(char) payload[i];
      }
    SAMPLE_FREQUENCY = atoi(bufferfreq);  

 }

 // updating the min_gas_value
  if(!strcmp(topic,topic_receive_mingas)){
   for (int i = 0; i < length; i++) {
     bufferfreq[i]=(char) payload[i];
      }
     MIN_GAS_VALUE = atoi(bufferfreq);  

 }

 // updating the max_gas_value
   if(!strcmp(topic,topic_receive_maxgas)){
   for (int i = 0; i < length; i++) {
     bufferfreq[i]=(char) payload[i];
      }
     MAX_GAS_VALUE = atoi(bufferfreq);  

 }

 // printing of the message received 
 Serial.print("Message Metadata Received from the Sensor:");
 for (int i = 0; i < length; i++) {
     Serial.print((char) payload[i]);
 }
 Serial.println();
 Serial.println("-----------------------");
}


void loop() { 
  
  const int capacity = JSON_OBJECT_SIZE(192);
   StaticJsonDocument<capacity> doc;

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
    
  // analogue reading from gas sensor
 int gas = analogRead(SMOKE);

  // calculating Average Gas Value
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

  //creating the json file
  doc["id"] = id;
  doc["gps"]["lat"] = lat;
  doc["gps"]["lng"] = lng;
  doc["rss"] = RSS;
  doc["temp"] = temperature;
  doc["hum"] = humidity;
  doc["gasv"]["gas"] = gas;
  doc["gasv"]["AQI"] = AQI;


  // preparing buffers for string conversation
  char buffer_ff[sizeof(doc)];
  serializeJson(doc, buffer_ff);
 // ----------------------------------------------------
  
  
  if (prot_mode == '1'){
    Serial.println("Protocol: MQTT");
    // mqtt publish

    client.publish(id_topic, buffer_ff,0);
  } else if(prot_mode == '2'){
    Serial.println("Protocol: CoAP");
    //coap.sendResponse(ip, port, packet.messageid, buffer_ff);
    coap.loop();
  } else{
    Serial.println("Invalid Protocol Value: Digit 1 for MQTT or 2 for CoAP");
  }
  
  Serial.println("--------------------------");
  delay(SAMPLE_FREQUENCY); 
  client.loop();
}
