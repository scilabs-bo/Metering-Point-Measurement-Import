console.log('Starting script...');

import config from './config.js';
const fs = require('fs')
const base64 = require('base64-stream')
const {Base64Decode} = require("base64-stream");
import * as dataForge from 'data-forge';
import 'data-forge-fs';
const {DateTime} = require('luxon');
const iconv = require('iconv-lite');

var Imap = require('imap'), inspect = require('util').inspect;

 
//explicit configuration for connections // extracted from config.js
var imap = new Imap({
    user: config.get('user'),
    password: config.get('password'),
    host: config.get('host'),
    port: config.get('port'),
    tls: true
});

//setting params to upperString
function toUpper(thing: any) { return thing && thing.toUpperCase ? thing.toUpperCase() : thing;}

//function for finding attachments
function findAttachmentParts(struct: any, attachments: any) {
  attachments = attachments ||  [];

  for (var i = 0, len = struct.length, r; i < len; ++i) {
    if (Array.isArray(struct[i])) {
      findAttachmentParts(struct[i], attachments);
    } else {
      if (struct[i].disposition && ['INLINE', 'ATTACHMENT'].indexOf(toUpper(struct[i].disposition.type)) > -1) {
        attachments.push(struct[i]);
      }
    }
  }
  return attachments;
}

//function containing stream to export all attachments to a new file
function buildAttMessageFunction(attachment: any) {
  var filename = attachment.params.name;
  var encoding = attachment.encoding;

  return function (msg: any, seqno: any) {
    var prefix = '(#' + seqno + ') ';
    msg.on('body', function(stream: any, info: any) {
      //Create a write stream so that we can stream the attachment to file;
      console.log(prefix + 'Streaming this attachment to file', filename, info);
      var pathfile = process.cwd() + '/src/csv/' + filename; 
      var writeStream = fs.createWriteStream(pathfile);
      writeStream.on('finish', function() {
        console.log(prefix + 'Done writing to file %s', filename);
      });

      //decoding during stream
      if (toUpper(encoding) === 'BASE64') {
        //the stream is base64 encoded, so here the stream is decoded on the fly and piped to the write stream (file)
        stream.pipe(new Base64Decode()).pipe(writeStream);
      } else  {
        //here we have none or some other decoding streamed directly to the file which renders it useless probably
        stream.pipe(writeStream);
      }
    });
    msg.once('end', function() {
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
  
  const readline = require('linebyline'),
    rl = readline('src/csv/51333017254.CSV', {
      retainBuffer: true
    });

  rl.on('line', (data: any) => {
    var line = iconv.decode(data, 'utf16');

    line = line.replace(/\0/g, '');  // remove null characters
    line = line.trim();

    if (line.startsWith('Datum')) {
      headerPart = false;
    }
    if (line!=null && line!=='') {  // line not empty
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

  setTimeout( () => {

    const csvData = dataForge.fromCSV(csvlines);

    var hms:string[];
    const csvTransf = csvData.select(row => {
      var dateobj = DateTime.fromFormat(row.Datum, 'dd.MM.yyyy');
      hms = row.Uhrzeit.split(':');

      return {
        Datum: dateobj.set({hour: hms[0], minute: hms[1], second: hms[2]}).toISO(),
        'Wirk Verbrauch in KWH': row['Wirk Verbrauch in KWH'],
        'Blind Verbrauch in kvarh': row['Blind Verbrauch in kvarh'],
        'Wirk Einspeisung in KWH': row['Wirk Einspeisung in KWH'],
        'Blind Einspeisung in kvarh': row['Blind Einspeisung in kvarh'],
      }
    })

    const csvOutputString = csvTransf.toCSV();
    fs.writeFileSync('MailTestOut.csv', headerlines + csvOutputString);

  }, 1000);
}

imap.once('ready', function() {
  imap.openBox('INBOX', true, function(err: Error, box: any) {
    if (err) throw err;
    var f = imap.seq.fetch(box.messages.total + ':*', { //further modifications required to extract ALL emails and attachments from one day
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
      struct: true
    });
    f.on('message', function (msg: any, seqno: Number) {
      console.log('Message #%d', seqno);
      var prefix = '(#' + seqno + ') ';
      msg.on('body', function(stream: any, info: any) {
        var buffer = '';
        stream.on('data', function(chunk: any) {
          buffer += chunk.toString('utf8');
        });
        stream.once('end', function() {
          console.log(prefix + 'Parsed header: %s', Imap.parseHeader(buffer));
        });
      });
      msg.once('attributes', function(attrs: any) {
        var attachments = findAttachmentParts(attrs.struct, null); 
        console.log(prefix + 'Has attachments: %d', attachments.length);
        for (var i = 1, len=attachments.length ; i < len; ++i) { //var set to 1, so that first attachment (which is the mail content) is skipped
          var attachment = attachments[i];
          console.log(prefix + 'Fetching attachment %s', attachment.params.name);
          var f = imap.fetch(attrs.uid , { 
            bodies: [attachment.partID],
            struct: true
          });

          //function to process attachment message
          f.on('message', buildAttMessageFunction(attachment));
        }
      });
      msg.once('end', function() {
        console.log(prefix + 'Finished email');
      });
    });
    f.once('error', function(err: Error) {
      console.log('Fetch error: ' + err);
    });
    f.once('end', function() {
      console.log('Done fetching all messages!');
      imap.end();
    });
  });
});

imap.once('error', function(err: Error) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
});

imap.connect();

transformDate();