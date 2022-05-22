#include<Wire.h> 
#include<SPI.h> 
#include <DHT.h> 
#include <WiFi.h>
#include <PubSubClient.h>
#include <String.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>
 
#define DHTPIN 4 // Warning: data pin location can change during installation 
#define SMOKE 34 // Warning: data pin location can change during installation

const float lat = 44.497;
const float lng = 11.353;
String id;
const int capacity = JSON_OBJECT_SIZE(192);
StaticJsonDocument<capacity> doc;


/*
// coap observing variable
bool obs = false;
IPAddress IP;
CoapPacket pc;
int PORT = NULL;
//coap instantiation
WiFiUDP udp;
Coap coap(udp);
*/
// WS Setup
WebSocketsClient webSocket;
bool connected = false;
unsigned long lastUpdate = millis();
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
// const char *ssid = "iPhone"; // Warning: enter your WiFi name
// const char *password = "19951995";  // Warning: enter WiFi password
const char *ssid = "Vodafone-C01410160"; // Warning: enter your WiFi name
const char *password = "PhzX3ZE9xGEy2H6L";  // Warning: enter WiFi password


// Proxy Data
String WSIp = "188.153.77.35"; // check it on https://www.whatismyip.com/it/


// MQTT Broker
const char *mqtt_broker = "130.136.2.70";
const char *topic = "sensor/1175/";


// setup variables
const char *topic_receive_setup = "sensor/1175/setup";

// sensor variables
const char *data_topic = "sensor/1175/data";

// mqtt variables
const char *mqtt_username = "iot2020";
const char *mqtt_password = "mqtt2020*";
const int mqtt_port = 1883;

// deployed proxy server on Heroku
// String http_hostname = "proxy-iot-quality-air.herokuapp.com";
String http_hostname = "localhost";


// WiFi client declaration for Mqtt
WiFiClient mqttClient;

// Declaration of the PubSubClient on the sensor wifi connection.
PubSubClient client(mqttClient);

// DHT22 sensor with setup on pin
DHT dht_sensor(DHTPIN,DHT22); 
/*
// CoAP server endpoint URL
void callback_data(CoapPacket &packet, IPAddress ip, int port) {
  
  // send response
  char p[packet.payloadlen + 1];
  memcpy(p, packet.payload, packet.payloadlen);
  p[packet.payloadlen] = NULL;
  
  String message(p);
  
  if(message.equals("1")){
    obs=true;
    IP=ip;
    PORT=port;
    pc= packet;   
    
  }else if(message.equals("0")){
    obs=false;
  }

  char buffer_ff[sizeof(doc)];
  serializeJson(doc, buffer_ff);
  coap.sendResponse(ip, port,packet.messageid, buffer_ff);

}

void coap_connection(){
  coap.server(callback_data, "data");
  coap.start();
  
}
*/

// Functions 


// hexdump function for WS address
void hexdump(const void *mem, uint32_t len, uint8_t cols = 16) {
    const uint8_t* src = (const uint8_t*) mem;
    Serial.printf("\n[HEXDUMP] Address: 0x%08X len: 0x%X (%d)", (ptrdiff_t)src, len, len);
    for(uint32_t i = 0; i < len; i++) {
        if(i % cols == 0) {
            Serial.printf("\n[0x%08X] 0x%08X: ", (ptrdiff_t)src, i);
        }
        Serial.printf("%02X ", *src);
        src++;
    }
    Serial.printf("\n");
}
// Web Socket Event Handler for HTTP connection
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch(type) { // event dispatching on the WS state
        case WStype_DISCONNECTED:
            Serial.printf("HTTP WebSocket: Disconnected!\n");
            connected = false;
            break;
        case WStype_CONNECTED: {
            Serial.printf("HTTP WebSocket: Connected to url: %s\n", payload);
            connected = true;
 
            // send message to server when Connected
            Serial.println("HTTP WebSocket: Connected");
            webSocket.sendTXT("Connected");
        }
            break;
        case WStype_TEXT:
            // text message
            Serial.printf("HTTP WebSocket: RESPONSE: %s\n", payload);
            break;
        case WStype_BIN:
            // binary message 
            Serial.printf("HTTP WebSocket: get binary length: %u\n", length);
            hexdump(payload, length);
            break;
        case WStype_PING:
            // pong will be send automatically
            Serial.printf("HTTP WebSocket: get ping\n");
            break;
        case WStype_PONG:
            // answer to a ping we send
            Serial.printf("HTTP WebSocket: get pong\n");
            break;
        default:
            Serial.println("HTTP WebSocket: unsupported event\n");
    }
 
}

// MQTT Connection making with setup of topics 
void MQTTConnection(){
  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(callback); // setup the callback for the client connection (MQTT) 
  while (!client.connected()) {
     Serial.printf("The client %s connects to the public mqtt broker\n", id.c_str());
     if (client.connect(id.c_str(), mqtt_username, mqtt_password)) {
         Serial.println("Public emqx mqtt broker connected");
         client.subscribe(topic_receive_setup);
         
     } else {
         // connection error handler
         Serial.print("failed with state ");
         Serial.print(client.state());
         delay(2000);
     }
    }
}

void HTTPConnection(){
  // server address, port and URL
  Serial.println((String)"Connection to " + "ws://" + (String)WSIp + ":8080/");
  webSocket.begin(WSIp, 8080, "/");
 
    // event handler
    webSocket.onEvent(webSocketEvent);
}
void setup() { 
  pinMode(SMOKE, INPUT);
  Serial.begin(19200); 
  dht_sensor.begin(); 
  // connecting to a WiFi network
  WiFi.mode(WIFI_STA); // station mode
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
  byte MAC[6];
  WiFi.macAddress(MAC);
  id =  String(MAC[0],HEX) +String(MAC[1],HEX) +String(MAC[2],HEX) +String(MAC[3],HEX) + String(MAC[4],HEX) + String(MAC[5],HEX);
  RSS = WiFi.RSSI(); //checking the signal strength
  // setup mqtt and coap
  MQTTConnection();
  HTTPConnection();
  lastUpdate = millis();
}

void callback(char *topic, byte *payload, unsigned int length) {
 Serial.print("Message arrived on topic: ");
 Serial.println(topic);
 char bufferfreq[length];


 if(!strcmp(topic,topic_receive_setup)){
   StaticJsonDocument<200> setupJ;
   for (int i = 0; i < length; i++) {
     bufferfreq[i]=(char) payload[i];
      }
    
    DeserializationError err = deserializeJson(setupJ, bufferfreq);
    const char* tempId = setupJ["id"];
    if(!err&&!strcmp(tempId,id.c_str())){
  
      int sampleFrequency = setupJ["sampleFrequency"];
      int minGas = setupJ["minGas"];
      int maxGas = setupJ["maxGas"];

      // check missing data
      if(sampleFrequency != -1){
        Serial.print("Setup SAMPLE_FREQUENCY at:");
        Serial.println(sampleFrequency);
         SAMPLE_FREQUENCY = sampleFrequency;
      }

      if(minGas != -1){
        Serial.print("Setup MIN_GAS_VALUE at:");
        Serial.println(maxGas);
        MIN_GAS_VALUE = minGas;   
      }

      if(maxGas != -1){
        Serial.print("Setup MAX_GAS_VALUE at:");
        Serial.println(maxGas);
        MAX_GAS_VALUE = maxGas; 
      }
  
    }
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

  // loop for mqtt subscribe 
  client.loop();
  
  // loop for web socket client
  webSocket.loop();

  // possible reconnection
   if(WiFi.status() != WL_CONNECTED){
      WiFi.reconnect();
      while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
      }
      Serial.println("WiFi reconnect");
    }
    
  // RSS update
  RSS = WiFi.RSSI();

  // Data printing 
  Serial.println("--------- Data -----------");
  Serial.print("WiFi RSS Strength: ");
  Serial.println(RSS);

  // counting temporal loops
  loops++;

  // checking new input from the Serial
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

  // retrieves and save gas values temporally for 5 loops
  gas_values[0] = gas;
  int sum = 0;
   for(int c=0; c<5; c++){
    sum+=gas_values[c];
  }

  // time to do mean
  if(loops<=5){
    avg_gas = sum/loops;
  }  else{
    avg_gas = sum/5;
  }

  // defining value of AQI based on the average value
  if(avg_gas <= MAX_GAS_VALUE){
    AQI=0;
  } else if(MIN_GAS_VALUE >= avg_gas > MAX_GAS_VALUE){
    AQI=1;
  } else {
    AQI=2;
  }

  // printing AQI
  Serial.print("AQI:");
  Serial.println(AQI);

  // read DHT22 sensors
  float humidity = dht_sensor.readHumidity(); 
  float temperature = dht_sensor.readTemperature(); 

  // print of the sensor values
  Serial.print("Gas sensor: ");
  Serial.println(gas); 
  Serial.print("Temperature in Celsius: ");
  Serial.println(temperature); 
  Serial.print("Humidity value: " );
  Serial.println(humidity);

  // Creating the json file for sending values
  doc["id"] = id;
  doc["gps"]["lat"] = lat;
  doc["gps"]["lng"] = lng;
  doc["rss"] = RSS;
  doc["temp"] = temperature;
  doc["hum"] = humidity;
  doc["gasv"]["gas"] = gas;
  doc["gasv"]["AQI"] = AQI;


  // preparing buffers for String conversation
  char buffer_ff[sizeof(doc)];
  serializeJson(doc, buffer_ff);

  // verify protocol mode and execute the sending
  if (prot_mode == '1'){
    Serial.println("Protocol: MQTT");
    // mqtt publish

    client.publish(data_topic, buffer_ff,0);
  } else if(prot_mode == '2'){
    Serial.println("Protocol: HTTP");
    
    if (connected && lastUpdate + SAMPLE_FREQUENCY < millis()){
        Serial.println("HTTP WebSocket: Sending message...");
        webSocket.sendTXT("Hello World");
        lastUpdate = millis();
    }
    
  } else{
    // no valid protocol, we can't do nothing until the sensor administrator does not digit a correct mode
    Serial.println("Invalid Protocol Value: Digit 1 for MQTT or 2 for CoAP");
  }
  
  Serial.println("--------------------------");
  // customized delay based on the runtime setup
  delay(SAMPLE_FREQUENCY); 

  // loop the wifi client
  client.loop();
}
