import * as dataForge from 'data-forge';
import { DateTime } from 'luxon';
import iconv from 'iconv-lite';
import * as fs from 'fs';
import { ImapAttachment, MeasurementDataRow, RawMeasurementDataRow } from './types';
import { DBConnection } from "./dbConnection"
import { kMaxLength } from 'buffer';
import { rejects } from 'assert';

export class AttachmentProcessor {
   private con: DBConnection;
  
  constructor(con: DBConnection) {
    this.con = con;
  }

  private async process(attachment: ImapAttachment): Promise<dataForge.IDataFrame> {
    const csvText = iconv.decode(attachment.data, 'utf16').split('\n').splice(10, kMaxLength).join('\n'); 
    const csvData = dataForge.fromCSV(csvText, { columnNames: ['date', 'time',
                                                'effectiveConsumption', 'statusEffCon',
                                                'blindConsumption', 'statusBlindCon',
                                                'activeFeed', 'statusActiveFeed',
                                                'blindFeed', 'statusBlindFeed' ] }); //Statuszeilen -> db: interpoliert?

    const df = csvData.select((row: RawMeasurementDataRow): MeasurementDataRow => {
      return {
        date: this.transformDate(row.date, row.time).toISO(),
        effectiveConsumption: parseFloat(row.effectiveConsumption.replace(',','.')),
        statusEffCon:                    this.setBooleanFlag(row.statusEffCon),
        blindConsumption:     parseFloat(row.blindConsumption.replace(',','.')),
        statusBlindCon:                  this.setBooleanFlag(row.statusEffCon),
        activeFeed:           parseFloat(row.activeFeed.replace(',','.')),
        statusActiveFeed:                this.setBooleanFlag(row.statusEffCon),
        blindFeed:            parseFloat(row.blindFeed.replace(',','.')),
        statusBlindFeed:                 this.setBooleanFlag(row.statusEffCon)
      }
    })
    return df
  }

  private setBooleanFlag(value: string) {
    if (value !== "Wert ist gültig") {
      return "false"
    } 
    return "true"
  }

  private transformDate(date: string, time: string): DateTime {
    return DateTime.fromFormat(`${date} ${time}`, 'dd.MM.yyyy HH:mm:ss');
  }

  //TODO: Wenn IDs aus getMeterPointODFromDB korrekt ankommen, insertRow() testen
  async saveAttachmentInDB(attachment: ImapAttachment): Promise<void> {

    let id_fin: number | null = null
    return new Promise((resolve, reject) => {

      this.getMeterPointIDFromDB(attachment.filename).then((id) =>
      id_fin = id).then((id) => 
      this.process(attachment)).then((df) =>
        this.con.insertRows(df, id_fin as number)
      )
      resolve();
    })
  }

  private getMeterPointIDFromDB(filename: string) : Promise<number | null> {

    let meterPoint = filename.split('.')[0];
    let id_db = this.con.getMeterPointId(meterPoint)
    return id_db;
  }
}




