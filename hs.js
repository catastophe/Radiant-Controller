var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);  //websockets
var Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
var LED = new Gpio(4, 'out'); //use GPIO pin 4, and specify that it is output

let heater_temp = 70;  //default value to set the temperature till the sensors are polled.
let heat_setpoint = 72; //default setpoint for the temperature of the house.  So programs starts with the heat off.
let temp_check_interval = 1000 * 5;   // milliseconds mulitplied by the number of seconds between temperature checks 


//// check the temperature to turn on the heater every interval
 setInterval(function(){
 	var heater_temp=heater_temp;  //pulling in global variable
 	var heat_setpoint = heat_setpoint; //pulling in global variable
 	var boiler_active = "";

 	if (heater_temp < _heat_setpoint){  //evalute the temperature, if it is less than the setpoint, turn on the heat.
 		LED.writeSync(1); //set pin state to 1 (turn heater on)
 		} else {
 		LED.writeSync(0); // set pin state to 0 (turns heater off)
 		}
 	if (LED.readSync()) // looks at the state of the pin to determine if the heater is being sent an on/off signal
 		{boiler_active="ON";  //  The actual state of the output is being looked at to report its status 
 		} else {                 
 		boiler_active="OFF"};

 	console.log ("Setpoint is: " +heat_setpoint + "   Current Temperature is: " + heater_temp +"   Boiler is: "+boiler_active);
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
  		LED.writeSync(1); //set pin state to 0 (turn LED off)
  	} else{
  		console.log('this false')
  		LED.writeSync(0);   //set pin state to 1 (turn LED on)
  	}
  });
//////////////


//FUTURE FUNCTIONALITY to create a SYSTEM ENABLE/DISABLE button the the webpage
 ////// recieves switch on or off from client, 
	// socket.on('switch', function(data){
	// 	switchvalue = data;
	// 	if (switchvalue != LED.readSync()) { //only change the LED if the status is changed
	// 		LED.writeSync(switchvalue);
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