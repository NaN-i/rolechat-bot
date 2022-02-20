"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const WebSocket = require("ws");
const events = require("events");
function createRolechatMsg(index, options) {
    return [index, [options]];
}
var rolechatPulseTypes;
(function (rolechatPulseTypes) {
    rolechatPulseTypes[rolechatPulseTypes["NEW_PARTNER"] = 1] = "NEW_PARTNER";
    rolechatPulseTypes[rolechatPulseTypes["IS_MATCHING"] = 2] = "IS_MATCHING";
    rolechatPulseTypes[rolechatPulseTypes["PARTNER_DISCONNECTED"] = 3] = "PARTNER_DISCONNECTED";
    rolechatPulseTypes[rolechatPulseTypes["PARTNER_TYPING"] = 4] = "PARTNER_TYPING";
    rolechatPulseTypes[rolechatPulseTypes["PARTNER_MESSAGE"] = 5] = "PARTNER_MESSAGE";
    rolechatPulseTypes[rolechatPulseTypes["GOT_CAPTCHA"] = 6] = "GOT_CAPTCHA";
})(rolechatPulseTypes || (rolechatPulseTypes = {}));
class Rolechat extends events.EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.matched = false;
        this.mid = 0;
        this.sendid = 0;
        this.id = undefined;
        this.wss = undefined;
        this.name = 'Rolechat User';
        this.partnerName = undefined;
        this.pollTimer = undefined;
        this.captcha = false;
        this.stop = false;
    }
    prepare() {
        this.wss = new WebSocket('wss://rolechat.org/api/ws', {
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
            }
        });
        this.wss.on('error', (err) => this.emit(err));
        this.wss.on('open', () => {
            this.connect();
        });
        this.wss.on('message', (msg) => {
            const event = JSON.parse(msg.toString());
            this.handleEvents(event);
        });
        this.wss.on('close', () => {
            this.emit('close');
            this.wss = undefined;
        });
    }
    setName(name) {
        this.name = name;
    }
    findPartner() {
        if (!this.id) {
            throw 'Not ready...';
        }
        ;
        if (this.isMatched())
            return;
        if (this.stop)
            this.stop = false;
        return this.send(createRolechatMsg(this.sendid, {
            cmd: 'new',
            mid: this.mid,
            sendid: this.sendid,
            id: this.id,
            data: {
                name: this.name,
                ex: [],
                ltt: 0,
                mob: false,
                pr: false,
                starter: false,
                sv: [0],
                tags: [],
                ad: true
            }
        }));
    }
    sendMsg(msg) {
        return this.send(createRolechatMsg(this.sendid, {
            cmd: 'send',
            message: msg,
            id: this.id,
            mid: this.mid,
            sendid: this.sendid
        }));
        this.sendPoll();
    }
    disconnect() {
        if (!this.isMatched())
            return;
        this.matched = false;
        this.partnerName = undefined;
        return this.send(createRolechatMsg(this.sendid, {
            cmd: 'end',
            id: this.id,
            mid: this.mid,
            sendid: this.sendid
        }));
    }
    kill() {
        this.stop = true;
        this.captcha = false;
        if (this.isMatched()) {
            this.disconnect();
        }
    }
    isMatched() {
        return this.matched;
    }
    connect() {
        const msg = createRolechatMsg(this.sendid, {
            cmd: 'connect',
            mid: this.mid,
            sendid: this.sendid
        });
        this.send(msg);
    }
    handleEvents(events) {
        if (!this.stop && typeof events == 'object') {
            if (!events.length)
                return;
            this.mid = events[events.length - 1][0] + 1;
            events.forEach((event) => {
                const serverMsg = event[1];
                switch (serverMsg.cmd) {
                    case 'create':
                        this.id = serverMsg.id;
                        if (!this.captcha)
                            this.emit('ready');
                        else
                            this.findPartner();
                        break;
                    case 'matching':
                        if (this.captcha)
                            this.captcha = false;
                        this.sendPulse({ type: rolechatPulseTypes.IS_MATCHING });
                        this.sendPoll();
                        break;
                    case 'convst':
                        if (this.captcha)
                            this.captcha = false;
                        this.matched = true;
                        this.partnerName = serverMsg.p;
                        this.sendPulse({
                            type: rolechatPulseTypes.NEW_PARTNER,
                            data: {
                                partnerName: serverMsg.p
                            }
                        });
                        this.sendPoll();
                        break;
                    case 'convend':
                        this.matched = false;
                        this.partnerName = undefined;
                        this.sendPulse({ type: rolechatPulseTypes.PARTNER_DISCONNECTED });
                        this.sendPoll();
                        break;
                    case 'type':
                        this.sendPulse({ type: rolechatPulseTypes.PARTNER_TYPING });
                        this.sendPoll();
                        break;
                    case 'message':
                        this.sendPulse({
                            type: rolechatPulseTypes.PARTNER_MESSAGE,
                            data: {
                                msg: serverMsg.data
                            }
                        });
                        this.sendPoll();
                        break;
                    case 'captcha':
                        if (!this.captcha) {
                            this.captcha = true;
                            this.sendPulse({ type: rolechatPulseTypes.GOT_CAPTCHA });
                        }
                        this.connect();
                        break;
                    default:
                        this.sendPoll();
                        break;
                }
            });
        }
        else if (typeof event == 'number') {
            const thisEventIndex = this.queue.indexOf(event);
            if (thisEventIndex !== -1) {
                this.queue.splice(thisEventIndex);
            }
        }
    }
    send(msg) {
        return new Promise((resolve, reject) => {
            var _a;
            (_a = this.wss) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify(msg), err => {
                if (err)
                    return reject(err);
                resolve();
            });
            this.sendid++;
        });
    }
    sendPoll() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.id && this.wss) {
                this.queue.push(this.sendid);
                this.send(createRolechatMsg(this.sendid, {
                    id: this.id,
                    mid: this.mid,
                    sendid: this.sendid,
                    cmd: 'poll'
                }));
                clearInterval(this.pollTimer);
                this.pollTimer = setTimeout(() => { this.sendPoll(); }, 30000);
            }
            else {
                clearInterval(this.pollTimer);
            }
        });
    }
    sendPulse(msg) {
        this.emit('pulse', msg);
    }
}
module.exports = { Rolechat, rolechatPulseTypes };
