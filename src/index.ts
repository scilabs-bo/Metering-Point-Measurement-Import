import { processAttachment } from "./preprocessing"
import { DBConnection } from './dbConnection';
import { AttachmentRetriever } from './attachmentRetriever';

//explicit configuration for connections // extracted from config.js
async function main() {
  const retriever = new AttachmentRetriever();
  await retriever.connect();
  const attachments = await retriever.retrieve();

  const con = new DBConnection();
  await con.connect();
  for (const attachment of attachments) {
    await processAttachment(con, attachment);
  }
  await con.end();

  await retriever.markAsRead();
}

void main()
