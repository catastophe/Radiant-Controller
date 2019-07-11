var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);  //websockets
var Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
var sensor = require('node-dht-sensor');
var HEAT_OUTPUT = new Gpio(3, 'out'); //use GPIO pin 4, and specify that it is output
var HEAT_LOOP_TIME = 1000*60*30 ///  Heat Loop interval time.  millseconds X seconds X minutes  1000*60*60= 1 hour
var HRV_OUTPUT_LOW = new Gpio(27,'out');
var HRV_OUTPUT_HIGH = new Gpio(14,'out');
var HRV_SPEED = 0;
//var VENT_OUTPUT = new Gpio(4, 'out');// Future Ventilation unit activation output
//var ZONE1 = new Gpio(13, 'out');//  Zone 1 temperature inputs for AM2302
//var ZONE2 = new Gpio(4, 'out');// Future Zone 2 temperature inputs for AM2302
//var ZONE3 = new Gpio(4, 'out');// Future Zone 3 temperature inputs for AM2302
//var ZONE4 = new Gpio(4, 'out');// Future Zone 4 temperature inputs for AM2302
//var ZONE5 = new Gpio(4, 'out');// Future Zone 5 temperature inputs for AM2302

let hrvtime = 0;  // default time to run the HRV;
let hrv_active = 0;  //tracks whether the HRV is on or OFF;
let hrv_update = 0; // value of 1 will allow entry to condition statements to turn off HRV early.
let hrv_timeout = "";  //Identity of the Timeout.  We call this clearTimeout(hrv_timeout) to kill the hrv interval early
let hrv_manual_activation = 0;
let hrv_auto_activation = 0;
let min_house_temp = 60; //Sets a minimum acceptable temperature that can be accepted from a client
let max_house_temp = 75; //Sets a maximum acceptable temperature that can be accepted from a client.
let heater_temp = 70;  //default value to set the temperature till the sensors are polled.
let house_humidity = 50;   // default value till the sensors getted polled
let heat_setpoint = 71; //default setpoint for the temperature of the house.  So programs starts with the heat off.
let temp_check_interval = 1000 * 10;   // milliseconds mulitplied by the number of seconds between temperature checks 
let master_bedroom_temp = 40;
let master_bedroom_humidity =50;
let bathroom_temp = 90;  //////default bathroom temp
let bathroom_humidity = 50;   //default bathroom humidity
//let zone1_temp=0;
let force_change=0;      
let showerisON = 0;


//// check the temperature and report the status each interval
 setInterval(function(){

 	var temp = heater_temp;  //pulling in global variable
 	var setpoint = heat_setpoint; //pulling in global variable
 	var boiler_active = "";
 	//var hrv = hrvtime;
 	//console.log("inside status loop")
 	console.log(hrvtime);
//////////////////////////////////
//Reading the Front room sensor
///////////////////////////////

 	sensor.read(22, 13, function(err, temperature, humidity) {  //reading the AM2302 and recording data to the console and variables.
 		heater_temp = (temperature *1.8+32).toFixed(1);  // converting to Farenheit
 		house_humidity = (humidity+0).toFixed(1);    // recording for use later.  May hook this up to the HRV in the future.
 		//console.log(zone1_temp);
        //console.log('temp: ' + temperature.toFixed(1) + '°C, ' + 'humidity: ' + humidity.toFixed(1) + '%');
	});
////////////


////////////////////////////
///Reading the master bedroom 
////////////////////////////

	 sensor.read(22, 19, function(err, temperature, humidity) {  //reading the AM2302 and recording data to the console and variables.
 		master_bedroom_temp = (temperature *1.8+32).toFixed(1);  // converting to Farenheit
 		master_bedroom_humidity = humidity.toFixed(1);
 		//console.log('Master temp: ' + temperature.toFixed(1) + '°C, ' + 'Master humidity: ' + humidity.toFixed(1) + '%');
 	});
///////////////////


///////////////////////
////Reading the Bathroom
///////////////////////
	 sensor.read(22, 16, function(err, temperature, humidity) {  //reading the AM2302 and recording data to the console and variables.
 		bathroom_temp = (temperature *1.8+32).toFixed(1);  // converting to Farenheit
 		bathroom_humidity = humidity.toFixed(1);
 		//console.log('Master temp: ' + temperature.toFixed(1) + '°C, ' + 'Master humidity: ' + humidity.toFixed(1) + '%');
 	});
/////////////////////



/////////////////////
 	if (force_change) {
 		console.log('inside force_change');
 		force_change =0;
 		if (temp < setpoint){  //evalute the temperature, if it is less than the setpoint, turn on the heat.
 			HEAT_OUTPUT.writeSync(1);
 			//ZONE1.writeSync(1) //set pin state to 1 (turn heater on)
 		} else {
 			HEAT_OUTPUT.writeSync(0);
 			//ZONE1.writeSync(0) // set pin state to 0 (turns heater off)
 			}
 		console.log('New setpoint, accepted and boiler activation test completed. change reset '+ force_change);
 	}

//checking bathroom for high humidity and turning on
	if ((bathroom_humidity - house_humidity) > 10) {
		HRV_OUTPUT_HIGH.writeSync(1);
		hrv_auto_activation = 1;
	}

	
	if ((bathroom_humidity - house_humidity) < 5 && hrv_auto_activation == 1) {
		hrv_auto_activation = "Timing out";
		console.log('Started the bathroom vent off timeout');
		setTimeout(function() {
			console.log('Bathroom timeout completed, vent off ');
			HRV_OUTPUT_HIGH.writeSync(0);
			},300000);/// Run the vent an extra 5 minutes after the shower humidity has dropped.
		
	}



// Update the currrent known status of the Heater, On or Off
 	if (HEAT_OUTPUT.readSync()) // looks at the state of the pin to determine if the heater is being sent an on/off signal
 		{
 		boiler_active="ON";  //  The actual state of the output is being looked at to report its status 
 		} else {                 
 		boiler_active="OFF"
 		};


////Update the current known status of the Ventillation,  On or Off
 	if (HRV_OUTPUT_HIGH.readSync()==1 || HRV_OUTPUT_LOW.readSync()==1 ) // looks at the state of the pin to determine if the heater is being sent an on/off signal
 		{
 		hrv_active="ON";  //  The actual state of the output is being looked at to report its status 
 		} else {                 
 		hrv_active="OFF"
 		};
 	
console.log(hrvtime+" is hrvtime");

////////////////////////////////////////////////////////////////////////
///////////  Setting manual activation of the Ventilation  /////////////
////////////////////////////////////////////////////////////////////////
	if (hrv_update == 1) {
	switch(hrvtime){
		
		case -1:   //For whatever the reason, forcing the outputs off.
			console.log('forcing HRV off');
			HRV_OUTPUT_HIGH.writeSync(0);
			HRV_OUTPUT_LOW.writeSync(0);
			hrv_update = 0;
			clearTimeout(hrv_timeout);
			hrvtime = 0;
			hrv_manual_activation = "OFF";
		break;

		case 15:
			hrv_update = 0;
			hrv_manual_activation = "YES";
			if (HRV_SPEED=="true") {
				console.log("in highspeed 15");
 				HRV_OUTPUT_HIGH.writeSync(1);
 			}else{
 				console.log("in lowspeed 15");
 				HRV_OUTPUT_LOW.writeSync(1);
 			}
 			hrv_timeout = setTimeout(function(){
  				HRV_OUTPUT_HIGH.writeSync(0);
  				HRV_OUTPUT_LOW.writeSync(0);
  				hrv_manual_activation = "OFF";
  			},(hrvtime*60000));
  			hrvtime = 0;
		break;

		case 30:
			hrv_update = 0;
			hrv_manual_activation = "YES";
			if (HRV_SPEED=="true") {
				console.log("in highspeed 30");
 				HRV_OUTPUT_HIGH.writeSync(1);
 			}else{
 				console.log("in lowspeed 30");
 				HRV_OUTPUT_LOW.writeSync(1);
 			}
 			hrv_timeout = setTimeout(function(){
  				HRV_OUTPUT_HIGH.writeSync(0);
  				HRV_OUTPUT_LOW.writeSync(0);
  				hrv_manual_activation = "OFF";
  			},(hrvtime*60000));
  			hrvtime = 0;
		break ;

		case 45:
			hrv_update = 0;
			hrv_manual_activation = "YES";
			if (HRV_SPEED=="true") {
				console.log("in highspeed 45");
 				HRV_OUTPUT_HIGH.writeSync(1);
 			}else{
 				console.log("in lowspeed 45");
 				HRV_OUTPUT_LOW.writeSync(1);
 			}
 			hrv_timeout = setTimeout(function(){
  				HRV_OUTPUT_HIGH.writeSync(0);
  				HRV_OUTPUT_LOW.writeSync(0);
  				hrv_manual_activation = "OFF";
  			},(hrvtime*60000));
  			hrvtime = 0;
		break;

		case 60:
			hrv_update = 0;
			hrv_manual_activation = "YES";
			if (HRV_SPEED=="true") {
				console.log("in highspeed 60");
 				HRV_OUTPUT_HIGH.writeSync(1);
 			}else{
 				console.log("in lowspeed 60");
 				HRV_OUTPUT_LOW.writeSync(1);
 			}
 			hrv_timeout = setTimeout(function(){
  				HRV_OUTPUT_HIGH.writeSync(0);
  				HRV_OUTPUT_LOW.writeSync(0);
  				hrv_manual_activation = "OFF";
  			},(hrvtime*60000));
  			hrvtime = 0;
		break;


		default:
		console.log('Did not match any HRV manual activation cases');
		hrv_update = 0;
		}
	}	

////////////////////////////////////////////////////////
///////////////  Output Sensor status to Console ////////////////////
//////////////////////////////////////////////////////
	console.log ("Setpoint is: " +setpoint +
 				 "   LR temp : " + temp +
 				 "   LRoom humidity is: " + house_humidity +
 				 "   MR temp is: "+ master_bedroom_temp+
 				 "   Boiler is: "+boiler_active+
 				 "   HRV is: "+ hrv_active+
 				 "   Bath Humidity is: " + bathroom_humidity +
 				 "   Manual: "+ hrv_manual_activation+
 				 "   Auto: "+ hrv_auto_activation
 			  );
 	//console.log ("Master Temperature is: " + master_bedroom_temp +"   Master Humidity is: "+master_bedroom_humidity);



////////////////////////////////////////////////////////
///////////////  Sending data to connected Clients ////////////////////
//////////////////////////////////////////////////////

 	io.sockets.emit('broadcast',{
 		setpoint: setpoint, 
 		temp: heater_temp, 
 		humid: house_humidity,
 		livingtemp: heater_temp,
 		livinghumid: house_humidity, 
 		mastertemp: master_bedroom_temp,
 		masterhumid: master_bedroom_humidity,
 		boiler: boiler_active,
 		vent: hrv_active,
 		bathhumid: bathroom_humidity,
 		bathtemp: bathroom_temp
 	});
 	},temp_check_interval);   //send info to the console and them broadcasts data to the connected clients.



//// Check the boiler status and if the room temperature is low turn on, recheck at a reduced interval.
// This is the normal operating loop
 setInterval(function(){
 	var temp = heater_temp;  //pulling in global variable
 	var setpoint = heat_setpoint; //pulling in global variable
 	var boiler_active = "";
// 	console.log("inside primary heatloop")
//	sensor.read(22, 12, function(err, temperature, humidity) {  //reading the AM2302 and recording data to the console and variables.
// 		heater_temp = (temperature *1.8+32).toFixed(1);  // converting to Farenheit
// 		house_humidity = humidity    // recording for use later.  May hook this up to the HRV in the future.
 	//	console.log(zone1_temp);
    //    console.log('temp: ' + temperature.toFixed(1) + '°C, ' + 'humidity: ' + humidity.toFixed(1) + '%');
//	});

 	if (temp < setpoint){  //evalute the temperature, if it is less than the setpoint, turn on the heat.
 		HEAT_OUTPUT.writeSync(1);
 		//ZONE1.writeSync(1) //set pin state to 1 (turn heater on)
 		} else {
 		HEAT_OUTPUT.writeSync(0);
 		//ZONE1.writeSync(0) // set pin state to 0 (turns heater off)
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


//////////////////////////////////////////////////////////////////
	 ////// recieves a change in the temperature setpoint from client
//////////////////////////////////////////////////////////////////
	socket.on('new_temp', function(data){
		if (min_house_temp < data < max_house_temp) {   // sets boundries of an acceptable temperature recieved from a client.
			heat_setpoint = data;   //records the new setpoint for use in the control loop
			force_change=1;
		}		
		//console.log(heat_setpoint +"and force_change is "+ force_change);
	})

/////////////////////////////////////////////////
///////////////// Manual Activation of the HRV ////////////////////
////////////////////////////////////////////////
	socket.on('hrv', function(data){
		console.log(data);
		var hrvdata = data.split(",");
		//console.log(hrvtime); 
		hrv_update = 1;
		hrvtime = Number(hrvdata[0]); // time in minutes to the hrv global variable.
		HRV_SPEED = hrvdata[1];   //sets whether the hrv speed is high or low.
		}
	)


//// When a client disconnects, this fires.
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});
////////


http.listen(3000, function(){
  console.log('listening on *:3000');
});