// config/database.js
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "db_crayons",
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

const promisePool = pool.promise();

async function withTransaction(callback) {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool: promisePool,
  withTransaction,
  getConnection: () => promisePool.getConnection(),
};
