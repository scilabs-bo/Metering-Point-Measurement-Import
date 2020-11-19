import Connection from 'imap';
import imaps, { ImapSimple, ImapSimpleOptions, Message } from "imap-simple";
import config from './config';
import { ImapAttachment, ImapAttachmentPart, isImapAttachmentPart } from "./types";

export class AttachmentRetriever {
  private imapOptions: ImapSimpleOptions = {
    imap: config.get('imap')
  };
  private connection: ImapSimple | null = null;
  private retrievedMessageUids: string[] = [];

  async connect(): Promise<void> {
    this.connection = await imaps.connect(this.imapOptions);
  }

  end(): void {
    this.connection?.end();
  }

  async retrieve(): Promise<ImapAttachment[]> {
    const mails = await this.searchForUnseenMails();
    const attachments = await this.getAttachments(mails || []);
    return attachments;
  }

  async markAsRead(): Promise<void> {
    const promises: Promise<void>[] = [];
    for(const uid of this.retrievedMessageUids) {
      promises.push(this.markMessageAsRead(uid));
    }
    await Promise.all(promises);
  }

  private async searchForUnseenMails(): Promise<Message[] | undefined> {
    await this.connection?.openBox('INBOX');
    const searchCriteria = ['UNSEEN'];
    const fetchOptions: Connection.FetchOptions = { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'], struct: true };
    return await this.connection?.search(searchCriteria, fetchOptions);
  }
  
  private async getAttachments(messages: Message[]): Promise<ImapAttachment[]> {
    let attachments: Promise<ImapAttachment>[] = [];
    for (const message of messages) {
      const parts = imaps.getParts(message.attributes.struct || []);
      const newAttachments = parts.filter(isImapAttachmentPart)
        .map(async (part: ImapAttachmentPart): Promise<ImapAttachment> => {
          const partData = await this.connection?.getPartData(message, part) as Buffer;
          return {
            filename: part.disposition.params.filename,
            data: partData,
          };
        });
      attachments = attachments.concat(newAttachments);
      this.retrievedMessageUids.push(message.attributes.uid.toString());
    }
    return Promise.all(attachments);
  }

  private async markMessageAsRead(uid: string): Promise<void> {
    return this.connection?.addFlags(uid, "\Seen");
  }
}
