const { Rolechat, rolechatPulseTypes } = require("./Rolechat/rolechat");

function initialize(numOfSessions) {
	const sessions = [];
	for (let i = 0; i < numOfSessions; ++i) {
		sessions.push(new Rolechat());
	}
	return sessions;
}

function prepareSessions(sessions) {
	sessions.forEach((s, i) => {
		s.prepare();
		s.on('ready', () => {
			console.log(`> Session ${++i} is ready !`);
		});
		s.on('pulse', pulse => console.log(pulse));
	});
}

const sessions = initialize(3);
prepareSessions(sessions);
