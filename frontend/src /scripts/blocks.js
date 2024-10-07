Blockly.Blocks['say_hallo'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Say Hallo");
      // this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip('Generates code to say "Hallo"');
      this.setColour(160);
    }
  };

  // Generate Arduino code for the say_hallo block
  Blockly.Arduino['say_hallo'] = function (block) {
    var code = 'Serial.println("Hallo");\n';
    return code;
  };

  // Initialize Blockly workspace
  function init() {
    var workspace = Blockly.inject('blocklyDiv', {
      toolbox: document.getElementById('toolbox')
    });
  }
// Define the read_distance block with unit selection
Blockly.Blocks['read_distance'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Time of Flight")
        .appendField(new Blockly.FieldDropdown([["mm", "MM"], ["inches", "INCHES"]]), "UNIT"); // Dropdown menu for unit selection
      this.setOutput(true, 'Number'); // The block outputs a numeric value
      this.setTooltip('Reads distance and outputs in either mm or inches');
      this.setColour(160); // Color of the block
    }
  };
  
  // Generate Arduino code for the read_distance block
  Blockly.Arduino['read_distance'] = function (block) {
  // Get selected unit from the dropdown
  var unit = block.getFieldValue('UNIT');

  // Add the Wire library for I2C communication
  Blockly.Arduino.definitions_['define_wire'] = '#include <Wire.h>';

  // Add setup code for initializing Wire communication
  Blockly.Arduino.setups_['setup_wire'] = 'Wire.begin();';

  // Declare variables and functions only once for the distance sensor
  Blockly.Arduino.definitions_['define_read_distance'] = `
unsigned short lenth_val = 0;
unsigned char i2c_rx_buf[16];

void SensorRead(unsigned char addr, unsigned char* datbuf, unsigned char cnt) {
  Wire.beginTransmission(82); // Transmit to device #82 (0x52)
  Wire.write(byte(addr));      // Sets distance data address (addr)
  Wire.endTransmission();      // Stop transmitting
  delay(1); // Delay for sensor to take readings
  Wire.requestFrom(82, cnt); // Request cnt bytes from slave device #82 (0x52)
  if (cnt <= Wire.available()) {
    *datbuf++ = Wire.read();  // Receive high byte
    *datbuf++ = Wire.read();  // Receive low byte
  }
}

float ReadDistance(String unit) {
  SensorRead(0x00, i2c_rx_buf, 2); // Read two bytes of distance data
  lenth_val = i2c_rx_buf[0];
  lenth_val = lenth_val << 8;
  lenth_val |= i2c_rx_buf[1];
  delay(300);

  // Convert the distance based on the unit
  if (unit.equals("MM")) {
    return lenth_val;  // Return distance in mm
  } else if (unit.equals("INCHES")) {
    return lenth_val * 0.0394; // Convert mm to inches
  }

  return lenth_val; // Default to millimeters if no unit is specified
}
  `;

  // Generate code based on the selected unit (call ReadDistance with the unit)
  var code = '';
  if (unit === 'MM') {
    code = 'ReadDistance("MM")';
  } else if (unit === 'INCHES') {
    code = 'ReadDistance("INCHES")';
  }

  return [code, Blockly.Arduino.ORDER_ATOMIC];
};

 // Define the ultrasonic sensor block
Blockly.Blocks['ultrasonic_sensor'] = {
  init: function () {
    // Inputs for selecting trig and echo pins, and the distance unit (cm or inches)
    this.appendDummyInput()
      .appendField("Ultrasonic Sensor on trig pin")
      .appendField(new Blockly.FieldTextInput("5"), "TRIG_PIN") // Trig pin input as text
      .appendField("and echo pin")
      .appendField(new Blockly.FieldTextInput("18"), "ECHO_PIN"); // Echo pin input as text
    this.appendDummyInput()
      .appendField("Measure in")
      .appendField(new Blockly.FieldDropdown([["cm", "CM"], ["inches", "INCHES"]]), "UNIT"); // Unit selection input
    this.setOutput(true, 'Number'); // Block outputs a numeric value
    this.setTooltip('Measures distance using an ultrasonic sensor.');
    this.setColour(160); // Set block color
  }
};

// Generate Arduino code for the ultrasonic sensor block
// Generate Arduino code for the ultrasonic sensor block
Blockly.Arduino['ultrasonic_sensor'] = function (block) {
  // Get values from the block fields
  var trigPin = block.getFieldValue('TRIG_PIN');
  var echoPin = block.getFieldValue('ECHO_PIN');
  var unit = block.getFieldValue('UNIT');

  // Declare pin numbers globally (only if they haven't been declared yet)
  Blockly.Arduino.definitions_['define_ultrasonic_pins'] = `
const int trigPin = ${trigPin};
const int echoPin = ${echoPin};
  `;

  // Set up pinMode in the setup function
  Blockly.Arduino.setups_['setup_ultrasonic'] = `
pinMode(trigPin, OUTPUT);
pinMode(echoPin, INPUT);
  `;

  // Declare other variables and the function globally
  Blockly.Arduino.definitions_['define_ultrasonic'] = `
#define SOUND_SPEED 0.034
#define CM_TO_INCH 0.393701
long duration;
float distanceCm;
float distanceInch;

float getUltrasonicDistance() {
  // Clear the trigPin
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  
  // Set the trigPin on HIGH for 10 microseconds
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  // Read the echoPin and calculate the distance
  duration = pulseIn(echoPin, HIGH);
  distanceCm = duration * SOUND_SPEED / 2;
  `;

  // Add code for returning the result based on the selected unit (cm or inches)
  if (unit === 'CM') {
    Blockly.Arduino.definitions_['define_ultrasonic'] += `
    return distanceCm;
  }
    `;
  } else if (unit === 'INCHES') {
    Blockly.Arduino.definitions_['define_ultrasonic'] += `
    distanceInch = distanceCm * CM_TO_INCH;
    return distanceInch;
  }
    `;
  }

  // Use the function in the loop or other blocks
  var code = `getUltrasonicDistance()`;

  return [code, Blockly.Arduino.ORDER_ATOMIC];
};

// Define Serial.print block
Blockly.Blocks['serial_print'] = {
  init: function() {
    this.appendValueInput("CONTENT")
        .setCheck(null)
        .appendField("Serial.print");
    // this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setTooltip("Print content to the serial monitor without a newline");
    this.setHelpUrl("");
  }
};

// Generate Arduino code for Serial.print block
Blockly.Arduino['serial_print'] = function(block) {
  var content = Blockly.Arduino.valueToCode(block, 'CONTENT', Blockly.Arduino.ORDER_ATOMIC) || '0';
  
  // Generate the code to print the content without a newline
  var code = 'Serial.print(' + content + ');\n';
  return code;
};


Blockly.Blocks['infrared_sensor'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Read Infrared Sensor on pin")
      .appendField(new Blockly.FieldDropdown([
        ["2", "2"], 
        ["3", "3"], 
        ["4", "4"], 
        ["5", "5"], 
        ["6", "6"], 
        ["7", "7"], 
        ["8", "8"], 
        ["9", "9"], 
        ["10", "10"], 
        ["11", "11"], 
        ["12", "12"], 
        ["13", "13"],
        ["18", "18"]
      ]), "PIN");  // Add a dropdown for pin selection

    this.setOutput(true, 'Boolean');  // Set the block to output a boolean value
    this.setTooltip('Reads the state of the infrared sensor.');
    this.setColour(160);  // Set the color of the block
  }
};
Blockly.Arduino['infrared_sensor'] = function(block) {
  // Define the sensor pin
  var pin = block.getFieldValue('PIN');
  
  // Add the definition for the sensor pin
  Blockly.Arduino.definitions_['define_ir_sensor_pin'] = '#define SENSOR_PIN ' + pin + ' // IR obstacle avoidance sensor pin';

  // Set up the sensor pin as an input in the setup function
  Blockly.Arduino.setups_['setup_ir_sensor_pin'] = 'pinMode(SENSOR_PIN, INPUT);';

  // Generate the code to read the sensor state and return it
  var code = 'digitalRead(SENSOR_PIN) == LOW';  // returns true if an obstacle is detected, false otherwise

  return [code, Blockly.Arduino.ORDER_ATOMIC];
};

Blockly.Blocks['dht_sensor'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("DHT Sensor Type")
      .appendField(new Blockly.FieldDropdown([["DHT11", "DHT11"], ["DHT22", "DHT22"]]), "DHT_TYPE")
      .appendField("Pin")
      .appendField(new Blockly.FieldDropdown([
        ["2", "2"], 
        ["3", "3"], 
        ["4", "4"], 
        ["5", "5"], 
        ["6", "6"], 
        ["7", "7"], 
        ["8", "8"], 
        ["9", "9"], 
        ["10", "10"], 
        ["11", "11"], 
        ["12", "12"], 
        ["13", "13"]
      ]), "PIN");

    this.appendDummyInput()
      .appendField("Temperature in")
      .appendField(new Blockly.FieldDropdown([["Celsius", "C"], ["Fahrenheit", "F"]]), "TEMP_UNIT");

    this.setOutput(true, 'Number');
    this.setTooltip('Reads temperature or humidity from a DHT sensor.');
    this.setColour(230);  // Set the block color
  }
};

Blockly.Arduino['dht_sensor'] = function(block) {
  // Get user input from the block for the sensor type (DHT11/DHT22) and the pin
  var dhtType = block.getFieldValue('DHT_TYPE');  // Get the selected DHT type (DHT11 or DHT22)
  var pin = block.getFieldValue('PIN');           // Get the pin connected to the DHT sensor
  
  // Add the DHT library to the generated code
  Blockly.Arduino.definitions_['define_dht'] = '#include "DHT.h"';
  
  // Declare the DHT object with the selected pin and type
  Blockly.Arduino.definitions_['declare_dht'] = `DHT dht(${pin}, ${dhtType});`;

  // Add the setup code for initializing the DHT sensor
  Blockly.Arduino.setups_['setup_dht'] = 'dht.begin();';

  // Generate code to read the temperature or humidity based on user selection
  var tempUnit = block.getFieldValue('TEMP_UNIT'); // Get the temperature unit (Celsius or Fahrenheit)
  
  var code = '';
  if (tempUnit === 'C') {
    code = 'dht.readTemperature()';  // Read temperature in Celsius
  } else {
    code = 'dht.readTemperature(true)';  // Read temperature in Fahrenheit
  }
  
  // Return the code for temperature reading
  return [code, Blockly.Arduino.ORDER_ATOMIC];
};
