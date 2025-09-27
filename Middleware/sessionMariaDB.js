// Middleware/MariaDBStore.js
const session = require("express-session");
const conn = require("../SQL/conn");

    class MariaDBStore extends session.Store {
    constructor(tableName) {
        super();
        this.conn = conn;
        this.table = tableName;
    }
    async get(sid, callback) {
        try {
        const [rows] = await this.conn.query(
            `SELECT session_data FROM ${this.table} WHERE session_id = ?`,
            [sid]
        );
        if (rows.length === 0) return callback();
        return callback(null, JSON.parse(rows[0].session_data.toString()));
        } catch (err) {
        return callback(err);
        }
    }
    async set(sid, sessionData, callback) {
    try {
        const data = JSON.stringify(sessionData);
        const userId = sessionData?.login?.user_id || null;
        const staffId = sessionData?.login?.staff_id || null;

        const idColumn = this.table.startsWith("user") ? "user_id" : "staff_id";
        const idValue = idColumn === "user_id" ? userId : staffId;

        await this.conn.query(
            `REPLACE INTO ${this.table} (session_id, ${idColumn}, session_data)
            VALUES (?, ?, ?)`,
            [sid, idValue, data]
        );
        callback(null);
    } catch (err) {
        callback(err);
    }
    }
  async destroy(sid, callback) {
        try {
        await this.conn.query(
            `DELETE FROM ${this.table} WHERE session_id = ?`,
            [sid]
        );
        callback(null);
        } catch (err) {
        callback(err);
        }
    }
}

module.exports = MariaDBStore;
