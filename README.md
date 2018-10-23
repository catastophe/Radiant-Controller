# Radiant-Controller

Goal of this Project
To Build a Radiant Heat controller that will sense and modulate heat to 4 zones in a house.
Build a web interface to adjust temperature setpoints.  Initially I'll plan to get the system to 
operate with one zone and then expand it to work with 4.

Utilizing:
Raspberry Pi 3B+,
Node JS,
AM2302 Temperature and Humidity sensors,
Custom PCB to interface between Raspberry Pi sensors and the heating unit.

Boiler Unit and Zone distribution Panel
Already has a built in ability to maintain temperature of the water being pumped through out the network
of pipes running throughout the floor. All it needs is a signal to activate at this time.  Currently all zones
receive heat at the same time and individual zone control isn't possible till motorized valve controls are added.
Individual control is a longer term goal.   
For boiler and pump activation;  The unit has a 15 volt DC signal that needs to be shorted between two terminals.  This would
normally be connected to some type of bimetal thermometer or relay controller at a remote location. 

AM2302 Sensors
These might be challenging.  Data sheet says that supplying 5volts to them will let them transmit their data almost 100 feet.
I easily have 1 sensor that will be about 60 feet of linear wire distance to travel and probably near 120volt power lines.  Electrical
noise maybe an obstacle.  Might need to run data appropriate wire in house cavities.

I'm open to other sensors that will work over a long wire distance.
