import * as dataForge from 'data-forge';
import { DateTime } from 'luxon';
import iconv from 'iconv-lite';
import * as fs from 'fs';
import { ImapAttachment, MeasurementDataRow, RawMeasurementDataRow } from './types';
import { Readable } from 'stream';
import readline from 'readline';


// function for transforming date and columns of csv data
function transformDate(date: string, time: string): DateTime {
  return DateTime.fromFormat(`${date} ${time}`, 'dd.MM.yyyy HH:mm:ss');
}

export function processAttachment(attachment: ImapAttachment): void {

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
    // let line = iconv.decode(data, 'utf16');

    // line = line.replace(/\0/g, '');  // remove null characters
    line = line.replace(/,/g, '.');  // replace decimal comma by decimal point
    line = line.trim();
    // console.log(line);

    if (line.startsWith('Datum')) {
      headerPart = false;
    }
    if (line !== null && line !== '') {  // line not empty
      if (headerPart) {
        headerlines = headerlines.concat(line, '\n');
      }
      else {
        if (!line.includes('Wert ist ungültig')) {
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

    const csvOutputString = csvTransf.toCSV();
    fs.writeFileSync('csv_out/out_' + attachment.filename, headerlines + csvOutputString);
  });
}

