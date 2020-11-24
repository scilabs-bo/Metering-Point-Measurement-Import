export function isImapAttachmentPart(obj: ImapMessagePart): obj is ImapAttachmentPart {
  return obj.disposition && obj.disposition.type === 'attachment';
}

export interface ImapAttachment {
  filename: string;
  data: Buffer;
}

export interface ImapInlinePart {
  disposition: {
    type: 'inline';
  };
}

export interface ImapAttachmentPart {
  disposition: {
    type: 'attachment';
    params: {
      filename: string;
    }
  }
}

export type ImapMessagePart = ImapInlinePart | ImapAttachmentPart;

export interface RawMeasurementDataRow {
  date: string,
  time: string,
  effectiveConsumption: string,
  statusEffCon: string,
  blindConsumption: string,
  statusBlindCon: string,
  activeFeed: string,
  statusActiveFeed: string,
  blindFeed: string,
  statusBlindFeed: string
}

export interface MeasurementDataRow {
  date: string,
  effectiveConsumption: number,
  statusEffCon: string,
  blindConsumption: number,
  statusBlindCon: string,
  activeFeed: number,
  statusActiveFeed: string,
  blindFeed: number,
  statusBlindFeed: string
}