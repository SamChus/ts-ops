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

  async resetPassword(
    email: string,
    newPassword: string,
  ): Promise<IUser | null> {
    const queryText = `
       UPDATE users
      SET password = $1
      WHERE email = $2
      RETURNING * 
    `;
    const result = await this.pool.query(queryText, [newPassword, email]);
    return result.rows[0] || null;
  }

  async verifyEmail(email: string, token: string) {
    const queryText = `
      UPDATE users 
      SET isVerified = true 
      WHERE email = $1
    `;

    const result = await this.pool.query(queryText, [email]);
    return result.rows[0] || null;
  }
}
