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
    const csvText = iconv.decode(attachment.data, 'utf16');
    csvText.split('\n').splice(0,10).join('\n');  // remove first 10 lines
    const csvData = dataForge.fromCSV(csvText, { columnNames: ['Datum', 'Uhrzeit',
                                                'effectiveConsumption', 'statusEffCon',
                                                'blindConsumption', 'statusBlindCon',
                                                'activeFeed', 'statusActiveFeed',
                                                'blindFeed', 'statusBlindFeed' ] }) //Statuszeilen -> db: interpoliert?

    const df = csvData.select((row: RawMeasurementDataRow): MeasurementDataRow => {
      return {
        date: this.transformDate(row.Datum, row.Uhrzeit).toISO(),
        effectiveConsumption: parseFloat(row.effectiveConsumption),
        statusEffCon:                    row.statusEffCon,
        blindConsumption:     parseFloat(row.blindConsumption),
        statusBlindCon:                  row.statusBlindCon,
        activeFeed:           parseFloat(row.activeFeed),
        statusActiveFeed:                row.statusActiveFeed,
        blindFeed:            parseFloat(row.blindFeed),
        statusBlindFeed:                 row.statusBlindFeed
      }
    })
  }

  private transformDate(date: string, time: string): DateTime {
    return DateTime.fromFormat(`${date} ${time}`, 'dd.MM.yyyy HH:mm:ss');
  }
}

export async function processAttachment(con: DBConnection, attachment: ImapAttachment): Promise<void> {
  return new Promise((resolve, reject) => {
    const csvProcessor = new AttachmentProcessor(con);
    const csvData = csvProcessor.process(attachment);
      
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
  })
}


