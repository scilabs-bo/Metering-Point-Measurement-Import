import * as dataForge from 'data-forge';
import * as dataForgeFS from 'data-forge-fs';
import {DateTime} from 'luxon';
import iconv from 'iconv-lite';
import * as fs from 'fs';
import { ImapAttachment } from './types';

// function for transforming date and columns of csv data
// function transformDate(attachment: any) {
export function transformDate(attachment: ImapAttachment) {

  var headerlines = '';
  var csvlines = '';
  var headerPart = true;

  const readline = require('linebyline'),
  rl = readline('csv/51332993942.CSV', {
  retainBuffer: true
  });

  rl.on('line', (data: any) => {
    var line = iconv.decode(data, 'utf16');

    line = line.replace(/\0/g, '');  // remove null characters
    line = line.trim();

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

    var hms: number[];
    const csvTransf = csvData.select(row => {
      var dateobj = DateTime.fromFormat(row.Datum, 'dd.MM.yyyy');
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
    fs.writeFileSync('MailTestOut.csv', headerlines + csvOutputString);

  }, 2000);
}

