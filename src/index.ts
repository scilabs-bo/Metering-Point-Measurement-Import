import config from './config';
import imaps, { ImapSimple, Message, ImapSimpleOptions } from 'imap-simple';
import Connection from 'imap';
import { ImapAttachment } from './types';
import fs from 'fs';
import { transformDate } from "./preprocessing"

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
  try{
    fs.mkdirSync('csv');
    console.log("Created csv folder.")
  } catch(e){
    console.log("Skipping: Folder csv already exists.");
  }

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

  try{
    fs.mkdirSync('csv_out');
    console.log("Created csv_out folder.")
  } catch(e){
    console.log("Skipping: Folder csv_out already exists.");
  }
  for (let attachment of attachments) {
    transformDate(attachment);
  }

  connection.end();
  console.log("Closing connection.");
}

main();