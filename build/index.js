"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
console.log('Starting script...');
var config_js_1 = __importDefault(require("./config.js"));
var fs = require('fs');
var base64 = require('base64-stream');
var Base64Decode = require("base64-stream").Base64Decode;
var dataForge = __importStar(require("data-forge"));
require("data-forge-fs");
var DateTime = require('luxon').DateTime;
var iconv = require('iconv-lite');
var Imap = require('imap'), inspect = require('util').inspect;
//explicit configuration for connections // extracted from config.js
var imap = new Imap({
    user: config_js_1.default.get('user'),
    password: config_js_1.default.get('password'),
    host: config_js_1.default.get('host'),
    port: config_js_1.default.get('port'),
    tls: true
});
//setting params to upperString
function toUpper(thing) { return thing && thing.toUpperCase ? thing.toUpperCase() : thing; }
//function for finding attachments
function findAttachmentParts(struct, attachments) {
    attachments = attachments || [];
    for (var i = 0, len = struct.length, r; i < len; ++i) {
        if (Array.isArray(struct[i])) {
            findAttachmentParts(struct[i], attachments);
        }
        else {
            if (struct[i].disposition && ['INLINE', 'ATTACHMENT'].indexOf(toUpper(struct[i].disposition.type)) > -1) {
                attachments.push(struct[i]);
            }
        }
    }
    return attachments;
}
//function containing stream to export all attachments to a new file
function buildAttMessageFunction(attachment) {
    var filename = attachment.params.name;
    var encoding = attachment.encoding;
    return function (msg, seqno) {
        var prefix = '(#' + seqno + ') ';
        msg.on('body', function (stream, info) {
            //Create a write stream so that we can stream the attachment to file;
            console.log(prefix + 'Streaming this attachment to file', filename, info);
            var pathfile = process.cwd() + '/src/csv/' + filename;
            var writeStream = fs.createWriteStream(pathfile);
            writeStream.on('finish', function () {
                console.log(prefix + 'Done writing to file %s', filename);
            });
            //decoding during stream
            if (toUpper(encoding) === 'BASE64') {
                //the stream is base64 encoded, so here the stream is decoded on the fly and piped to the write stream (file)
                stream.pipe(new Base64Decode()).pipe(writeStream);
            }
            else {
                //here we have none or some other decoding streamed directly to the file which renders it useless probably
                stream.pipe(writeStream);
            }
        });
        msg.once('end', function () {
            console.log(prefix + 'Finished attachment %s', filename);
        });
    };
}
// function for transforming date and columns of csv data
// function transformDate(attachment: any) {
function transformDate() {
    var headerlines = '';
    var csvlines = '';
    var headerPart = true;
    var readline = require('linebyline'), rl = readline('src/csv/51333017254.CSV', {
        retainBuffer: true
    });
    rl.on('line', function (data) {
        var line = iconv.decode(data, 'utf16');
        line = line.replace(/\0/g, ''); // remove null characters
        line = line.trim();
        if (line.startsWith('Datum')) {
            headerPart = false;
        }
        if (line != null && line !== '') { // line not empty
            if (headerPart == true) {
                headerlines = headerlines.concat(line, '\n');
            }
            else {
                if (line.includes('Wert ist ungültig') == false) {
                    csvlines = csvlines.concat(line, '\n');
                }
            }
        }
    });
    setTimeout(function () {
        var csvData = dataForge.fromCSV(csvlines);
        var hms;
        var csvTransf = csvData.select(function (row) {
            var dateobj = DateTime.fromFormat(row.Datum, 'dd.MM.yyyy');
            hms = row.Uhrzeit.split(':');
            return {
                Datum: dateobj.set({ hour: hms[0], minute: hms[1], second: hms[2] }).toISO(),
                'Wirk Verbrauch in KWH': row['Wirk Verbrauch in KWH'],
                'Blind Verbrauch in kvarh': row['Blind Verbrauch in kvarh'],
                'Wirk Einspeisung in KWH': row['Wirk Einspeisung in KWH'],
                'Blind Einspeisung in kvarh': row['Blind Einspeisung in kvarh'],
            };
        });
        var csvOutputString = csvTransf.toCSV();
        fs.writeFileSync('MailTestOut.csv', headerlines + csvOutputString);
    }, 1000);
}
imap.once('ready', function () {
    imap.openBox('INBOX', true, function (err, box) {
        if (err)
            throw err;
        var f = imap.seq.fetch(box.messages.total + ':*', {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
            struct: true
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
                    console.log(prefix + 'Parsed header: %s', Imap.parseHeader(buffer));
                });
            });
            msg.once('attributes', function (attrs) {
                var attachments = findAttachmentParts(attrs.struct, null);
                console.log(prefix + 'Has attachments: %d', attachments.length);
                for (var i = 1, len = attachments.length; i < len; ++i) { //var set to 1, so that first attachment (which is the mail content) is skipped
                    var attachment = attachments[i];
                    console.log(prefix + 'Fetching attachment %s', attachment.params.name);
                    var f = imap.fetch(attrs.uid, {
                        bodies: [attachment.partID],
                        struct: true
                    });
                    //function to process attachment message
                    f.on('message', buildAttMessageFunction(attachment));
                }
            });
            msg.once('end', function () {
                console.log(prefix + 'Finished email');
            });
        });
        f.once('error', function (err) {
            console.log('Fetch error: ' + err);
        });
        f.once('end', function () {
            console.log('Done fetching all messages!');
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
transformDate();
