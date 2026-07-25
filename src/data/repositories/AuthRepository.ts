import BaseRepository, { Constructor } from "./BaseRepository";
import { IUser } from "./repository";

export function AuthRepository<TBase extends Constructor<BaseRepository>>(
  Base: TBase,
) {
  return class AuthMixin extends Base {
    async findByEmailWithPassword(email: string): Promise<IUser | null> {
      const result = await this.pool.query(
        `SELECT id, name, email, password, role 
         FROM users 
         WHERE email = $1`,
        [email],
      );
      return result.rows[0] || null;
    }

    async resetPassword(
      email: string,
      newPassword: string,
    ): Promise<IUser | null> {
      const result = await this.pool.query(
        `UPDATE users SET password = $1 WHERE email = $2 RETURNING *`,
        [newPassword, email],
      );
      return result.rows[0] || null;
    }

    async verifyEmail(email: string): Promise<IUser | null> {
      const result = await this.pool.query(
        `UPDATE users SET is_verified = true WHERE email = $1 RETURNING *`,
        [email],
      );
      return result.rows[0] || null;
    }
  };
}
