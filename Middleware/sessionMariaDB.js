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
            let idColumn = null;
            let idValue = null;
            if (sessionData?.login) {
            if (sessionData.login.user_id) {
                idColumn = "user_id";
                idValue = sessionData.login.user_id;
            } else if (sessionData.login.staff_id) {
                idColumn = "staff_id";
                idValue = sessionData.login.staff_id;
            }
            }
            const columns = ["session_id", ...(idColumn ? [idColumn] : []), "session_data"];
            const placeholders = columns.map(() => "?").join(", ");
            const values = [sid, ...(idValue ? [idValue] : []), data];
            const sql = `REPLACE INTO ${this.table} (${columns.join(", ")}) VALUES (${placeholders})`;
            await this.conn.query(sql, values);
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
