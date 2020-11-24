import { AttachmentProcessor } from "./attachmentProcessor"
import { DBConnection } from './dbConnection';
import { AttachmentRetriever } from './attachmentRetriever';


//explicit configuration for connections // extracted from config.js
async function main() {
  const con = new DBConnection();
  const retriever = new AttachmentRetriever();
  const processor = new AttachmentProcessor(con);

  await retriever.connect();
  const attachments = await retriever.retrieve();
  retriever.end()

  await con.connect().then(function(result) {
    
    for (const attachment of attachments) {
      processor.saveAttachmentInDB(attachment);
    }
     console.log("Connection to DB established.")
  }).catch(function(result){
    console.log("Connection to DB failed." + result)
  });
  
  //await con.end();

  //await retriever.markAsRead();
}

void main()
