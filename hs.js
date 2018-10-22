var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);  //websockets
var Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
var sensor = require('node-dht-sensor');
var HEAT_OUTPUT = new Gpio(19, 'out'); //use GPIO pin 4, and specify that it is output

//var VENT_OUTPUT = new Gpio(4, 'out');// Future Ventilation unit activation output
//var ZONE1 = new Gpio(16, 'out');// Future Zone 1 temperature inputs for AM2302
//var ZONE2 = new Gpio(4, 'out');// Future Zone 2 temperature inputs for AM2302
//var ZONE3 = new Gpio(4, 'out');// Future Zone 3 temperature inputs for AM2302
//var ZONE4 = new Gpio(4, 'out');// Future Zone 4 temperature inputs for AM2302
//var ZONE5 = new Gpio(4, 'out');// Future Zone 5 temperature inputs for AM2302


let heater_temp = 70;  //default value to set the temperature till the sensors are polled.
let heat_setpoint = 72; //default setpoint for the temperature of the house.  So programs starts with the heat off.
let temp_check_interval = 1000 * 10;   // milliseconds mulitplied by the number of seconds between temperature checks 
let zone1_temp=0;

sensor.read(22, 12, function(err, temperature, humidity) {
    console.log('temp: ' + temperature.toFixed(1) + '°C, ' + 'humidity: ' + humidity.toFixed(1) + '%');
    });


//// check the temperature to turn on the heater every interval
 setInterval(function(){
 	var temp = heater_temp;  //pulling in global variable
 	var setpoint = heat_setpoint; //pulling in global variable
 	var boiler_active = "";

 	sensor.read(22, 12, function(err, temperature, humidity) {
 		heater_temp = temperature *1.8+32;
 		console.log(zone1_temp);
        console.log('temp: ' + temperature.toFixed(1) + '°C, ' + 'humidity: ' + humidity.toFixed(1) + '%');
	});



 	if (temp < setpoint){  //evalute the temperature, if it is less than the setpoint, turn on the heat.
 		HEAT_OUTPUT.writeSync(1); //set pin state to 1 (turn heater on)
 		} else {
 		HEAT_OUTPUT.writeSync(0); // set pin state to 0 (turns heater off)
 		}
 	if (HEAT_OUTPUT.readSync()) // looks at the state of the pin to determine if the heater is being sent an on/off signal
 		{boiler_active="ON";  //  The actual state of the output is being looked at to report its status 
 		} else {                 
 		boiler_active="OFF"};

 	console.log ("Setpoint is: " +setpoint + "   Current Temperature is: " + temp +"   Boiler is: "+boiler_active);
 	},temp_check_interval);




//Sends a default web page
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

//When a client connects this socket fires
io.on('connection', function(socket){
  console.log('a user connected');
  var switchvalue = 0;
/////////

/////When a client sends data to the server socket labeled'chat message', this fires.
  socket.on('chat message', function(msg){
  	console.log('message: '+ msg);
  	io.emit('chat message',msg);
  	if (msg == 'true'){
  		console.log("this is true")
  		HEAT_OUTPUT.writeSync(1); //set pin state to 0 (turn LED off)
  	} else{
  		console.log('this false')
  		HEAT_OUTPUT.writeSync(0);   //set pin state to 1 (turn LED on)
  	}
  });
//////////////


//FUTURE FUNCTIONALITY to create a SYSTEM ENABLE/DISABLE button the the webpage
 ////// recieves switch on or off from client, 
	// socket.on('switch', function(data){
	// 	switchvalue = data;
	// 	if (switchvalue != HEAT_OUTPUT.readSync()) { //only change the LED if the status is changed
	// 		HEAT_OUTPUT.writeSync(switchvalue);
	// 		console.log('Gpio changed');
	// 	}

	// })


	 ////// recieves a change in the temperature setpoint from client
	socket.on('new_temp', function(data){
		heat_setpoint = data;
		console.log(heat_setpoint);
	})

//// When a client disconnects, this fires.
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});
////////


http.listen(3000, function(){
  console.log('listening on *:3000');
});