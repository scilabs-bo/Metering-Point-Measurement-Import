console.log('Starting script...');

import config from './config.js';
var Imap = require('imap'), inspect = require('util').inspect;

 
//explicit configuration for connections // extracted from config.js
var imap = new Imap({
    user: config.get('user'),
    password: config.get('password'),
    host: config.get('host'),
    port: config.get('port'),
    tls: true
});

//Opening the inbox
function openInbox(cb: any) {
    imap.openBox('INBOX', true, cb);
  }
   
  imap.once('ready', function() {
    openInbox(function(err: Error, box: any) {
      if (err) throw err;
      var f = imap.seq.fetch('1', { //needs to be adjusted, so that the latest email will be extracted
        bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
        struct: true,
        markSeen: false
      });
      f.on('message', function(msg: any, seqno: any) {
        console.log('Message #%d', seqno);
        var prefix = '(#' + seqno + ') ';
        msg.on('body', function(stream: any, info: any) {
          var buffer = '';
          stream.on('data', function(chunk: any) {
            buffer += chunk.toString('utf8');
          });
          stream.once('end', function() {
            console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
          });
        });
        msg.once('attributes', function(attrs: any) {
          console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
        });
        msg.once('end', function() {
          console.log(prefix + 'Finished');
        });
      });
      f.once('error', function(err: Error) {
        console.log('Fetch error: ' + err);
      });
      f.once('end', function() {
        console.log('Done fetching the first e-mail. The connection will be closed now.');
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
