import { Client, QueryResult } from 'pg';
import { MeasurementDataRow } from './types';
import config from './config';
import { IDataFrame } from 'data-forge';

// * Connection parameters retrieved from config
export class DBConnection {
  private client = new Client(config.get('database'));

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      await this.createLoadProfileTable();
      await this.createMeterPointTable();
    } catch(e) {
      //* Connection may be already established - ignore error for now
    }
  }

  async end(): Promise<void> {
    return await this.client.end();
  }

  private async createLoadProfileTable(): Promise<void> {
    await this.client.query(createLoadProfileTableQuery);
  }

  private async createMeterPointTable(): Promise<void> {
    await this.client.query(createMeterPointTableQuery);
  }

  async getMeterPointId(meterPoint: string): Promise<number | null> {
    let res = await this.client.query(selectMeterPointIdQuery, [ meterPoint ]);
    if(res.rowCount === 0) {
      res = await this.client.query(insertMeterPointIdQuery, [ meterPoint ]);
    }
    return res.rows[0]?.id as number || null;
  }

  async insertRows(df: IDataFrame<number, MeasurementDataRow>, id: number): Promise<void> {
    const queries: Promise<QueryResult<any>>[] = [];
    for(let i = 0; i < df.count(); i++) {
      queries.push(this.client.query(insertRowQuery, [df.at(i)?.date ?? null, df.at(i)?.effectiveConsumption ?? null, df.at(i)?.blindConsumption ?? null, df.at(i)?.activeFeed ?? null, df.at(i)?.blindFeed ?? null, id]));
    }
    await Promise.all(queries);
  }
}

const createLoadProfileTableQuery = `
  CREATE TABLE IF NOT EXISTS loadProfileData (
    time TIMESTAMPTZ NOT NULL,
    effectiveConsumption FLOAT NOT NULL,
    blindConsumption FLOAT NOT NULL,
    activeFeed FLOAT NOT NULL,
    blindFeed FLOAT NOT NULL,
    meterPoint INTEGER REFERENCES meterPoints(id)
  );
`;
const createMeterPointTableQuery = `
  CREATE TABLE IF NOT EXISTS meterPoints (
    id SMALLSERIAL PRIMARY KEY,
    meterPoint VARCHAR NOT NULL UNIQUE,
    description VARCHAR NULL
  );
`;
const selectMeterPointIdQuery = 'SELECT id FROM meterPoints WHERE meterPoint = $1';
const insertMeterPointIdQuery = 'INSERT INTO meterPoints (meterPoint) VALUES ($1) RETURNING id';
const insertRowQuery = 'INSERT INTO loadProfileData (time, effectiveConsumption, blindConsumption, activeFeed, blindFeed, meterPoint) VALUES ($1, $2, $3, $4, $5, $6)';
