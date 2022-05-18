#include<Wire.h> 
#include<SPI.h> 
#include <DHT.h> 
#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <String.h>

 
#define DHTPIN 4 // Warning: data pin location, can change during installation 
#define MQ2PIN 25

// Protocol switching variables
int prot_mode = 3;
int smokeA0 = 17;
// WiFi Data
const char *ssid = "Vodafone-C01410160"; // Warning: enter your WiFi name
const char *password = "PhzX3ZE9xGEy2H6L";  // Warning: enter WiFi password

// MQTT Broker
const char *mqtt_broker = "130.136.2.70";
const char *topic = "sensor/1175/";
const char *temperature_topic = "sensor/1175/temp";
const char *humidity_topic = "sensor/1175/hum";
const char *mqtt_username = "iot2020";
const char *mqtt_password = "mqtt2020*";
const int mqtt_port = 1883;

// Http protocol
int http_port = 8080;
String http_hostname = "localhost";
String pathname = "/update-sensor";


// WiFi client declaration
WiFiClient espClient;

// Declaration of the PubSubClient on the sensor wifi connection.
PubSubClient client(espClient);

// DHT22 sensor with setup on pin
DHT dht_sensor(DHTPIN,DHT22); 
float temperature, humidity; 


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
     } else {
         // connection error handler
         Serial.print("failed with state ");
         Serial.print(client.state());
         delay(2000);
     }
    }
  // publish on ping channel

}


void setup() { 
  pinMode(smokeA0, INPUT);
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
  if(prot_mode == 1){
    mqtt_connection();
  } else if(prot_mode == 2) {
    coap_connection();
  } else if(prot_mode == 3){
    // nothing, http did only WiFi connection
  }
 
}

void callback(char *topic, byte *payload, unsigned int length) {
 Serial.print("Message arrived in topic: ");
 Serial.println(topic);
 Serial.print("Message:");
 for (int i = 0; i < length; i++) {
     Serial.print((char) payload[i]);
 }
 Serial.println();
 Serial.println("-----------------------");
}

 
void loop() { 
  //analogue reading from gas sensor
  int analogSensor = analogRead(smokeA0);
  
  humidity = dht_sensor.readHumidity(); 
  temperature = dht_sensor.readTemperature(); 
  Serial.println("--------------------------");
  Serial.print("Gas sensor: ");
  Serial.println(analogSensor); 
  Serial.println("--------------------------");
  Serial.print("Temperature in Celsius: ");
  Serial.println(temperature); 
  Serial.print("Humidity value: " );
  Serial.println(humidity);

  char buffer_temp[64];
  int ret = snprintf(buffer_temp, sizeof buffer_temp, "%f", temperature);
  char buffer_hum[64];
  int ret2 = snprintf(buffer_hum, sizeof buffer_hum, "%f", humidity);

  if (prot_mode == 1){
    // mqtt publish
    client.publish(temperature_topic, buffer_temp);
    client.publish(humidity_topic, buffer_hum);
  } else if(prot_mode == 2){
    // to-do, sending to coap
  } else if(prot_mode == 3){
    // http request didn't need setup() configuration except for WiFi connection.
      
    // check that the sensor is still connected
    HTTPClient http;
    // define get request
    String http_path = "http://" + http_hostname + ":" + http_port + pathname + "?temp=" + ret + "?hum=" + ret2;
    Serial.println("Sending" + http_path);
    http.begin(http_path.c_str());

    // send get http request
    int httpResponseCode = http.GET();

    // check response status
    Serial.printf("Response status %d", &httpResponseCode);
    // free() request
    http.end();

    
  }
  
  Serial.println("--------------------------");
  delay(2000); 
  client.loop();
 
}
