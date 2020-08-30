"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
console.log('Starting script...');
var config_js_1 = __importDefault(require("./config.js"));
var Imap = require('imap'), inspect = require('util').inspect;
//explicit configuration for connections // must be extracted by use of 'npm convict' later
var imap = new Imap({
    user: config_js_1.default.get('user'),
    password: config_js_1.default.get('password'),
    host: config_js_1.default.get('host'),
    port: config_js_1.default.get('port'),
    tls: true
});
console.log('User: ' + imap.user, 'Password: ' + imap.password, 'Host: ' + imap.host, 'Port: ' + imap.port);
//Opening the inbox
function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
}
imap.once('ready', function () {
    openInbox(function (err, box) {
        if (err)
            throw err;
        var f = imap.seq.fetch('1', {
            bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
            struct: true,
            markSeen: false
        });
        f.on('message', function (msg, seqno) {
            console.log('Message #%d', seqno);
            var prefix = '(#' + seqno + ') ';
            msg.on('body', function (stream, info) {
                var buffer = '';
                stream.on('data', function (chunk) {
                    buffer += chunk.toString('utf8');
                });
                stream.once('end', function () {
                    console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
                });
            });
            msg.once('attributes', function (attrs) {
                console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
            });
            msg.once('end', function () {
                console.log(prefix + 'Finished');
            });
        });
        f.once('error', function (err) {
            console.log('Fetch error: ' + err);
        });
        f.once('end', function () {
            console.log('Done fetching the first e-mail. The connection will be closed now.');
            imap.end();
        });
    });
});
imap.once('error', function (err) {
    console.log(err);
});
imap.once('end', function () {
    console.log('Connection ended');
});
imap.connect();
