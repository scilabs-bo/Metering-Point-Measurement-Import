import * as dataForge from 'data-forge';
import iconv from 'iconv-lite';
import {
  ImapAttachment,
  MeasurementDataRow,
  RawMeasurementDataRow,
} from './types';
import { DBConnection } from './dbConnection';
import { kMaxLength } from 'buffer';

export class AttachmentProcessor {
  private con: DBConnection;

  constructor(con: DBConnection) {
    this.con = con;
  }

  private process(attachment: ImapAttachment): dataForge.IDataFrame {
    const csvText = iconv
      .decode(attachment.data, 'utf16')
      .split('\n')
      .splice(10, kMaxLength)
      .join('\n');
    const csvData = dataForge.fromCSV(csvText, {
      columnNames: [
        'date',
        'time',
        'effectiveConsumption',
        'statusEffCon',
        'blindConsumption',
        'statusBlindCon',
        'activeFeed',
        'statusActiveFeed',
        'blindFeed',
        'statusBlindFeed',
      ],
    });

    return csvData.select(
      (row: RawMeasurementDataRow): MeasurementDataRow => {
        return {
          date: this.transformDate(row.date, row.time).toISOString(),
          effectiveConsumption: parseFloat(
            row.effectiveConsumption.replace(',', '.'),
          ),
          statusEffCon: this.setBooleanFlag(row.statusEffCon),
          blindConsumption: parseFloat(row.blindConsumption.replace(',', '.')),
          statusBlindCon: this.setBooleanFlag(row.statusEffCon),
          activeFeed: parseFloat(row.activeFeed.replace(',', '.')),
          statusActiveFeed: this.setBooleanFlag(row.statusEffCon),
          blindFeed: parseFloat(row.blindFeed.replace(',', '.')),
          statusBlindFeed: this.setBooleanFlag(row.statusEffCon),
        };
      },
    );
  }

  private setBooleanFlag(value: string): boolean {
    if (value !== 'Wert ist gültig') {
      return false;
    }
    return true;
  }

  private transformDate(date: string, time: string): Date {
    const isoDate = date.split('.').reverse().join('-');
    return new Date(`${isoDate}T${time}`);
  }

  async saveAttachmentInDB(attachment: ImapAttachment): Promise<void> {
    const id = await this.getMeterPointIDFromDB(attachment.filename);
    const df = this.process(attachment);
    await this.con.insertRows(df, id);
  }

  private async getMeterPointIDFromDB(filename: string): Promise<number> {
    const meterPoint = filename.split('.')[0];
    return await this.con.getMeterPointId(meterPoint);
  }
}
