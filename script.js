Controller = { 
	Volume: 20,
	EQ: {
		High: 21,
		Mid: 22,
		Low: 23
	},
	Play: 24,
	Bwd: 25,
	Fwd: 26,
	Cue: 27,
	Pfl: 28
};

String.prototype.capitalize = function() 
{
	return this.charAt(0).toUpperCase() + this.slice(1);
}

bridge.on('osc', function(msg) {
	var parts = msg.address.split('/');
	addr = {
		chan:		parseInt(parts[1]),
		ctlr:		parts[2],
		params:		parts.slice(3), 
	};
	
	if (addr.ctlr == 'eq') {
		output.sendMIDI([
			midi.cc(addr.chan),
			Controller.EQ[addr.params[0].capitalize()],
			midi.floatTo7bit(msg.args[0].value)
		]);
	}
	if (addr.ctlr == 'kill') {
		output.sendMIDI([
			midi.note(msg.args[0].value, addr.chan),
			Controller.EQ[addr.params[0].capitalize()],
			midi.floatTo7bit(msg.args[0].value)
		]);
	}
	else if (['bwd', 'fwd', 'cue', 'play', 'pfl'].indexOf(addr.ctlr) != -1) {
		output.sendMIDI([
			midi.note(msg.args[0].value, addr.chan),
			Controller[addr.ctlr.capitalize()],
			127
		]);
	}
	else if (addr.ctlr == 'pitch') {
		var pitch = midi.floatToPitch(msg.args[0].value);
		
		output.sendMIDI([
			midi.pitchBend(addr.chan),
			pitch.lsb,
			pitch.msb
		]);
	}
	else if (addr.ctlr == 'volume') {
		output.sendMIDI([
			midi.cc(addr.chan),
			Controller.Volume,
			midi.floatTo7bit(msg.args[0].value)
		]);
	}
	
	// Keep the different pages in sync
	if (['pfl', 'volume'].indexOf(addr.ctlr) != -1) {
		output.sendOSC(msg.address, msg.args);
	}
	
	//
	if (addr.ctlr == null && [1,2].indexOf(addr.chan) != -1) {
		output.sendMIDI([
			midi.patchChange(1),
			addr.chan
		]);
	}
});

bridge.on('midi', function(msg) {
	if (msg.note == Controller.Play) {
		output.sendOSC('/' + msg.channel + '/play', [{
			type:	'float',
			value:	(msg.command == 0x90 ? 1.0 : 0.0)
		}]);
	}
});
