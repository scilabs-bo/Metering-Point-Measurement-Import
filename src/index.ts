import { AttachmentProcessor } from "./attachmentProcessor"
import { DBConnection } from './dbConnection';
import { AttachmentRetriever } from './attachmentRetriever';
import { runInThisContext } from "vm";

async function main() {
  const con = new DBConnection();
  const retriever = new AttachmentRetriever();
  const processor = new AttachmentProcessor(con);

  await retriever.connect();
  const attachments = await retriever.retrieve();
  retriever.end()

  await con.connect().then(function() {
    
    for (const attachment of attachments) {
      processor.saveAttachmentInDB(attachment);
    }
    console.log("Connection to DB established.")
  }).then(function(){
    retriever.markAsRead()
  }).catch(function(){
    console.log("Connection to DB failed.")
  });

}

void main()
