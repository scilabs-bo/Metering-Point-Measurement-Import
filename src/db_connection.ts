import { Client, ConnectionConfig, QueryResult } from 'pg';
import { ImapAttachment, MeasurementDataRow } from './types';
import config from './config';
import { callbackify } from 'util';


// * Connection parameters retrieved from config
const client = new Client(config.get('database'));

  export async function createInitialTable() {
    await client.connect()

    //Callback
     await client.query('CREATE TABLE IF NOT EXISTS zeitreihen (time TIMESTAMPTZ NOT NULL, effectiveConsumption FLOAT NOT NULL, blindConsumption FLOAT NOT NULL, activeFeed FLOAT NOT NULL, blindFeed FLOAT NOT NULL);', (err: Error, res: QueryResult) => {
      console.log(err, res);  
      client.end();
    })
  }

  export async function createMetaInfoTable() {
    await client.connect();

    //Callback
    await client.query('CREATE TABLE IF NOT EXISTS metainfo(id SERIAL PRIMARY KEY, zählpunkt VARCHAR NOT NULL, zähler VARCHAR, ebene VARCHAR NOT NULL, energieart VARCHAR );', (err: Error, res: QueryResult) => {
      console.log(err, res);  
      client.end();
    })
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

  //Hier ImapAttachment übergeben
  export async function insertRows(array_rows: MeasurementDataRow[]) {
    try{
      await client.connect()
    }  catch (UnhandledRejectionWarning) {"DB connection already exists, skipping."}

    var values = []
    var query_str = ''

    for (var i = 0; i < array_rows.length; i++) {
      values = [array_rows[i].date, array_rows[i].effectiveConsumption, array_rows[i].blindConsumption, array_rows[i].activeFeed, array_rows[i].blindFeed],
      query_str = 'insert into zeitreihen (time, effectiveConsumption, blindConsumption, activeFeed, blindFeed) VALUES ($1, $2, $3, $4, $5)',

      await client.query(query_str, values, (err: Error, res: QueryResult) => {
        console.log(err, res);  
      })
    }
  }

  export function endDBConnection() {
     client.end()
  }

    