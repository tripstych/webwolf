import { query } from '../connection.js';

/**
 * Base repository with common database operations
 */
export class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Find record by ID
   */
  async findById(id) {
    const results = await query(
      `SELECT * FROM \`${this.tableName}\` WHERE id = ?`,
      [id]
    );
    return results[0] || null;
  }

  /**
   * Find all records with optional filters
   */
  async findAll(where = {}, limit = 50, offset = 0) {
    let sql = `SELECT * FROM \`${this.tableName}\``;
    const params = [];

    if (Object.keys(where).length > 0) {
      const conditions = Object.entries(where).map(([key, value]) => {
        if (value === null) {
          return `${key} IS NULL`;
        }
        params.push(value);
        return `${key} = ?`;
      });
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    return await query(sql, params);
  }

  /**
   * Count records with optional filters
   */
  async count(where = {}) {
    let sql = `SELECT COUNT(*) as count FROM \`${this.tableName}\``;
    const params = [];

    if (Object.keys(where).length > 0) {
      const conditions = Object.entries(where).map(([key, value]) => {
        if (value === null) {
          return `${key} IS NULL`;
        }
        params.push(value);
        return `${key} = ?`;
      });
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await query(sql, params);
    return result[0]?.count || 0;
  }

  /**
   * Create new record
   */
  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');

    const result = await query(
      `INSERT INTO \`${this.tableName}\` (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );

    return result.insertId;
  }

  /**
   * Update record by ID
   */
  async update(id, data) {
    const sets = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];

    await query(
      `UPDATE \`${this.tableName}\` SET ${sets} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Delete record by ID
   */
  async delete(id) {
    await query(`DELETE FROM \`${this.tableName}\` WHERE id = ?`, [id]);
    return true;
  }

  /**
   * Raw query - for complex queries
   */
  async rawQuery(sql, params = []) {
    return await query(sql, params);
  }
}

export default BaseRepository;
