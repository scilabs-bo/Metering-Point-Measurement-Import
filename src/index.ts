import config from './config';
import imaps, { ImapSimple, Message, ImapSimpleOptions } from 'imap-simple';
import Connection from 'imap';
import { ImapAttachment, ImapAttachmentPart, isImapAttachmentPart } from './types';
import fs from 'fs';
import { processAttachment } from "./preprocessing"

async function searchForUnseenMails(connection: ImapSimple): Promise<Message[]> {
  await connection.openBox('INBOX');

  // Last 24 hours
  const delay = 24 * 3600 * 1000;
  const yesterday = new Date();
  yesterday.setTime(Date.now() - delay);

  const searchCriteria = ['UNSEEN', ['SINCE', yesterday.toISOString()]];
  const fetchOptions: Connection.FetchOptions = { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'], struct: true };
  return await connection.search(searchCriteria, fetchOptions);
}

async function getAttachments(connection: ImapSimple, messages: Message[]): Promise<ImapAttachment[]> {
  let attachments: Promise<ImapAttachment>[] = [];

  for (const message of messages) {
    const parts = imaps.getParts(message.attributes.struct || []);
    const newAttachments = parts.filter(isImapAttachmentPart)
      .map(async (part: ImapAttachmentPart): Promise<ImapAttachment> => {
        const partData = await connection.getPartData(message, part) as Buffer;
        return {
          filename: part.disposition.params.filename,
          data: partData,
        };
      });
    attachments = attachments.concat(newAttachments);
  }

  return Promise.all(attachments);
}

function storeCSV(attachments: ImapAttachment[]) {
  try {
    fs.mkdirSync('csv');
    console.log("Created csv folder.")
  } catch (e) {
    console.log("Skipping: Folder csv already exists.");
  }

  for (const attachment of attachments) {
    fs.writeFileSync('csv/' + attachment.filename, attachment.data);
  }
}

//explicit configuration for connections // extracted from config.js
async function main() {
  const imapOptions: ImapSimpleOptions = {
    imap: config.get('imap')
  };

  const connection = await imaps.connect(imapOptions);
  const mails = await searchForUnseenMails(connection);
  const attachments = await getAttachments(connection, mails);

  //TODO: Remove in production
  storeCSV(attachments);

  try {
    fs.mkdirSync('csv_out');
    console.log("Created csv_out folder.")
  } catch (e) {
    console.log("Skipping: Folder csv_out already exists.");
  }
  for (const attachment of attachments) {
    processAttachment(attachment);
  }

  connection.end();
  console.log("Closing connection.");
}

void main();