
// ------------- Dependencies -------------

#include<Wire.h> 
#include<SPI.h> 
#include <DHT.h> 
#include <WiFi.h>
#include <PubSubClient.h>
#include <String.h>
#include <ArduinoJson.h>
#include "Thing.CoAP.h"

// ----------- Macro -----------

#define DHTPIN 4 // Warning: data pin location can change during installation 
#define SMOKE 34 // Warning: data pin location can change during installation
#define LAT 44.497 // Warning: need to modify it in case of multisensor GPS simulation
#define LNG 11.353 // Warning: need to modify it in case of multisensor GPS simulation
#define INIT_MIN_GAS 4095 // initial setup for gas playground
#define INIT_MAX_GAS 500 // initial setup for gas playground
#define INIT_SAMPLE_FREQ 2500 // initial setup for sensors 
#define INIT_AQI 2 // initial setup for gas playground
#define INIT_RSS 0 // initial setup for WiFi analysis

// ----------- Variables -----------
const float lat = LAT; // latitude of the GPS location (no GPS sensor)
const float lng = LNG; // longitude of the GPS location (no GPS sensor)
const int capacity = JSON_OBJECT_SIZE(192); // capacity size 
StaticJsonDocument<capacity> doc; // Json for data communication
StaticJsonDocument<capacity> docp; // Json for the protocol switching
StaticJsonDocument<capacity> docT; // Json for testing ping management
unsigned long previousTime = millis(); // timestamp 
bool testingPing = false; // Testing ping variable, if true, the board is in ping RTT test time
bool looping = true; // looping variable in order to make synchronous the protocol for RTT testing
Thing::CoAP::Server server;  // server side setting for CoAP communication
Thing::CoAP::ESP::UDPPacketProvider udpProvider; // updProvider for CoAP communication
long int SAMPLE_FREQUENCY = INIT_SAMPLE_FREQ; // sample frequency of sampling 
int MIN_GAS_VALUE = INIT_MIN_GAS; // minimum gas value corresponding to the upper value
int MAX_GAS_VALUE = INIT_MAX_GAS; // maximum gas value corresponding to the lower value
int AQI = INIT_AQI; // AQI value
int loops = 0; // loop counting for the variables 
int timeCounter = 1; // timing for the mean for AQI
int gas_values[5] = {0,0,0,0,0}; // status of gas values
float RSS = INIT_RSS; // WiFi RSS value
float avg_gas; // current avegare gas
char prot_mode = '1'; // Protocol switching variables
char previous_prot = '1'; // Previous protocol mode
char temp; // temporal value for protocol shifting phase 
char buffer_ff[sizeof(doc)]; // buffer for JSON message for CoAP and MQTT payload
double sumTime = 0; // sum of gas values in the AQI definition
double avg; // average of gas during the AQI 
String id; // id of the ESP32 (connected to the internal fireware)
int gas = INIT_MIN_GAS; //gas value for gas sensing phase
float temperature = 26.5;//temperature value for sensing phase
float humidity = 56.3; // humidity value for sensing phase

// ----------- WiFi Data -----------
const char *ssid = "iPhone"; // Warning: enter your WiFi name
const char *password = "19951995";  // Warning: enter WiFi password
//const char *ssid = "Vodafone-C01410160"; // Warning: enter your WiFi name
//const char *password = "PhzX3ZE9xGEy2H6L";  // Warning: enter WiFi password

// ----------- Proxy Data -----------
// check it on https://www.whatismyip.com/it/
IPAddress proxyIp(192,168,1,2);

// ----------- MQTT Broker -----------
const char *mqtt_broker = "130.136.2.70";
const char *topic = "sensor/1175/";

// ----------- Topics -----------
const char *topic_receive_setup = "sensor/1175/setup"; // setup topic to change metadata
const char *topic_receive_ping = "sensor/1175/ping"; // ping topic for the testing mod
const char *topic_topic_switch = "sensor/1175/switch";//manda id, ip e protocollo 0 mqtt 1 per coap
const char *topic_req_switch = "sensor/1175/switchRequest"; // richiesta di switching di protocollo
const char *topic_receive_RTT = "sensor/1175/test-mqtt"; // topic to start the testing mode
const char *topic_send_RTT_result = "sensor/1175/test-mqtt-res"; // sending the result on testing mde
const char *data_topic = "sensor/1175/data"; // data topic to publish sensors updating

// ----------- MQTT Credentials -----------
const char *mqtt_username = "iot2020";
const char *mqtt_password = "mqtt2020*";
const int mqtt_port = 1883;


// ----------- WiFi client declaration for Mqtt -----------
WiFiClient mqttClient; // WiFi client for the network interface
PubSubClient client(mqttClient); //  Declaration of the PubSubClient on the sensor wifi connection.
DHT dht_sensor(DHTPIN,DHT22); // DHT22 sensor with setup on pin


// ----------- MQTT Callback -----------

void callbackMQTT(char *topic, byte *payload, unsigned int length) {
 Serial.print("Message arrived on topic: ");
 Serial.println(topic);
 char bufferfreq[length];

  //setting arr as char array for id comparison
  char idChar[id.length()]; 
  strcpy(idChar, id.c_str()); 

  for (int i = 0; i < length; i++) {
     bufferfreq[i]=(char) payload[i];
   }

  // handling the request for switching the protocol
  if(!strcmp(topic,topic_req_switch )){
      StaticJsonDocument<100> docSwitch;
      DeserializationError err = deserializeJson(docSwitch, bufferfreq);
      String tempId = docSwitch["id"];
      char idCharT[tempId.length()]; 
      strcpy(idCharT, tempId.c_str());
       
     Serial.println("---------------");
     if(!strcmp(idCharT,idChar)){        
      int prot = docSwitch["protocol"];
      char buffer_dt[sizeof(docp)];  
      docp["id"] = id;
      docp["protocol"] = prot;
      docp["ip"]=WiFi.localIP();
      serializeJson(docp, buffer_dt);
      client.publish(topic_topic_switch, buffer_dt,2);
      if(prot==0){
            previous_prot = prot_mode;
            prot_mode = '1';        
      }else if(prot==1){
            previous_prot = prot_mode;
            prot_mode = '2';
        }
     }
  }
  if(!strcmp(topic,topic_receive_ping)){
    if(testingPing&&prot_mode=='1'){
      StaticJsonDocument<capacity> docPing;
      DeserializationError err = deserializeJson(docPing, bufferfreq);
   
    const char* tempId = docPing["id"];
    if(tempId!=NULL&&!strcmp(tempId,idChar)){
       unsigned long overall_time = millis()-previousTime;
       Serial.println("------- MQTT Overall time --------");
       Serial.print(overall_time);
       Serial.println(" ms");
       sumTime += overall_time; // differences with timestamp on the sum for the mean value
       Serial.println("-------- MQTT Average time in ms --------");
       avg = sumTime/timeCounter; // average value and intermediate result
       timeCounter += 1; // counter of iteration
       Serial.print(avg);
       Serial.println(" ms");
       looping = true; // update looping status
      }
    }
  }
  if(!strcmp(topic,topic_receive_RTT)){ 
    if(!testingPing&&prot_mode=='1'){
     StaticJsonDocument<capacity> docRTT;
     DeserializationError err = deserializeJson(docRTT, bufferfreq);

     Serial.println("---------------");
     Serial.println(idChar);
     String tempId = docRTT["id"];
     Serial.println(tempId);
     char idCharT[tempId.length()]; 
     strcpy(idCharT, tempId.c_str()); 
     Serial.println("---------------");
     if(!strcmp(idCharT,idChar)){          
          testingPing = true;
          Serial.println("--------------------------------------------------");
          Serial.print("MQTT Ping testing phase has switched to: ");
          Serial.println(testingPing); // testing mode chosen 0 for MQTT and 1 for CoAP
          Serial.println("--------------------------------------------------");
          timeCounter = 1;
          avg = 0;
          sumTime = 0;
          previousTime = 0;
          temp = previous_prot;
          looping=true;
      }
    }
  }
 if(!strcmp(topic,topic_receive_setup)){
   StaticJsonDocument<200> setupJ;
    DeserializationError err = deserializeJson(setupJ, bufferfreq);
    const char* tempId = setupJ["id"];
    if(!err&&!strcmp(tempId,id.c_str())){
      long int sampleFrequency = setupJ["sampleFrequency"];
      int minGas = setupJ["minGas"];
      int maxGas = setupJ["maxGas"];
 
      if(sampleFrequency != -1&&sampleFrequency != 0){
        Serial.print("Setup SAMPLE_FREQUENCY at: ");
        Serial.println(sampleFrequency);
         SAMPLE_FREQUENCY = sampleFrequency;
      }

      if(minGas != -1 && minGas!=0){
        Serial.print("Setup MIN_GAS_VALUE at: ");
        Serial.println(minGas);
        MIN_GAS_VALUE = minGas;   
      }

      if(maxGas != -1 && maxGas!=0){
        Serial.print("Setup MAX_GAS_VALUE at: ");
        Serial.println(maxGas);
        MAX_GAS_VALUE = maxGas; 
      }
  
    }
    
    if(!testingPing){
      // printing of the message received 
      Serial.print("MQTT: Message Metadata Received from the Sensor:");
      for (int i = 0; i < length; i++) {
        Serial.print((char) payload[i]);
        }
      Serial.println();
      Serial.println("-----------------------");
      }
    }
 }

// ------------- MQTT Setup -----------------
void MQTTSetup(){
  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(callbackMQTT); // setup the callback for the client connection (MQTT) 
  while (!client.connected()) {
     Serial.printf("The client %s connects to the public mqtt broker\n", id.c_str());
     if (client.connect(id.c_str(), mqtt_username, mqtt_password)) {
         Serial.println("Public emqx mqtt broker connected");
         client.subscribe(topic_receive_setup); // setup topic
         // Ping subscribe for protocol evaluation
         client.subscribe(topic_receive_ping); // ping
          // Subscribe for mqtt external testing RTT
         client.subscribe(topic_receive_RTT); // RTT testing (auto-loop)
         client.subscribe(topic_req_switch); // switch mode 
         
     } else {
         // connection error handler
         Serial.print("failed with state ");
         Serial.print(client.state());
         delay(2000);
     }
    }
}
// ------------ CoAP Functions ------------
void CoAPSetup(){
    server.SetPacketProvider(udpProvider);
    //coapClient.Start(proxyIp, 5683);
    server.CreateResource("data", Thing::CoAP::ContentFormat::TextPlain, true) //True means that this resource is observable
    .OnGet([](Thing::CoAP::Request & request) { //We are here configuring telling our server that, when we receive a "GET" request to this endpoint, run the the following code
      Serial.println("GET Request received for endpoint 'data'");

      // preparing buffers for String conversation
      serializeJson(doc, buffer_ff);

      //print every SAMPLE_FREQUENCY given by the proxy
      Serial.println("Protocol: CoAP"); 
      Serial.println("--------- Data -----------");
      Serial.print("WiFi RSS Strength: ");
      Serial.println(RSS);
      Serial.print("AQI:");
      Serial.println(AQI);
      Serial.print("Gas sensor: ");
      Serial.println(gas); 
      Serial.print("Temperature in Celsius: ");
      Serial.println(temperature); 
      Serial.print("Humidity value: " );
      Serial.println(humidity);
      Serial.println("--------------------------");

     

       //Return the current state of our data
      return Thing::CoAP::Status::Content(buffer_ff);
    });

      server.CreateResource("test", Thing::CoAP::ContentFormat::TextPlain, true) //True means that this resource is observable
    .OnGet([](Thing::CoAP::Request & request) { //We are here configuring telling our server that, when we receive a "GET" request to this endpoint, run the the following code
      Serial.println("GET Request received for endpoint 'data'");

       //Return the current state of our data
      return Thing::CoAP::Status::Content("200");
    });

    server.Start();
}

// ------------ Setup -----------------
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
  MQTTSetup();
  CoAPSetup();
}


void loop() {
  client.loop(); // MQTT loop
  // possible reconnection
   if(WiFi.status() != WL_CONNECTED){
      WiFi.reconnect();
      while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
      }
      Serial.println("WiFi reconnect");
    }
   
  RSS = WiFi.RSSI(); // RSS update

  if(!testingPing&&prot_mode!='2'){
  Serial.println("--------- Data -----------");
  Serial.print("WiFi RSS Strength: ");
  Serial.println(RSS);
  }

  // counting temporal loops
  loops++;

  // checking new input from the Serial
  temp = Serial.read();
  if(temp=='1'|| temp=='2' || temp=='3'){
    previous_prot = prot_mode;
    prot_mode = temp;
    // preparing buffers for String conversation
    char buffer_dt[sizeof(docp)];
    if(temp=='1'){
      docp["id"] = id;
      docp["protocol"] = 0;
      docp["ip"]=WiFi.localIP();
      serializeJson(docp, buffer_dt);
      client.publish(topic_topic_switch, buffer_dt,2);
    }else if(temp=='2'){
      docp["id"] = id;
      docp["protocol"] = 1;
      docp["ip"]=WiFi.localIP();
      serializeJson(docp, buffer_dt);
      client.publish(topic_topic_switch, buffer_dt,2);
    }
  }else if(temp == 't'&& prot_mode == '1'){ // starting testing 
    testingPing = !testingPing; // change at not
    Serial.println("--------------------------------------------------");
    Serial.print("Ping testing phase has switched to: ");
    Serial.println(testingPing);
    Serial.println("--------------------------------------------------");
    timeCounter = 1;
    avg = 0;
    sumTime = 0;
    previousTime = 0;
    temp = previous_prot;
  } else if (temp=='s'){ //hard stopping of the testing protocol
    testingPing = false;
    looping = true;
  }
  if(timeCounter>5&&testingPing){
    testingPing=false;
    Serial.println("--------------------------------------------------");
    Serial.println("Testing completed with average RTT resulting time of: ");
    Serial.print(avg);
    Serial.println(" ms");
    char buffer_avg[sizeof(docT)];
    docT["id"]=id;
    docT["time"]= avg;
    serializeJson(docT, buffer_avg);
    client.publish(topic_send_RTT_result, buffer_avg,2);   
    Serial.println("--------------------------------------------------");
  }
  // analogue reading from gas sensor
   gas = analogRead(SMOKE);
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
    AQI = 2;
  } else if(MIN_GAS_VALUE >= avg_gas && avg_gas> MAX_GAS_VALUE){
    AQI = 1;
  } else {
    AQI = 0;
  }

  // read DHT22 sensors
  humidity = dht_sensor.readHumidity(); 
  temperature = dht_sensor.readTemperature();  
  if(!testingPing&&prot_mode!='2'){
  // printing AQI
  Serial.print("AQI:");
  Serial.println(AQI);
  Serial.print("Gas sensor: ");
  Serial.println(gas); 
  Serial.print("Temperature in Celsius: ");
  Serial.println(temperature); 
  Serial.print("Humidity value: " );
  Serial.println(humidity);
  }

  // Creating the json file for sending values
  doc["id"] = id;
  doc["gps"]["lat"] = lat;
  doc["gps"]["lng"] = lng;
  doc["rss"] = RSS;
  doc["temp"] = temperature;
  doc["hum"] = humidity;
  doc["gasv"]["gas"] = gas;
  doc["gasv"]["AQI"] = AQI;
  doc["samF"] = SAMPLE_FREQUENCY;
  doc["ip"] = WiFi.localIP();
  if(prot_mode=='1')doc["protocol"] = 0;
  if(prot_mode=='2')doc["protocol"] = 1; 
  
  // preparing buffers for String conversation
  serializeJson(doc, buffer_ff);

  // verify protocol mode and execute the sending
  if (prot_mode == '1'){
    if(!testingPing) Serial.println("Protocol: MQTT");
    // mqtt publish

    if(!testingPing) client.publish(data_topic, buffer_ff,0);
    //ping testing on different QoS
    
    if(testingPing&&looping){
      previousTime=millis();
      looping=false;
      Serial.println("message sent!");
      Serial.print("loop at ");
      Serial.print(timeCounter);
      Serial.println("/5");
      client.publish(topic_receive_ping, buffer_ff,0);
    }
    if(!looping&&testingPing){
      if(millis()-previousTime>20000){
        Serial.println("---Testing failed, need to restart the testing phase---");
            testingPing = false;
            looping = true;      
      }
    }

  } else if(prot_mode == '2'){
    server.Process();  
    
  } else{
    // no valid protocol, we can't do nothing until the sensor administrator does not digit a correct mode
    Serial.println("Invalid Protocol Value: Digit 1 for MQTT or 2 for CoAP");
  }
  
  if(!testingPing&&prot_mode!='2')Serial.println("--------------------------");
  // customized delay based on the runtime setup
  if(!testingPing&&prot_mode!='2')delay(SAMPLE_FREQUENCY); 

  // loop the wifi client
  client.loop();
}
