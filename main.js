var defaults = {
	'osc_port':	8000,
	'midi_port':	"MIDIOSC Router",
};

var opt = require('node-getopt').create([
	['l',	'listen=ARG',	'Incoming UDP port for OSC connections, default: ' + defaults.osc_port],
	['m',	'midi=ARG',	'Virtual MIDI port name, default: ' + defaults.midi_port],
	['h' ,	'help',		'display this help']
])
.bindHelp()
.setHelp(
	"Usage: " + process.argv.slice(0,2).join(' ') + " [OPTIONS] <scripts> \n" +
	"Node MIDI to OSC Router.\n" + 
	"\n" + 
	"[[OPTIONS]]\n" +
	"\n" +
	"Repository: http://github.com/pwhelan/node-midiosc-bridge\n"
);

var args = opt.parseSystem(); // parse command line


if (args.argv.length <= 0) {
	opt.showHelp();
	process.exit(1);
}

var midi = require('midi'),
	udp = require('dgram'),
	osc = require('osc-min'),
	fs = require('fs'),
	vm = require('vm'),
	mdns = require('mdns'),
	events = require('events');


var output = new midi.output();
output.openVirtualPort(
	args.options.midi ?
		args.options.midi: 
		defaults.midi_port 
);

var input = new midi.input();
input.openVirtualPort(
	args.options.midi ?
		args.options.midi: 
		defaults.midi_port 
);

input.on('message', function(deltaTime, message) {
	RouterScript.recvMIDI(message);
});

var socket = udp.createSocket('udp4');
socket.on("message", function(buffer, remote) {
	try {
		var msg = osc.fromBuffer(buffer);
		var fs = require('fs');
		
		
		if (msg.address == '/ping') {
			RouterScript.addclient({address: remote.address, port: 9000});
		}
		RouterScript.recvOSC(msg);
	}
	catch(err) {
		console.error('Invalid OSC packet');
		console.error(err);
	}
});

socket.bind(	
	args.options.listen ?
		args.options.listen: 
		defaults.osc_port 
);

function Bridge()
{
	events.EventEmitter.call(this);
}

Bridge.super_ = events.EventEmitter;
Bridge.prototype = Object.create(events.EventEmitter.prototype, {
	constructor: {
		value: Bridge,
		enumerable: false
	}
});

function LoadScript(name)
{
	var _name = name;
	var _path = __dirname + '/' + _name;
	var _script;
	var self = this;
	var _clients = [];
	var _bridge;
	var _context;
	var _isSimple = false;
	
	var _output = {
		midi: output,
		//messageSent: false,
		socket: socket,
		sendMIDI: function(midiMessage) {
			//_output.messageSent = true;
			_output.midi.sendMessage(midiMessage);
		},
		sendOSC: function(address, args) {
			var buf;
			buf = osc.toBuffer({
				oscType: 'message',
				address: address,
				args: args
			});
			
			for (var i = 0; i < _clients.length; i++) {
				_output.socket.send(buf, 0, buf.length, 9000, _clients[i]);
			}
		}
	};
	
	var _midi = {
		note: function(on, channel) {
			return (on ? 0x90 : 0x80) | ((channel-1) & 0x0f);
		},
		noteOn: function(channel) {
			return 0x90 | ((channel-1) & 0x0f);
		},
		noteOff: function(channel) {
			return 0x80 | ((channel-1) & 0x0f);
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
		},
		commandName: function(command) {
			switch(msg.command) {
				case 0x80: return "noteoff";
				case 0x90: return "noteon";
				case 0xa0: return "aftertouch";
				case 0xb0: return "continuouscontroller";
				case 0xc0: return "patchchange";
				case 0xd0: return "channelpressure";
				case 0xe0: return "pitchbend";
				case 0xf0: return "systemexclusive";
			}	
		}
	};
	
	var _run = function() 
	{
		try {
			_bridge = new Bridge();
			_script.runInNewContext({
				output: _output, 
				midi: _midi,
				bridge: _bridge,
				console: console
			});
		}
		catch(err) {
			console.error('Routing error: ' + err);
		}
	};
	
	this.recvOSC = function(msg)
	{
		_bridge.emit('osc', msg);
		/*
			_output.messageSent = false;
			if (!_output.messageSent) {
				console.log('Unknown OSC packet');
				console.log(msg);
			}
		*/
	};
	
	this.recvMIDI = function(msg)
	{
		var cmd = msg[0] & 0xf0;
		var chan = (msg[0] & 0x0f) + 1;
		var _msg = {
			command:	cmd,
			channel:	chan,
			parameters:	msg.slice(1)
		};
		
		_msg.commandname = _midi.commandName(_msg.command);
		
		
		switch(_msg.command) {
			case 0x90:
			case 0x80:
				_msg.note = msg[1];
				_msg.velocity = msg[2];
				break;
			case 0xa0:
				_msg.note = msg[1];
				_msg.touch = msg[2];
				break;
			case 0xb0:
				_msg.controller = msg[1];
				_msg.value = msg[2];
				break;
			case 0xc0:
				_msg.patch = msg[1];
				break;
			case 0xd0:
				_msg.pressure = msg[1];
				break;
			case 0xe0:
				_msg.lsb = msg[1];
				_msg.msb = msg[2];
				// TODO: get this working...
				//_midi.pitch = (msg[2] << 7 | msg[1]);
				break;
			case 0xf0:
				// TODO: Sysex/MMC
				break;
		}
		
		try {
			_bridge.emit('midi', _msg);
		}
		catch (err) {
			console.error(err);
		}
	};
	
	this.sendOSC = function(address, args)
	{
		try {
			_output.sendOSC(address, args);
		}
		catch (err) {
			console.error(err);
		}
	};
	
	this.load = function()
	{
		console.log('Loading script: ' + _name);
		try {
			_script = vm.createScript(fs.readFileSync(_path, 'utf-8'), _name);
			_run();
		}
		catch(err) {
			console.error('Error loading router script');
			console.error(err);
		}
	};
	
	this.addclient = function(remote)
	{
		if (_clients.indexOf(remote.address) == -1) {
			_clients.push(remote.address);
		}
	};
	
	this.load();
	
	fs.watchFile(_path, function (event, filename) {
		self.load();
	});
}

var RouterScript = new LoadScript(args.argv[0]);


var ad = mdns.createAdvertisement(
	mdns.udp('osc'), 
	args.options.listen ?
		args.options.listen: 
		defaults.osc_port 
);

ad.start();

process.on('SIGINT', function () {
	socket.close();
	output.closePort();
	
	process.exit();
});
