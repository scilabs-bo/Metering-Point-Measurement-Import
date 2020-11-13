import * as dataForge from 'data-forge';
import { DateTime } from 'luxon';
import iconv from 'iconv-lite';
import * as fs from 'fs';
import { ImapAttachment, MeasurementDataRow, RawMeasurementDataRow } from './types';
import { Readable } from 'stream';
import readline from 'readline';
import { DBConnection } from "./db_connection"

// function for transforming date and columns of csv data
function transformDate(date: string, time: string): DateTime {
  return DateTime.fromFormat(`${date} ${time}`, 'dd.MM.yyyy HH:mm:ss');
}

export async function processAttachment(con: DBConnection, attachment: ImapAttachment): Promise<void> {
  return new Promise((resolve, reject) => {
    let headerlines = '';
    let csvlines = '';
    let headerPart = true;
  
    const buffer = iconv.decode(attachment.data, 'utf16');
    const stream = Readable.from(buffer);
  
    const rl = readline.createInterface({
      input: stream,
      output: process.stdout,
      terminal: false
    });
  
    rl.on('line', (line: string) => {
  
      // line = line.replace(/\0/g, '');  // remove null characters
      line = line.replace(/,/g, '.');  // replace decimal comma by decimal point
      line = line.trim();
  
      if (line.startsWith('Datum')) {
        headerPart = false;
      }
      if (line !== null && line !== '') {  // line not empty
        if (headerPart) {
          headerlines = headerlines.concat(line, '\n');
        }
        else {
          if (!line.includes('Wert ist ungültig')) { //|| "Wert ist interpoliert"?
            csvlines = csvlines.concat(line, '\n');
          }
        }
      }
    });
  
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


