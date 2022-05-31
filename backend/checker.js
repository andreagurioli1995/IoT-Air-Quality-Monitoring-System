/**
 * Checker file is a class in the proxy server to measures the availability of the sensors. In other words, it checks if a sensor continues to  send data or not
 * considering the testing mode phase in the timestamp differences and a bias due to the connection. Possible false negative and positive are not a problem for the 
 * dashboard, it lets only unavailable the sensor setting until the next sending (dependent on the sampleFrequency value).
 */


class Checker{

    constructor(){
        
    }
}