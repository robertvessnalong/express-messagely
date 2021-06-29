/** User class for message.ly */
const bcrypt = require('bcrypt');
const ExpressError = require('../expressError');
const db = require('../db');
const { BCRYPT_WORK_FACTOR, SECRET_KEY } = require('../config');
const jwt = require('jsonwebtoken');

/** User of the site. */

class User {
  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hPass = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const result = await db.query(
      `
    INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
    VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
    RETURNING username, password, first_name, last_name, phone
    `,
      [username, hPass, first_name, last_name, phone]
    );
    return result.rows[0];
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      'SELECT password FROM users WHERE username = $1',
      [username]
    );
    let user = result.rows[0];

    if (await bcrypt.compare(password, user.password)) {
      return user;
    }
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(
      `UPDATE users
       SET last_login_at = current_timestamp
       WHERE username = $1
       RETURNING username
      `,
      [username]
    );
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const results = await db.query(`
      SELECT username, first_name, last_name, phone FROM users
    `);

    return results.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `
  SELECT username, first_name, last_name, phone, join_at, last_login_at 
  FROM users 
  WHERE username = $1`,
      [username]
    );
    return result.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const result = await db.query(
      `
    SELECT m.id, m.to_username, m.body, m.sent_at, m.read_at, u.first_name, u.last_name, u.phone 
    FROM messages AS m
    JOIN users AS u ON m.to_username = u.username 
    WHERE from_username = $1
    `,
      [username]
    );

    const value = result.rows.map((m) => ({
      id: m.id,
      to_user: {
        username: m.to_username,
        first_name: m.first_name,
        last_name: m.last_name,
        phone: m.phone,
      },
      body: m.body,
      sent_at: m.sent_at,
      read_at: m.read_at,
    }));

    return value;
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const result = await db.query(
      `SELECT m.id, m.from_username, m.body, m.sent_at, m.read_at, u.first_name, u.last_name, u.phone
       FROM messages AS m
       JOIN users AS u ON m.from_username = u.username
       WHERE to_username = $1
      `,
      [username]
    );

    const value = result.rows.map((m) => ({
      id: m.id,
      from_user: {
        username: m.from_username,
        first_name: m.first_name,
        last_name: m.last_name,
        phone: m.phone,
      },
      body: m.body,
      sent_at: m.sent_at,
      read_at: m.read_at,
    }));

    return value;
  }
}

module.exports = User;
