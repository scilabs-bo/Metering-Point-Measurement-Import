console.log('Starting script...');

import config from './config';
import 'data-forge-fs';
import imaps, { ImapSimple, Message, ImapSimpleOptions } from 'imap-simple';
import Connection from 'imap';
import { ImapAttachment } from './types';
import fs from 'fs';

async function searchForUnseenMails(connection: ImapSimple): Promise<Message[]> {
  await connection.openBox('INBOX');

  // Last 24 hours
  let delay = 24 * 3600 * 1000;
  let yesterday = new Date();
  yesterday.setTime(Date.now() - delay);

  let searchCriteria = ['UNSEEN', ['SINCE', yesterday.toISOString()]];
  let fetchOptions: Connection.FetchOptions = { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'], struct: true };
  return await connection.search(searchCriteria, fetchOptions);
}

async function getAttachments(connection: ImapSimple, messages: Message[]): Promise<ImapAttachment[]> {
  let attachments: Promise<ImapAttachment>[] = [];

  for (let message of messages) {
    let parts = imaps.getParts(message.attributes.struct || []);
    let newAttachments = parts.filter((part: any): any => {
      return part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT'
    }).map(async (part: any): Promise<ImapAttachment> => {
      let partData = await connection.getPartData(message, part);
      return {
        filename: part.disposition.params.filename,
        data: partData,
      }
    });
    attachments = attachments.concat(newAttachments);
  }

  return Promise.all(attachments);
}

function storeCSV(attachments: ImapAttachment[]) {
  fs.mkdirSync('csv');
  for (let attachment of attachments) {
    fs.writeFileSync('csv/' + attachment.filename, attachment.data);
  };
}

//explicit configuration for connections // extracted from config.js
async function main() {
  let imapOptions: ImapSimpleOptions = {
    imap: config.get('imap')
  };

  const connection = await imaps.connect(imapOptions);
  let mails = await searchForUnseenMails(connection);
  let attachments = await getAttachments(connection, mails);

  //TODO: Remove in production
  storeCSV(attachments);
}

// function for transforming date and columns of csv data
// function transformDate(attachment: any) {
/*function transformDate() {

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
    if (line != null && line !== '') {  // line not empty
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

  setTimeout(() => {

    const csvData = dataForge.fromCSV(csvlines);

    var hms: string[];
    const csvTransf = csvData.select(row => {
      var dateobj = DateTime.fromFormat(row.Datum, 'dd.MM.yyyy');
      hms = row.Uhrzeit.split(':');

      return {
        Datum: dateobj.set({ hour: hms[0], minute: hms[1], second: hms[2] }).toISO(),
        'Wirk Verbrauch in KWH': row['Wirk Verbrauch in KWH'],
        'Blind Verbrauch in kvarh': row['Blind Verbrauch in kvarh'],
        'Wirk Einspeisung in KWH': row['Wirk Einspeisung in KWH'],
        'Blind Einspeisung in kvarh': row['Blind Einspeisung in kvarh'],
      }
    })

    const csvOutputString = csvTransf.toCSV();
    fs.writeFileSync('MailTestOut.csv', headerlines + csvOutputString);

  }, 1000);
}*/

main();