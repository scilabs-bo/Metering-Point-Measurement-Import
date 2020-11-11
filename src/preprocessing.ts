import * as dataForge from 'data-forge';
import { DateTime } from 'luxon';
import iconv from 'iconv-lite';
import * as fs from 'fs';
import { ImapAttachment, MeasurementDataRow, RawMeasurementDataRow } from './types';
import { Readable } from 'stream';
import readline from 'readline';
import { insertRows, createMetaInfoTable, getZaehlpunktId } from "./db_connection"
import { stringify } from 'querystring';


// function for transforming date and columns of csv data
function transformDate(date: string, time: string): DateTime {
  return DateTime.fromFormat(`${date} ${time}`, 'dd.MM.yyyy HH:mm:ss');
}

export async function processAttachment(attachment: ImapAttachment) {

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

  rl.once('close', () => {
    const csvData = dataForge.fromCSV(csvlines);
    const csvTransf = csvData.select((row: RawMeasurementDataRow): MeasurementDataRow => {

      return {
        date: transformDate(row.Datum, row.Uhrzeit).toISO(),
        effectiveConsumption: parseFloat(row['Wirk Verbrauch in KWH']),
        blindConsumption: parseFloat(row['Blind Verbrauch in kvarh']),
        activeFeed: parseFloat(row['Wirk Einspeisung in KWH']),
        blindFeed: parseFloat(row['Blind Einspeisung in kvarh']),
      }
    })

    const array_rows = csvTransf.toArray()

    //! All csv-files are saved in one table
    var headerlines_df = dataForge.fromCSV(headerlines)
    var headerlines_array = headerlines_df.toArray()

    //Extracting value of "zaehlpunkt"
    var zaehlpunktStr =  JSON.stringify(headerlines_array[0]).split(':').pop()?.slice(1, -2);
    var zaehlpunktId = getZaehlpunktId(String(zaehlpunktStr))

    zaehlpunktId.then(function(res) {
      let id = JSON.stringify(res.rows[0]).split(':')[1].replace('}', '')
      console.log("ZAEHLPUNKT-ID", id)
    })

  
    //insertRows(array_rows) //passing whole row-array to db-method

    const csvOutputString = csvTransf.toCSV();
    fs.writeFileSync('csv_out/out_' + attachment.filename, headerlines + csvOutputString);
  });
}


