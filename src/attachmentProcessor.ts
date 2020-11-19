import * as dataForge from 'data-forge';
import { DateTime } from 'luxon';
import iconv from 'iconv-lite';
import * as fs from 'fs';
import { ImapAttachment, MeasurementDataRow, RawMeasurementDataRow } from './types';
import { Readable } from 'stream';
import readline from 'readline';
import { DBConnection } from "./dbConnection"

export class AttachmentProcessor {
  private con: DBConnection;
  constructor(con: DBConnection) {
    this.con = con;
  }

  //regex query oder ersten x zeilen weg
  async process(attachment: ImapAttachment): Promise<void> {
    let headerPart = true;
    const csvText = iconv.decode(attachment.data, 'utf16');
    const csvData = dataForge.fromCSV(csvText, { columnNames: [ '' ] }) //Statuszeilen -> db: interpoliert?
  }

  private transformDate(date: string, time: string): DateTime {
    return DateTime.fromFormat(`${date} ${time}`, 'dd.MM.yyyy HH:mm:ss');
  }
}

export async function processAttachment(con: DBConnection, attachment: ImapAttachment): Promise<void> {
  return new Promise((resolve, reject) => {
    let headerlines = '';
    let csvlines = '';
    let headerPart = true;
  
    rl.once('close', async () => {
      const csvData = dataForge.fromCSV(csvlines);
      const df = csvData.select((row: RawMeasurementDataRow): MeasurementDataRow => {
        return {
          date: transformDate(row.Datum, row.Uhrzeit).toISO(),
          effectiveConsumption: parseFloat(row['Wirk Verbrauch in KWH']),
          blindConsumption: parseFloat(row['Blind Verbrauch in kvarh']),
          activeFeed: parseFloat(row['Wirk Einspeisung in KWH']),
          blindFeed: parseFloat(row['Blind Einspeisung in kvarh']),
        }
      })
      
      //Extracting value of "zaehlpunkt"
      const meterPointMatch = headerlines.match(/Zählpunkt: ([0-9]*)/);
      if(!meterPointMatch) {
        console.log("Unable to extract meter point identifier from file");
        return reject("Unable to extract meter point identifier from file");
      }
      
      let id = await con.getMeterPointId(meterPointMatch[1]);
      if(id === null) {
        console.log(`Unable to determine database id of meter point ${meterPointMatch[1]}`);
        return reject(`Unable to determine database id of meter point ${meterPointMatch[1]}`);
      }
      console.log(meterPointMatch[1], ": ", id);
      await con.insertRows(df, id);
  
      const csvOutputString = df.toCSV();
      fs.writeFileSync('csv_out/out_' + attachment.filename, headerlines + csvOutputString);
      resolve();
    });
  })
}


