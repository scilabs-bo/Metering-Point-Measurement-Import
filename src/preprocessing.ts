import * as dataForge from 'data-forge';
import {DateTime} from 'luxon';
import iconv from 'iconv-lite';
import * as fs from 'fs';
import { ImapAttachment } from './types';
import { Readable } from 'stream';
import readline from 'readline';


// function for transforming date and columns of csv data
export function transformDate(attachment: ImapAttachment) {

  let headerlines = '';
  let csvlines = '';
  let headerPart = true;

  const buffer = iconv.decode(attachment.data,'utf16');
  const stream = Readable.from(buffer.toString());

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
    if (line != null && line !== '') {  // line not empty
      if (headerPart == true) {
        headerlines = headerlines.concat(line, '\n');
      }
      else {
        if (line.includes('Wert ist ungültig') == false) {
          csvlines = csvlines.concat(line, '\n');
        }
      }
    }
  });

  setTimeout(() => {
    const csvData = dataForge.fromCSV(csvlines);

    let hms: number[];
    const csvTransf = csvData.select(row => {
      let dateobj = DateTime.fromFormat(row.Datum, 'dd.MM.yyyy');
      hms = row.Uhrzeit.split(':');

      return {
        Datum: dateobj.set({ hour: hms[0], minute: hms[1], second: hms[2] }).toISO(),
        'Wirk Verbrauch in KWH': row['Wirk Verbrauch in KWH'],
        'Blind Verbrauch in kvarh': row['Blind Verbrauch in kvarh'],
        'Wirk Einspeisung in KWH': row['Wirk Einspeisung in KWH'],
        'Blind Einspeisung in kvarh': row['Blind Einspeisung in kvarh'],
      }
    })

    const csvOutputString = csvTransf.toCSV();
    fs.writeFileSync('csv_out/out_' + attachment.filename, headerlines + csvOutputString);

  }, 2000);
}

