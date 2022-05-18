#include<Wire.h> 
#include<SPI.h> 
#include <DHT.h> 
#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <String.h>

 
#define DHTPIN 4 // Warning: data pin location, can change during installation 
#define SMOKE 34

int SAMPLE_FREQUENCY = 2000;
int MIN_GAS_VALUE = 4095;
int MAX_GAS_VALUE = 500;
int gas_values[5]={0,0,0,0,0};
float avg_gas;  
int loops = 0;
int AQI = 2;
float RSS = 0; 


// Protocol switching variables
char prot_mode = '1';
char temp;
// WiFi Data
const char *ssid = "iPhone"; // Warning: enter your WiFi name
const char *password = "19951995";  // Warning: enter WiFi password

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
String http_hostname = "proxy-iot-quality-air.herokuapp.com";
String pathname = "/update-data";


// WiFi client declaration
WiFiClient espClient;

// Declaration of the PubSubClient on the sensor wifi connection.
PubSubClient client(espClient);

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

    mqtt_connection();
    coap_connection();

 
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
  RSS = WiFi.RSSI();
  Serial.print("my strength is ");
  Serial.println(RSS);
  loops++;
  temp = Serial.read();
  if(temp=='1'|| temp=='2' || temp=='3'){
    prot_mode=temp;
  }
    
  //analogue reading from gas sensor
 int analogSensor = analogRead(SMOKE);
///////////////////////////////////////////////calculating avg gas value
  for(int c=3;c>=0;c--){
    gas_values[c+1]=gas_values[c];
  }
  gas_values[0]=analogSensor;
  int sum=0;
   for(int c=0;c<5;c++){
    sum+=gas_values[c];
  }
  if(loops<=5){
    avg_gas= sum/loops;
  }else{
    avg_gas= sum/5;
  }
  ///////////////////////////////////////////

  if(avg_gas<= MAX_GAS_VALUE){
    AQI=0;
  }else if(MIN_GAS_VALUE>=avg_gas>MAX_GAS_VALUE){
    AQI=1;
  }else{
    AQI=2;
  }
   Serial.println("/////////////////////////");
  Serial.println(AQI);
   Serial.println("/////////////////////////");
  
  float humidity = dht_sensor.readHumidity(); 
  float temperature = dht_sensor.readTemperature(); 
  Serial.println("--------------------------");
  Serial.print("Gas sensor: ");
  Serial.println(analogSensor); 
  Serial.println("--------------------------");
  Serial.print("Temperature in Celsius: ");
  Serial.println(temperature); 
  Serial.print("Humidity value: " );
  Serial.println(humidity);

  char buffer_temp[sizeof(float)];
  int ret = snprintf(buffer_temp, sizeof buffer_temp, "%f", temperature);
  char buffer_hum[sizeof(float)];
  int ret2 = snprintf(buffer_hum, sizeof buffer_hum, "%f", humidity);

  char buffer_gas[sizeof(double)];
  int ret3 = snprintf(buffer_gas, sizeof buffer_gas, "%d", analogSensor);

  if (prot_mode == '1'){
    Serial.println("mqtt protocol");
    // mqtt publish
    client.publish(temperature_topic, buffer_temp);
    client.publish(humidity_topic, buffer_hum);
  } else if(prot_mode == '2'){
    Serial.println("coap protocol");
    // to-do, sending to coap
  } else if(prot_mode == '3'){
    // http request didn't need setup() configuration except for WiFi connection.
      Serial.println("http protocol");
    // check that the sensor is still connected
    HTTPClient http;
    // define get request
    String http_path = "https://" + http_hostname + ":" + http_port + pathname + "?temp=" + buffer_temp + "?hum=" + buffer_hum + "?gas=" + buffer_gas;
    Serial.println("Sending " + http_path);
    http.begin(http_path);

    // send get http request
    int httpResponseCode = http.GET();

    // check response status
    Serial.printf("Response status %d\n", httpResponseCode);
    // free() request
    http.end();
  }
  
  Serial.println("--------------------------");
  delay(SAMPLE_FREQUENCY); 
  client.loop();
 
}
