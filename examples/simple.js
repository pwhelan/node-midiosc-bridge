if (msg.type == 'midi') {
	console.log('MIDI Message:');
	console.log(msg);
	
	var param;
	var addressbits = [
		msg.channel,
		msg.commandname
	];
	
	if (msg.parameters.length == 2) {
		addressbits.push(msg.parameters[0]);
		param = msg.parameters[1];
	}
	else {
		param = msg.parameters[0];
	}
	
	output.sendOSC(
		'/' + addressbits.join('/')
		[{ type: 'float', value: param }]
	);
}
else if (msg.type == 'osc') {
	console.log('OSC Message:');
	console.log(msg);
	
	var parts = msg.address.split('/');
	
	output.sendMIDI([
		midi.parseCommandName(parts[2]) & parts[1],
		parts[3],
		msg.args[0].value
	]);
}
