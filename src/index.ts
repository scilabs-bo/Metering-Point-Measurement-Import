import { AttachmentProcessor } from './attachmentProcessor';
import { DBConnection } from './dbConnection';
import { AttachmentRetriever } from './attachmentRetriever';

async function main() {
  const con = new DBConnection();
  const retriever = new AttachmentRetriever();
  const processor = new AttachmentProcessor(con);

  await retriever.connect();
  const attachments = await retriever.retrieve();
  retriever.end();

  try {
    await con.connect();
    for (const attachment of attachments) {
      await processor.saveAttachmentInDB(attachment);
    }
    await con.end();
  } catch (e) {
    console.error('Unable to connect to database:');
    console.error(e);
  }
}

void main();
