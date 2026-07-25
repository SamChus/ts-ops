import BaseRepository, { Constructor } from "./BaseRepository";
import { IReview, IReviewRepository } from "./repository";

export function ReviewRepository<TBase extends Constructor<BaseRepository>>(
  Base: TBase,
) {
  return class ReviewMixin extends Base implements IReviewRepository {
    async createReview(review: IReview): Promise<IReview> {
      const result = await this.pool.query(
        `INSERT INTO reviews (booking_id, guest_id, apartment_id, rating, comment) 
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          review.booking_id,
          review.guest_id,
          review.apartment_id,
          review.rating,
          review.comment,
        ],
      );
      return result.rows[0];
    }

    async getReviewsByApartment(apartmentId: string): Promise<IReview[]> {
      const result = await this.pool.query(
        `SELECT r.*, u.name as reviewer_name 
         FROM reviews r
         JOIN users u ON r.guest_id = u.id
         WHERE r.apartment_id = $1
         ORDER BY r.created_at DESC`,
        [apartmentId],
      );
      return result.rows;
    }

    async getAverageRating(apartmentId: string): Promise<number> {
      const result = await this.pool.query(
        "SELECT AVG(rating) FROM reviews WHERE apartment_id = $1",
        [apartmentId],
      );
      return parseFloat(result.rows[0].avg) || 0;
    }

    async getReviewById(id: string): Promise<IReview | null> {
      const result = await this.pool.query(
        "SELECT * FROM reviews WHERE id = $1",
        [id],
      );
      return result.rows[0] || null;
    }

    async updateReview(
      id: string,
      review: Partial<IReview>,
    ): Promise<IReview | null> {
      const fields = Object.keys(review);
      if (fields.length === 0) return this.getReviewById(id);

      const setClause = fields
        .map((field, i) => `${field} = $${i + 2}`)
        .join(", ");

      const result = await this.pool.query(
        `UPDATE reviews SET ${setClause} WHERE id = $1 RETURNING *`,
        [id, ...Object.values(review)],
      );
      return result.rows[0] || null;
    }

    async deleteReview(id: string): Promise<IReview> {
      const result = await this.pool.query(
        "DELETE FROM reviews WHERE id = $1 RETURNING *",
        [id],
      );
      return result.rows[0] || null;
    }

    async getAllReviews(): Promise<IReview[]> {
      const result = await this.pool.query(
        "SELECT * FROM reviews ORDER BY created_at DESC",
      );
      return result.rows;
    }
  };
}
