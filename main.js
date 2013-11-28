var midi = require('midi'),
	udp = require('dgram'),
	osc = require('osc-min'),
	fs = require('fs'),
	vm = require('vm'),
	mdns = require('mdns');

var output = new midi.output();
output.openVirtualPort("MIDIOSC Router");


function LoadScript(name)
{
	var _name = name;
	var _path = __dirname + '/' + _name + '.js';
	var _script;
	var self = this;
	
	var _output = {
		midi: output,
		messageSent: false,
		sendMessage: function(midiMessage) {
			_output.messageSent = true;
			_output.midi.sendMessage(midiMessage);
		}
	};
	
	var _midi = {
		noteOn: function(channel) {
			return 0x80 | ((channel-1) & 0x0f);
		},
		noteOff: function(channel) {
			return 0x90 | ((channel-1) & 0x0f);
		},
		afterTouch: function(channel) {
			return 0xa0 | ((channel-1) & 0x0f);
		},
		continuousController: function(channel) {
			return 0xb0 | ((channel-1) & 0x0f);
		},
		cc: function(channel) {
			return 0xb0 | ((channel-1) & 0x0f);
		},
		patchChange: function(channel) {
			return 0xc0 | ((channel-1) & 0x0f);
		},
		channelPressure: function(channel) {
			return 0xd0 | ((channel-1) & 0x0f);
		},
		pitchBend: function(channel) {
			return 0xe0 | ((channel-1) & 0x0f);
		},
		systemExclusive: function(command) {
			return 0xf0 | (command & 0x0f);
		},
		floatTo7bit: function(value) {
			return (127.0 * value).toFixed(0);
		},
		floatToPitch: function(value) {
			var pitch = 0x3FFF * value;
			var lsb = (pitch & 0x7F);
			var msb = (pitch >> 7);
			
			return {lsb: lsb, msb: msb};
		}
	}
	
	this.run = function(msg) 
	{
		try {
			_output.messageSent = false;
			_script.runInNewContext({
				output: _output, 
				msg: msg,
				midi: _midi
			});
		}
		catch(err) {
			console.error('Routing error: ' + err);
		}
		if (!_output.messageSent) {
			console.log('Unknown OSC packet');
			console.log(msg);
		}
	}
	
	this.load = function()
	{
		console.log('Loading script: ' + _name);
		try {
			_script = vm.createScript(fs.readFileSync(_path, 'utf-8'), _name + '.js');
		}
		catch(err) {
			console.error('Error loading router script');
			console.error(err);
		}
	}
	
	this.load();
	
	fs.watchFile(_path, function (event, filename) {
		self.load();
	});
}

var RouterScript = new LoadScript('script');


var socket = udp.createSocket('udp4');
socket.on("message", function(buffer, remote) {
	try {
		var msg = osc.fromBuffer(buffer);
		var fs = require('fs');
		
		RouterScript.run(msg);
	}
	catch(err) {
		console.error('Invalid OSC packet');
		console.error(err);
	}
});

socket.bind(8000);

var ad = mdns.createAdvertisement(mdns.udp('osc'), 8000);
ad.start();

process.on('SIGINT', function () {
	socket.close();
	output.closePort();
	
	process.exit();
});
