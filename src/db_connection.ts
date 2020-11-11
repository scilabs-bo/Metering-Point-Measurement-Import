import { Client, ConnectionConfig, QueryResult } from 'pg';
import { ImapAttachment, MeasurementDataRow } from './types';
import config from './config';
import { callbackify } from 'util';


// * Connection parameters retrieved from config
const client = new Client(config.get('database'));

  export async function createInitialTable() {
    await client.connect()

    //Callback
     await client.query('CREATE TABLE IF NOT EXISTS zeitreihen (time TIMESTAMPTZ NOT NULL, effectiveConsumption FLOAT NOT NULL, blindConsumption FLOAT NOT NULL, activeFeed FLOAT NOT NULL, blindFeed FLOAT NOT NULL, CONSTRAINT zaehlpunkt FOREIGN KEY(id) REFERENCES metainfo(id));', (err: Error, res: QueryResult) => {
      console.log(err, res);  
      client.end();
    })
  }

  export async function getZaehlpunktId(zaehlpunktStr: string) {
    try{
      await client.connect()
    }  catch (e) {"DB connection already exists, skipping."}

    var queryStr = 'SELECT id FROM metainfo WHERE zaehlpunkt = $1';
    var values = [zaehlpunktStr];
    var id: string = '';

    //Callback
    // const res = await client.query(queryStr, values, (err: Error, res: QueryResult) => {
    //   id = JSON.stringify(res.rows[0]).split(':')[1].replace('}', '')
    //   console.log(id)
    // })

    const res = await client.query(queryStr, values)
    
    //TODO:  Replace with promises later
    setTimeout(() => {
      client.end();
    }, 800);

    return res
  }

  export async function createMetaInfoTable() {
    await client.connect();

    var zaehlpunkte = ['51332993942', '51333017254', '51332994099', '51332993950'];

    var queryStr = '';
    var values = [];

    await client.query('CREATE TABLE IF NOT EXISTS metainfo (id SMALLSERIAL PRIMARY KEY, zaehlpunkt VARCHAR NOT NULL)', (err: Error, res: QueryResult) => {
      console.log(err,res);
    });

    for (var i = 0; i < zaehlpunkte.length; i++) {
      queryStr = 'insert into metainfo (zaehlpunkt) VALUES ($1)'
      values = [zaehlpunkte[i]];

      client.query(queryStr, values, (err: Error, res: QueryResult) => {
        console.log(err, res); 
      })
    }
    //TODO:  Replace with promises later
    setTimeout(() => {
      client.end();
    }, 1000);
  }

  //! For development only(!)
  export async function deleteAllTables() {
    try{
      await client.connect()
    }  catch (e) {"DB connection already exists, skipping."}

      //Callback
      await client.query('drop schema if exists public cascade; create schema public', (err: Error, res: QueryResult) => {
        console.log(err, res);  
        client.end()
      })
    }

  // Function for inserting rows of each csv-file
  export function insertRows(array_rows: MeasurementDataRow[]) {
    try{
       client.connect()
    }  catch (UnhandledRejectionWarning) {"DB connection already exists, skipping."}

    //* Parameterized query
    var values = []
    var queryStr = ''

    for (var i = 0; i < array_rows.length; i++) {
      values = [array_rows[i].date, array_rows[i].effectiveConsumption, array_rows[i].blindConsumption, array_rows[i].activeFeed, array_rows[i].blindFeed],
      queryStr = 'insert into zeitreihen (time, effectiveConsumption, blindConsumption, activeFeed, blindFeed) VALUES ($1, $2, $3, $4, $5)',

       client.query(queryStr, values, (err: Error, res: QueryResult) => {
        console.log(err, res);  
      })
    }
  }

  export function endDBConnection() {
     client.end()
  }

    