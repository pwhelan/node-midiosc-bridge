if (msg.type == 'midi') {
	console.log('MIDI Message:');
	console.log(msg);
	
	var cmd = "";
	var args = [];
	
	for (var i = 0; i < msg.parameters.length; i++) {
		args.push({ type: 'float', value: msg.parameters[i]});
	}
	
	output.sendOSC(
		'/' + msg.channel + '/' + msg.commandname, 
		args
	);
}
else if (msg.type == 'osc') {
	console.log('OSC Message:');
	console.log(msg);
	
	output.sendOSC(msg.address, msg.args);
}
