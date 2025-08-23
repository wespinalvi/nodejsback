// config/database.js
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "mysql-mipaginawebsite.alwaysdata.net",
  user: process.env.DB_USER || "427655",
  password: process.env.DB_PASSWORD || "i2321108@continental.sa",
  database: process.env.DB_NAME || "mipaginawebsite_nodejs",
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
