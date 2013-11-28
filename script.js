Controller = { 
	Volume: 20,
	EQHi: 21,
	EQMid: 22,
	EQLow: 23,
	Play: 24,
	RateUp: 25,
	RateDown: 26,
	Cue: 27
};

var parts = msg.address.match(/(\d)\/([^\d]+)([\d]+)/);

address = {
	channel:	parseInt(parts[1]),
	controller:	parts[2],
	number:		parseInt(parts[3])
}

if (address.controller == 'fader' && [7,9].indexOf(address.number) != -1) {
	output.sendMessage([
		midi.continuousController((address.number == 7 ? 1 : 2)),
		Controller.Volume,
		midi.floatTo7bit(msg.args[0].value)
	]);
}
else if ((address.controller == 'rotary' && [2,5,6,7,8,9].indexOf(address.number) != -1)) {
	var eq;
	var channel = address.number <= 6 ? 1 : 2;
	
	switch(address.number) {
		case 2: eq = Controller.EQHi; break;
		case 5: eq = Controller.EQMid; break;
		case 6: eq = Controller.EQLow; break;
		case 7: eq = Controller.EQHi;  break;
		case 8: eq = Controller.EQMid; break;
		case 9: eq = Controller.EQLow; break;
	}
	
	output.sendMessage([
		midi.continuousController(channel),
		eq,
		midi.floatTo7bit(msg.args[0].value)
	]);
}
else if (address.controller == 'fader' && [5,11].indexOf(address.number) != -1) {
	var pitch = midi.floatToPitch(msg.args[0].value);
	
	output.sendMessage([
		midi.pitchBend((address.number == 5 ? 1 : 2)),
		pitch.lsb,
		pitch.msb
	]);
}
else if (address.controller == 'toggle' && [16,28].indexOf(address.number) != -1) {
	output.sendMessage([
		msg.args[0].value ? 
			midi.noteOff((address.number == 16 ? 1 : 2)) :
			midi.noteOn((address.number == 16 ? 1 : 2)),
		Controller.Play,
		127
	]);
}
else if (address.controller == 'push' && [5,7,10,9].indexOf(address.number) != -1) {
	var channel	= [5,7].indexOf(address.number) != -1 ? 1 : 2;
	var direction	= [5,10].indexOf(address.number) != -1 ? 'Up' : 'Down';
	
	output.sendMessage([
		msg.args[0].value ?
			midi.noteOff(channel) :
			midi.noteOn(channel),
		Controller['Rate' + direction],
		127
	]);
}
else if (address.controller == 'push' && [8,11].indexOf(address.number) != -1) {
	output.sendMessage([
		msg.args[0].value ?
			midi.noteOff((address.number == 8 ? 1 : 2)) :
			midi.noteOn((address.number == 8 ? 1 : 2)),
		Controller.Cue,
		127
	]);
}
