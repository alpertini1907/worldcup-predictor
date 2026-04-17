const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');

const DB_PATH = path.join(__dirname, 'worldcup.db');

let database = null;

// Wrapper to make sql.js look like better-sqlite3 API
class DbWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
  }

  _save() {
    const data = this._db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  exec(sql) {
    this._db.run(sql);
    this._save();
  }

  prepare(sql) {
    const db = this._db;
    const wrapper = this;
    return {
      get(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        let result = null;
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          result = {};
          cols.forEach((c, i) => result[c] = vals[i]);
        }
        stmt.free();
        return result;
      },
      all(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          results.push(row);
        }
        stmt.free();
        return results;
      },
      run(...params) {
        db.run(sql, params);
        wrapper._save();
        const changes = db.getRowsModified();
        return { changes };
      }
    };
  }

  transaction(fn) {
    const db = this._db;
    const wrapper = this;
    return function() {
      db.run('BEGIN TRANSACTION');
      try {
        fn();
        db.run('COMMIT');
        wrapper._save();
      } catch(e) {
        db.run('ROLLBACK');
        throw e;
      }
    };
  }
}

// Initialize synchronously
function initDb() {
  const SQL = require('sql.js');

  // sql.js can be loaded synchronously via initSqlJs but we need a workaround
  // Actually sql.js exports the init function - we need to handle this async init
  // Let's use a different approach: load the WASM synchronously
  return null; // placeholder
}

// We'll use async init and export a promise
let dbReady;

async function getDb() {
  if (database) return database;

  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  database = new DbWrapper(sqlDb);

  // Create tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'waiting',
      must_change_password INTEGER NOT NULL DEFAULT 0,
      total_points INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      kickoff_at TEXT NOT NULL,
      stage TEXT NOT NULL,
      group_name TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      real_home_score INTEGER,
      real_away_score INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(home_team, away_team, kickoff_at)
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      match_id TEXT NOT NULL,
      pred_home INTEGER NOT NULL,
      pred_away INTEGER NOT NULL,
      points_earned INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, match_id)
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subscription TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id)
    );

    CREATE TABLE IF NOT EXISTS scoring_params (
      id TEXT PRIMARY KEY,
      stage TEXT NOT NULL UNIQUE,
      correct_result_pts INTEGER NOT NULL,
      correct_score_pts INTEGER NOT NULL,
      correct_ou_pts INTEGER NOT NULL,
      ou_threshold REAL NOT NULL DEFAULT 2.5,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed default scoring params if empty
  const paramCount = database.prepare('SELECT COUNT(*) as cnt FROM scoring_params').get();
  if (paramCount.cnt === 0) {
    const insert = database.prepare(
      'INSERT INTO scoring_params (id, stage, correct_result_pts, correct_score_pts, correct_ou_pts, ou_threshold) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const defaults = [
      ['group',  3,  5, 2, 2.5],
      ['r16',    5,  8, 3, 2.5],
      ['qf',     8, 12, 4, 2.5],
      ['sf',     8, 12, 4, 2.5],
      ['final', 15, 20, 6, 2.5],
    ];
    for (const [stage, result, score, ou, threshold] of defaults) {
      insert.run(uuid(), stage, result, score, ou, threshold);
    }
  }

  return database;
}

module.exports = { getDb };
