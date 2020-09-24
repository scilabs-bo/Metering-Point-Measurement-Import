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
  Datum: string,
  Uhrzeit: string,
  'Wirk Verbrauch in KWH': string,
  'Blind Verbrauch in kvarh': string,
  'Wirk Einspeisung in KWH': string,
  'Blind Einspeisung in kvarh': string
}

export interface MeasurementDataRow {
  date: string,
  effectiveConsumption: number,
  blindConsumption: number,
  activeFeed: number,
  blindFeed: number
}