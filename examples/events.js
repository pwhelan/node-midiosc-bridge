bridge.
	on('osc', function(msg) {
		console.log('OSC Message:');
		console.log(msg);
	})
	.on('midi', function(msg) {
		console.log('MIDI Message:');
		console.log(msg);
	});
