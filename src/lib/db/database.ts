import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { RideLog, WorkShift } from "../types";

const DB_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "taxi-tool.db");

let db: Database.Database | null = null;

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS work_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      started_at TEXT,
      ended_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ride_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER,
      picked_up_at TEXT NOT NULL,
      dropped_off_at TEXT,
      pickup_area_id TEXT,
      pickup_text TEXT,
      dropoff_area_id TEXT,
      dropoff_text TEXT,
      fare_amount REAL,
      memo TEXT,
      weather_json TEXT,
      events_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shift_id) REFERENCES work_shifts(id)
    );

    CREATE TABLE IF NOT EXISTS weather_cache (
      date TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events_cache (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      start_at TEXT,
      end_at TEXT,
      lat REAL,
      lng REAL,
      category TEXT,
      estimated_attendance INTEGER,
      source TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_work_shifts_date ON work_shifts(date);
    CREATE INDEX IF NOT EXISTS idx_ride_logs_shift ON ride_logs(shift_id);
    CREATE INDEX IF NOT EXISTS idx_ride_logs_picked_up ON ride_logs(picked_up_at);
  `);
}

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema(db);
  }
  return db;
}

export function getShiftByDate(date: string): WorkShift | null {
  const row = getDb()
    .prepare("SELECT * FROM work_shifts WHERE date = ? ORDER BY id DESC LIMIT 1")
    .get(date) as
    | {
        id: number;
        date: string;
        started_at: string | null;
        ended_at: string | null;
      }
    | undefined;

  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export function startShift(date: string, startedAt: string): WorkShift {
  const existing = getShiftByDate(date);
  if (existing) {
    getDb()
      .prepare(
        "UPDATE work_shifts SET started_at = ?, ended_at = NULL WHERE id = ?",
      )
      .run(startedAt, existing.id);
    return { ...existing, startedAt, endedAt: null };
  }

  const result = getDb()
    .prepare("INSERT INTO work_shifts (date, started_at) VALUES (?, ?)")
    .run(date, startedAt);

  return {
    id: Number(result.lastInsertRowid),
    date,
    startedAt,
    endedAt: null,
  };
}

export function endShift(date: string, endedAt: string): WorkShift | null {
  const shift = getShiftByDate(date);
  if (!shift) return null;

  getDb()
    .prepare("UPDATE work_shifts SET ended_at = ? WHERE id = ?")
    .run(endedAt, shift.id);

  return { ...shift, endedAt };
}

export function createRideLog(data: {
  shiftId: number | null;
  pickedUpAt: string;
  droppedOffAt?: string | null;
  pickupAreaId?: string | null;
  pickupText?: string | null;
  dropoffAreaId?: string | null;
  dropoffText?: string | null;
  fareAmount?: number | null;
  memo?: string | null;
  weatherJson?: string | null;
  eventsJson?: string | null;
}): RideLog {
  const result = getDb()
    .prepare(
      `INSERT INTO ride_logs (
        shift_id, picked_up_at, dropped_off_at,
        pickup_area_id, pickup_text, dropoff_area_id, dropoff_text,
        fare_amount, memo, weather_json, events_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.shiftId,
      data.pickedUpAt,
      data.droppedOffAt ?? null,
      data.pickupAreaId ?? null,
      data.pickupText ?? null,
      data.dropoffAreaId ?? null,
      data.dropoffText ?? null,
      data.fareAmount ?? null,
      data.memo ?? null,
      data.weatherJson ?? null,
      data.eventsJson ?? null,
    );

  return {
    id: Number(result.lastInsertRowid),
    shiftId: data.shiftId,
    pickedUpAt: data.pickedUpAt,
    droppedOffAt: data.droppedOffAt ?? null,
    pickupAreaId: data.pickupAreaId ?? null,
    pickupText: data.pickupText ?? null,
    dropoffAreaId: data.dropoffAreaId ?? null,
    dropoffText: data.dropoffText ?? null,
    fareAmount: data.fareAmount ?? null,
    memo: data.memo ?? null,
    weatherJson: data.weatherJson ?? null,
    eventsJson: data.eventsJson ?? null,
  };
}

export function updateRideDropoff(
  rideId: number,
  data: {
    droppedOffAt: string;
    dropoffAreaId?: string | null;
    dropoffText?: string | null;
    fareAmount?: number | null;
  },
): RideLog | null {
  getDb()
    .prepare(
      `UPDATE ride_logs SET
        dropped_off_at = ?,
        dropoff_area_id = ?,
        dropoff_text = ?,
        fare_amount = ?
      WHERE id = ?`,
    )
    .run(
      data.droppedOffAt,
      data.dropoffAreaId ?? null,
      data.dropoffText ?? null,
      data.fareAmount ?? null,
      rideId,
    );

  return getRideById(rideId);
}

export function getRideById(id: number): RideLog | null {
  const row = getDb()
    .prepare("SELECT * FROM ride_logs WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapRideRow(row);
}

export function getRidesForDate(date: string): RideLog[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM ride_logs
       WHERE picked_up_at LIKE ?
       ORDER BY picked_up_at ASC`,
    )
    .all(`${date}%`) as Record<string, unknown>[];

  return rows.map(mapRideRow);
}

export function getPendingRide(shiftId: number): RideLog | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM ride_logs
       WHERE shift_id = ? AND dropped_off_at IS NULL
       ORDER BY picked_up_at DESC LIMIT 1`,
    )
    .get(shiftId) as Record<string, unknown> | undefined;

  if (!row) return null;
  return mapRideRow(row);
}

export function getShiftHistory(limit = 30): WorkShift[] {
  const rows = getDb()
    .prepare("SELECT * FROM work_shifts ORDER BY date DESC LIMIT ?")
    .all(limit) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as number,
    date: row.date as string,
    startedAt: row.started_at as string | null,
    endedAt: row.ended_at as string | null,
  }));
}

export function getExportData(startDate: string, endDate: string) {
  return getDb()
    .prepare(
      `SELECT
        ws.date,
        ws.started_at,
        ws.ended_at,
        rl.picked_up_at,
        rl.pickup_area_id,
        rl.pickup_text,
        rl.dropped_off_at,
        rl.dropoff_area_id,
        rl.dropoff_text,
        rl.fare_amount,
        rl.memo,
        rl.weather_json,
        rl.events_json
      FROM ride_logs rl
      LEFT JOIN work_shifts ws ON rl.shift_id = ws.id
      WHERE rl.picked_up_at >= ? AND rl.picked_up_at <= ?
      ORDER BY rl.picked_up_at ASC`,
    )
    .all(`${startDate}T00:00:00`, `${endDate}T23:59:59`) as Record<
    string,
    unknown
  >[];
}

function mapRideRow(row: Record<string, unknown>): RideLog {
  return {
    id: row.id as number,
    shiftId: row.shift_id as number | null,
    pickedUpAt: row.picked_up_at as string,
    droppedOffAt: row.dropped_off_at as string | null,
    pickupAreaId: row.pickup_area_id as string | null,
    pickupText: row.pickup_text as string | null,
    dropoffAreaId: row.dropoff_area_id as string | null,
    dropoffText: row.dropoff_text as string | null,
    fareAmount: row.fare_amount as number | null,
    memo: row.memo as string | null,
    weatherJson: row.weather_json as string | null,
    eventsJson: row.events_json as string | null,
  };
}
