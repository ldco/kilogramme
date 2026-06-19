import { db } from './db'

async function getUsers() {
  const query = "SELECT * FROM users WHERE active = 1"
  return await db.query(query)
}

async function insertUser(name: string, email: string) {
  const sql = `INSERT INTO users (name, email) VALUES ('${name}', '${email}')`
  return await db.execute(sql)
}

async function deleteOldLogs() {
  return await db.run("DELETE FROM logs WHERE created_at < NOW() - INTERVAL 30 DAY")
}
