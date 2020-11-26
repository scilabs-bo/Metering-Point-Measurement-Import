import { Client, QueryResult } from 'pg';
import { MeasurementDataRow } from './types';
import config from './config';
import { IDataFrame } from 'data-forge';

export class DBConnection {
  private client = new Client(config.get('database'));

  async connect(): Promise<void> {
    await this.client.connect();
    await this.createMeterPointTable();
    await this.createLoadProfileTable();
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

  async getMeterPointId(meterPoint: string): Promise<number> {
    let res = await this.client.query(selectMeterPointIdQuery, [meterPoint]);
    if (res.rowCount === 0) {
      res = await this.client.query(insertMeterPointIdQuery, [meterPoint]);
    }
    return (res.rows[0] as { id: number }).id;
  }

  async insertRows(
    df: IDataFrame<number, MeasurementDataRow>,
    id: number,
  ): Promise<void> {
    const queries: Promise<QueryResult>[] = [];
    for (let i = 0; i < df.count(); i++) {
      queries.push(
        this.client.query(insertRowQuery, [
          df.at(i)?.date ?? new Date().toISOString(),
          df.at(i)?.effectiveConsumption ?? null,
          df.at(i)?.statusEffCon ?? null,
          df.at(i)?.blindConsumption ?? null,
          df.at(i)?.statusBlindCon ?? null,
          df.at(i)?.activeFeed ?? null,
          df.at(i)?.statusActiveFeed ?? null,
          df.at(i)?.blindFeed ?? null,
          df.at(i)?.statusBlindFeed ?? null,
          id,
        ]),
      );
    }
    await Promise.all(queries);
  }
}

const createLoadProfileTableQuery = `
  CREATE TABLE IF NOT EXISTS loadProfileData (
    time TIMESTAMPTZ NOT NULL,
    effectiveConsumption FLOAT,
    statusEffCon BOOLEAN,
    blindConsumption FLOAT,
    statusBlindCon BOOLEAN,
    activeFeed FLOAT,
    statusActiveFeed BOOLEAN,
    blindFeed FLOAT,
    statusBlindFeed BOOLEAN,
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
const selectMeterPointIdQuery =
  'SELECT id FROM meterPoints WHERE meterPoint = $1';
const insertMeterPointIdQuery =
  'INSERT INTO meterPoints (meterPoint) VALUES ($1) ON CONFLICT (meterPoint) DO NOTHING RETURNING id';
const insertRowQuery =
  'INSERT INTO loadProfileData (time, effectiveConsumption, statusEffCon, blindConsumption, statusBlindCon, activeFeed, statusActiveFeed, blindFeed, statusBlindFeed, meterPoint) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
