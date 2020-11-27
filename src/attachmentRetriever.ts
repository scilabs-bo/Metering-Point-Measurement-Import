import Connection from 'imap';
import imaps, { ImapSimple, ImapSimpleOptions, Message } from 'imap-simple';
import config from './config';
import {
  ImapAttachment,
  ImapAttachmentPart,
  isImapAttachmentPart,
} from './types';

export class AttachmentRetriever {
  private imapOptions: ImapSimpleOptions = {
    imap: config.get('imap'),
  };
  private connection: ImapSimple | null = null;

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

  private async searchForUnseenMails(): Promise<Message[] | undefined> {
    await this.connection?.openBox('INBOX');
    const searchCriteria = ['UNSEEN']; //* since november muss später weg
    const fetchOptions: Connection.FetchOptions = {
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
      struct: true,
      markSeen: config.get('imap').markSeen,
    };
    return await this.connection?.search(searchCriteria, fetchOptions);
  }

  private async getAttachments(messages: Message[]): Promise<ImapAttachment[]> {
    let attachments: Promise<ImapAttachment>[] = [];
    for (const message of messages) {
      const parts = imaps.getParts(message.attributes.struct || []);
      const newAttachments = parts.filter(isImapAttachmentPart).map(
        async (part: ImapAttachmentPart): Promise<ImapAttachment> => {
          const partData = (await this.connection?.getPartData(
            message,
            part,
          )) as Buffer;
          return {
            filename: part.disposition.params.filename,
            data: partData,
          };
        },
      );
      attachments = attachments.concat(newAttachments);
    }
    return Promise.all(attachments);
  }
}
