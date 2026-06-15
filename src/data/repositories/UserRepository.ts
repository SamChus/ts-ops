import { Pool } from "pg";
import BaseRepository from "./BaseRepository";
import {
  IUser,
  IUserRepository,
  IUserQueryResult,
  IUserQuery,
} from "./repository";

export class UserRepository extends BaseRepository implements IUserRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  async createUser(user: IUser): Promise<IUser> {
    const queryText = `
      INSERT INTO users (name, email, password, role, phone) 
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, phone, created_at, updated_at
    `;
    const values = [
      user.name,
      user.email,
      user.password,
      user.role,
      user.phone,
    ];
    const result = await this.pool.query(queryText, values);
    return result.rows[0];
  }

  async getUserById(id: string): Promise<IUser | null> {
    const result = await this.pool.query(
      "SELECT id, name, email, role, phone, created_at FROM users WHERE id = $1",
      [id],
    );
    return result.rows[0] || null;
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );
    return result.rows[0] || null;
  }

  async updateUser(id: string, user: Partial<IUser>): Promise<IUser | null> {
    const fields = Object.keys(user);
    if (fields.length === 0) return null;

    const setClause = fields
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");
    const values = [...Object.values(user), id];

    const queryText = `
      UPDATE users 
      SET ${setClause}, updated_at = NOW() 
      WHERE id = $${values.length} 
      RETURNING id, name, email, role, phone, is_verified, profile_image_url, updated_at
    `;
    const result = await this.pool.query(queryText, values);
    return result.rows[0] || null;
  }

  async deleteUser(id: string): Promise<void> {
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }

  async getAllUsers(query: IUserQuery): Promise<IUserQueryResult> {
    const limit = query.limit || this.defaultLimit;
    const offset = query.offset || this.defaultOffset;

    const dataQuery = `
      SELECT * FROM users 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2;
    `;

    const countQuery = "SELECT COUNT(*) FROM users;";

    const [dataRes, countRes] = await Promise.all([
      this.pool.query(dataQuery, [limit, offset]),
      this.pool.query(countQuery),
    ]);

    return {
      users: dataRes.rows,
      totalCount: parseInt(countRes.rows[0].count, 10),
    };
  }

  async updateImage(userId: string, imageUrl: string): Promise<IUser | null> {
    const queryText = `
      UPDATE users
      SET profile_image_url = $1
      WHERE id = $2
      RETURNING id, name, email, role, phone, profile_image_url, created_at, updated_at
    `;

    try {
      const result = await this.pool.query(queryText, [imageUrl, userId]);
      return result.rows[0] || null;
    } catch (error) {
      const msg = (error as any)?.message || "";
      if (
        msg.includes('column "profile_image_url"') ||
        msg.includes("does not exist")
      ) {
        try {
          await this.pool.query(
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(512)`,
          );
          const retry = await this.pool.query(queryText, [imageUrl, userId]);
          return retry.rows[0] || null;
        } catch (innerErr) {
          throw innerErr;
        }
      }
      throw error;
    }
  }
}
