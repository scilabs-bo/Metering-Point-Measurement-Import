import * as dataForge from 'data-forge';
import { DateTime } from 'luxon';
import iconv from 'iconv-lite';
import * as fs from 'fs';
import { ImapAttachment, MeasurementDataRow, RawMeasurementDataRow } from './types';
import { DBConnection } from "./dbConnection"
import { kMaxLength } from 'buffer';

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
        statusEffCon:                    this.setStatusFlag(row.statusEffCon),
        blindConsumption:     parseFloat(row.blindConsumption.replace(',','.')),
        statusBlindCon:                  this.setStatusFlag(row.statusEffCon),
        activeFeed:           parseFloat(row.activeFeed.replace(',','.')),
        statusActiveFeed:                this.setStatusFlag(row.statusEffCon),
        blindFeed:            parseFloat(row.blindFeed.replace(',','.')),
        statusBlindFeed:                 this.setStatusFlag(row.statusEffCon)
      }
    })
    return df
  }

  private setStatusFlag(value: string) {
    if (value === "Wert ist gültig") {
      return "true"
    } 
    return "false"
  }

  private transformDate(date: string, time: string): DateTime {
    return DateTime.fromFormat(`${date} ${time}`, 'dd.MM.yyyy HH:mm:ss');
  }

  //TODO: Wenn IDs aus getMeterPointODFromDB korrekt ankommen, insertRow() testen
  async saveAttachmentInDB(attachment: ImapAttachment): Promise<void> {
    return new Promise((resolve, reject) => {
 
      let id_fk = this.getMeterPointIDFromDB(attachment.filename)

      var df = this.process(attachment).then(function(this: DBConnection, result) {
        const csvOutputString = result.toCSV();
        fs.writeFileSync('src/csv_out/' + attachment.filename, csvOutputString);
        console.log("ID: ", id_fk)
        //this.con.insertRows(df, id_fk)
      })
      resolve();
    })
  }


  //TODO: Methode fertigstellen
  private getMeterPointIDFromDB(filename: string) : number {
    const meterPoint = filename.split('.')[0];
    let id_fk : number | null = 0;

    if(meterPoint === null) {
      console.log("Unable to extract meter point identifier from file");
    }

    let id_db = this.con.getMeterPointId(meterPoint).then(function(this: number , result) {
      if(result === null) {
        console.log(`Unable to determine database id of meter point ${meterPoint}`);
      }
     // this.id_fk = result;
    });
    return id_fk;
  }
}




