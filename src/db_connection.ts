import { Client, QueryResult } from 'pg';
import { MeasurementDataRow } from './types';
import config from './config';
import { IDataFrame } from 'data-forge';

// * Connection parameters retrieved from config
export class DBConnection {
  private client = new Client(config.get('database'));

  async connect(): Promise<void> {
    try {
      this.client.connect();
    } catch(e) {
      //* Connection may be already established - ignore error for now
    }
  }

  async end(): Promise<void> {
    return this.client.end();
  }

  async createInitialTable(): Promise<void> {
    await this.client.query('CREATE TABLE IF NOT EXISTS zeitreihen (time TIMESTAMPTZ NOT NULL, effectiveConsumption FLOAT NOT NULL, blindConsumption FLOAT NOT NULL, activeFeed FLOAT NOT NULL, blindFeed FLOAT NOT NULL, zaehlpunkt INTEGER REFERENCES metainfo(id));')
  }

  async createMetaInfoTable(): Promise<void> {
    const zaehlpunkte = ['51332993942', '51333017254', '51332994099', '51332993950'];

    await this.client.query('CREATE TABLE IF NOT EXISTS metainfo (id SMALLSERIAL PRIMARY KEY, zaehlpunkt VARCHAR NOT NULL UNIQUE)');
    for (let i = 0; i < zaehlpunkte.length; i++) {
      await this.client.query('INSERT INTO metainfo (zaehlpunkt) VALUES ($1) ON CONFLICT (zaehlpunkt) DO NOTHING', [ zaehlpunkte[i] ]);
    }
  }

  async getMeterPointId(meterPoint: string): Promise<number | null> {
    const res = await this.client.query('SELECT id FROM metainfo WHERE zaehlpunkt = $1', [ meterPoint ]);
    return res.rows[0]?.id || null;
  }

  async insertRows(df: IDataFrame<number, MeasurementDataRow>, id: number): Promise<void> {
    const queryStr = 'INSERT INTO zeitreihen (time, effectiveConsumption, blindConsumption, activeFeed, blindFeed, zaehlpunkt) VALUES ($1, $2, $3, $4, $5, $6)';
    let queries: Promise<QueryResult<any>>[] = [];
    for(let i = 0; i < df.count(); i++) {
      queries.push(this.client.query(queryStr, [df.at(i)?.date ?? null, df.at(i)?.effectiveConsumption ?? null, df.at(i)?.blindConsumption ?? null, df.at(i)?.activeFeed ?? null, df.at(i)?.blindFeed ?? null, id]));
    }
    await Promise.all(queries);
  }

  //! For development only
  async deleteAllTables(): Promise<void> {
    await this.client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public');
  }
}
