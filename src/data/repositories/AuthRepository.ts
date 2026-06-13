import { Pool } from "pg";
import BaseRepository from "./BaseRepository";
import { IUser } from "./repository";

export class AuthRepository extends BaseRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    const queryText = `
      SELECT id, name, email, password, role 
      FROM users 
      WHERE email = $1
    `;
    const result = await this.pool.query(queryText, [email]);
    return result.rows[0] || null;
  }
}
