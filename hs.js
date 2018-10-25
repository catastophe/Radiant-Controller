var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);  //websockets
var Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
var sensor = require('node-dht-sensor');
var HEAT_OUTPUT = new Gpio(6, 'out'); //use GPIO pin 4, and specify that it is output
var HEAT_LOOP_TIME = 1000*60*30 ///  Heat Loop interval time.  millseconds X seconds X minutes  1000*60*60= 1 hour
 
//var VENT_OUTPUT = new Gpio(4, 'out');// Future Ventilation unit activation output
var ZONE1 = new Gpio(19, 'out');//  Zone 1 temperature inputs for AM2302
//var ZONE2 = new Gpio(4, 'out');// Future Zone 2 temperature inputs for AM2302
//var ZONE3 = new Gpio(4, 'out');// Future Zone 3 temperature inputs for AM2302
//var ZONE4 = new Gpio(4, 'out');// Future Zone 4 temperature inputs for AM2302
//var ZONE5 = new Gpio(4, 'out');// Future Zone 5 temperature inputs for AM2302


let heater_temp = 70;  //default value to set the temperature till the sensors are polled.
let house_humidity = 50;   // default value till the sensors getted polled
let heat_setpoint = 71; //default setpoint for the temperature of the house.  So programs starts with the heat off.
let temp_check_interval = 1000 * 10;   // milliseconds mulitplied by the number of seconds between temperature checks 
let zone1_temp=0;
let force_change=0;
// code to test the reading of the AM2302 on GPIO 12
// sensor.read(22, 12, function(err, temperature, humidity) {
//     console.log('temp: ' + temperature.toFixed(1) + '°C, ' + 'humidity: ' + humidity.toFixed(1) + '%');
//     });


//// check the temperature and report the status each interval
 setInterval(function(){
 	var temp = heater_temp;  //pulling in global variable
 	var setpoint = heat_setpoint; //pulling in global variable
 	var boiler_active = "";
 	//console.log("inside status loop")
 	sensor.read(22, 12, function(err, temperature, humidity) {  //reading the AM2302 and recording data to the console and variables.
 		heater_temp = (temperature *1.8+32).toFixed(1);  // converting to Farenheit
 		house_humidity = humidity    // recording for use later.  May hook this up to the HRV in the future.
 		//console.log(zone1_temp);
        //console.log('temp: ' + temperature.toFixed(1) + '°C, ' + 'humidity: ' + humidity.toFixed(1) + '%');
	});


 	if (force_change) {
 		console.log('inside force_change');
 		force_change =0;
 		if (temp < setpoint){  //evalute the temperature, if it is less than the setpoint, turn on the heat.
 			HEAT_OUTPUT.writeSync(1);
 			ZONE1.writeSync(1) //set pin state to 1 (turn heater on)
 		} else {
 			HEAT_OUTPUT.writeSync(0);
 			ZONE1.writeSync(0) // set pin state to 0 (turns heater off)
 			}
 		console.log('New setpoint, accepted and boiler activation test completed. change reset '+ force_change);
 	}
 	if (HEAT_OUTPUT.readSync()) // looks at the state of the pin to determine if the heater is being sent an on/off signal
 		{boiler_active="ON";  //  The actual state of the output is being looked at to report its status 
 		} else {                 
 		boiler_active="OFF"};

 	console.log ("Setpoint is: " +setpoint + "   Current Temperature is: " + temp +"   Boiler is: "+boiler_active);
 	io.sockets.emit('broadcast',{setpoint: setpoint, temp: heater_temp, humid: house_humidity, boiler: HEAT_OUTPUT.readSync()});
 	},temp_check_interval);   //send info to the console and them broadcasts data to the connected clients.



//// Check the boiler status and if the room temperature is low turn on, recheck at a reduced interval.
// This is the normal operating loop
 setInterval(function(){
 	var temp = heater_temp;  //pulling in global variable
 	var setpoint = heat_setpoint; //pulling in global variable
 	var boiler_active = "";
 	console.log("inside primary heatloop")
//	sensor.read(22, 12, function(err, temperature, humidity) {  //reading the AM2302 and recording data to the console and variables.
// 		heater_temp = (temperature *1.8+32).toFixed(1);  // converting to Farenheit
// 		house_humidity = humidity    // recording for use later.  May hook this up to the HRV in the future.
 	//	console.log(zone1_temp);
    //    console.log('temp: ' + temperature.toFixed(1) + '°C, ' + 'humidity: ' + humidity.toFixed(1) + '%');
//	});

 	if (temp < setpoint){  //evalute the temperature, if it is less than the setpoint, turn on the heat.
 		HEAT_OUTPUT.writeSync(1);
 		ZONE1.writeSync(1) //set pin state to 1 (turn heater on)
 		} else {
 		HEAT_OUTPUT.writeSync(0);
 		ZONE1.writeSync(0) // set pin state to 0 (turns heater off)
 		}
 	if (HEAT_OUTPUT.readSync()) // looks at the state of the pin to determine if the heater is being sent an on/off signal
 		{boiler_active="ON";  //  The actual state of the output is being looked at to report its status 
 		} else {                 
 		boiler_active="OFF"};

// 	console.log ("Setpoint is: " +setpoint + "   Current Temperature is: " + temp +"   Boiler is: "+boiler_active);
// 	io.sockets.emit('broadcast',{temp: heater_temp, humid: house_humidity, boiler: HEAT_OUTPUT.readSync()});
 	},HEAT_LOOP_TIME);   //send info to the console and them broadcasts data to the connected clients.





//Sends a default web page
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

//When a client connects this socket fires
io.on('connection', function(socket){
  console.log('a user connected');
  //io.sockets.emit('broadcast',{temp: heater_temp,boiler: HEAT_OUTPUT.readSync()});
  var switchvalue = 0;
/////////

/////When a client sends data to the server socket labeled'chat message', this fires.
  // socket.on('chat message', function(msg){
  // 	console.log('message: '+ msg);
  // 	io.emit('chat message',msg);
  // 	if (msg == 'true'){
  // 		console.log("this is true")
  // 		HEAT_OUTPUT.writeSync(1); //set pin state to 0 (turn LED off)
  // 	} else{
  // 		console.log('this false')
  // 		HEAT_OUTPUT.writeSync(0);   //set pin state to 1 (turn LED on)
  // 	}
  // });
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
		heat_setpoint = data;   //records the new setpoint for use in the control loop
		force_change=1;
		//console.log(heat_setpoint +"and force_change is "+ force_change);
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