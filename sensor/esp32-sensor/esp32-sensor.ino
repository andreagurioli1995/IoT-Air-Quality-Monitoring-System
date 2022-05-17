#include<Wire.h> 
#include<SPI.h> 
#include <DHT.h> 
#include <WiFi.h>
#include <PubSubClient.h>

 
#define DHTPIN 4 // data pin location, can change during installation 

// Protocol switching variables
int prot_mode = 1;

// WiFi Data
const char *ssid = "phone-connection-esp32"; // Enter your WiFi name
const char *password = "iphone510";  // Enter WiFi password

// MQTT Broker
const char *mqtt_broker = "broker.emqx.io";
const char *topic = "sensor/*";
const char *ping_topic = "sensor/ping";
const char *mqtt_username = "username";
const char *mqtt_password = "password";
const int mqtt_port = 1883;

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
  client.publish(ping_topic, "Ping test");
}

void setup() { 
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
  } else {
    coap_connection();
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
  humidity = dht_sensor.readHumidity(); 
  temperature = dht_sensor.readTemperature(); 
  Serial.println("--------------------------");
  Serial.print("Temperature in Celsius: ");
  Serial.println(temperature); 
  Serial.print("Humidity value: " );
  Serial.println(humidity);
  Serial.println("--------------------------");
  delay(2000); 
  client.loop();
 
}
