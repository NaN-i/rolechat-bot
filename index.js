const { Rolechat, rolechatPulseTypes } = require("./Rolechat/rolechat");
const rolechatSession = new Rolechat();
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function wait(interval) { return new Promise(resolve => setTimeout(resolve, interval)); }

function sendMsgToPartner(session, msg) {
    return session.sendMsg(msg)
                  .then(() => console.log(`> ${session.name}: ${msg}`));
}

rolechatSession.on('ready', () => {
    rolechatSession.setName('A passing explorer');
    rolechatSession.findPartner();
});

rolechatSession.on('pulse', pulse => {
    switch (pulse.type) {
        case rolechatPulseTypes.NEW_PARTNER:
            console.log(`> New partner has connected: ${pulse.data.partnerName}`);
            sendMsgToPartner(rolechatSession, 'Hey there!').catch(err => console.log(err));
            break;

        case rolechatPulseTypes.IS_MATCHING:
            console.log('> Still looking for a partner... This could take a while!');
            break;

        case rolechatPulseTypes.PARTNER_DISCONNECTED:
            console.log('> Partner has left!');
            rolechatSession.findPartner();
            break;

        case rolechatPulseTypes.PARTNER_TYPING:
            console.log('> Partner is typing...');
            break;

        case rolechatPulseTypes.PARTNER_MESSAGE:
            console.log(`> Partner: ${pulse.data.msg}`);
            break;
        
        case rolechatPulseTypes.GOT_CAPTCHA:
            console.log('> CAPTCHA! Good luck...');
            console.log('> Go solve it! I\'m waiting for you!');
            break;
    }
});

rl.on('line', async(line) => {
    if (line.startsWith('/')) {
        const args = line.slice(1).trim().split(' ');
        const cmd = args.shift().toLowerCase();

        switch (cmd) {
            case 'newpartner':
            case 'n':
                if (rolechatSession.isMatched()) {
                    await rolechatSession.disconnect();
                    await wait(2000);
                }
                rolechatSession.findPartner();
                console.log('> Finding a partner...');
                break;

            case 'disconnect':
            case 'd':
                if (rolechatSession.isMatched()) {
                    await rolechatSession.disconnect();
                    console.log('> Disconnected from partner.');
                }
                else {
                    console.log('> You are not connected to any partner...');
                }
                break;

            case 'stop':
            case 'kill':
                console.log('> Stopping!');
                rolechatSession.kill();
                break;
        }
    }
    else {
        if (rolechatSession.isMatched()) {
            sendMsgToPartner(rolechatSession, line).catch(err => console.log(err));
        }
        else {
            console.log('> You are not matched with a partner yet. :(');
        }
    }
});

rolechatSession.prepare();
