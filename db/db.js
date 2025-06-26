import mysql from 'mysql2';
import dotenv from 'dotenv';


dotenv.config();

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, 
  queueLimit: 0
});

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err.message,err);
  } else {
    console.log("Connected to MySQL Database");
    connection.release(); 
  }
});
const db = pool.promise(); // Use promise-based queries
export default db;
