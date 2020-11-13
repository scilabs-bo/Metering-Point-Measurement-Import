import { Client, QueryResult } from 'pg';
import { MeasurementDataRow } from './types';
import config from './config';

// * Connection parameters retrieved from config
const client = new Client(config.get('database'));

  export async function createInitialTable(): Promise<void> {
    await client.connect()

    //Callback
     client.query('CREATE TABLE IF NOT EXISTS zeitreihen (time TIMESTAMPTZ NOT NULL, effectiveConsumption FLOAT NOT NULL, blindConsumption FLOAT NOT NULL, activeFeed FLOAT NOT NULL, blindFeed FLOAT NOT NULL, zaehlpunkt INTEGER REFERENCES metainfo(id));', (err: Error, res: QueryResult) => {
      console.log(err, res);  
      void client.end();
    })
  }

  export async function getZaehlpunktId(zaehlpunktStr: string): Promise<QueryResult> {
    try{
      await client.connect()
    }  catch (e) {"DB connection already exists, skipping."}

    const queryStr = 'SELECT id FROM metainfo WHERE zaehlpunkt = $1';
    const values = [zaehlpunktStr];
    const res = await client.query(queryStr, values)
    
    return res
  }

  export async function createMetaInfoTable(): Promise<void> {
    await client.connect();

    const zaehlpunkte = ['51332993942', '51333017254', '51332994099', '51332993950'];

    let queryStr = '';
    let values = [];

    client.query('CREATE TABLE IF NOT EXISTS metainfo (id SMALLSERIAL PRIMARY KEY, zaehlpunkt VARCHAR NOT NULL UNIQUE)', (err: Error, res: QueryResult) => {
      console.log(err,res);
    });

    for (let i = 0; i < zaehlpunkte.length; i++) {
      queryStr = 'insert into metainfo (zaehlpunkt) VALUES ($1) ON CONFLICT (zaehlpunkt) DO NOTHING'
      values = [zaehlpunkte[i]];

      client.query(queryStr, values, (err: Error, res: QueryResult) => {
        console.log(err, res); 
      })
    }
    //TODO:  Replace with promises later
    setTimeout(() => {
      void client.end();
    }, 1000);
  }

  //! For development only(!)
  export async function deleteAllTables(): Promise<void> {
    try{
      await client.connect()
    }  catch (e) {"DB connection already exists, skipping."}

      //Callback
      client.query('drop schema if exists public cascade; create schema public', (err: Error, res: QueryResult) => {
        console.log(err, res);  
        void client.end()
      })
    }

  // Function for inserting rows of each csv-file
  export function insertRows(array_rows: MeasurementDataRow[], id: string): void {
  /* try{
       client.connect()
    }  catch (UnhandledPromiseRejectionWarning) {"DB connection already exists, skipping."} */

    //* Parameterized query
    let values = []
    let queryStr = ''

    for (let i = 0; i < array_rows.length; i++) {
      values = [array_rows[i].date, array_rows[i].effectiveConsumption, array_rows[i].blindConsumption, array_rows[i].activeFeed, array_rows[i].blindFeed, id];
      queryStr = 'insert into zeitreihen (time, effectiveConsumption, blindConsumption, activeFeed, blindFeed, zaehlpunkt) VALUES ($1, $2, $3, $4, $5, $6)';

       client.query(queryStr, values, (err: Error, res: QueryResult) => {
        console.log(res, err);  
      })
    }

        //TODO:  Replace with promise later
        setTimeout(() => {
          void client.end();
        }, 6000);
    
  }

  export function endDBConnection(): void{
     void client.end()
  }

    