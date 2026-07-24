import { Pool } from "pg";
import type { ICursorPage } from "./repository";

/**
 * Encodes a value (ISO timestamp or string ID) into a simple Base64 cursor string.
 */
export function encodeCursor(value: string | Date): string {
  const str = value instanceof Date ? value.toISOString() : String(value);
  return Buffer.from(str).toString("base64");
}

/**
 * Decodes a Base64 cursor string back to the original string value.
 */
export function decodeCursor(token: string): string | null {
  try {
    return Buffer.from(token, "base64").toString("utf8");
  } catch {
    return null;
  }
}

export default class BaseRepository {
  protected readonly defaultLimit = 10;
  protected pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  getPool(): Pool {
    return this.pool;
  }

  /**
   * Simple Cursor-based Pagination
   *
   * 1. Decodes incoming nextCursor (e.g. timestamp of last seen item)
   * 2. Runs: SELECT ... WHERE created_at < $cursor ORDER BY created_at DESC LIMIT limit + 1
   * 3. Uses the extra (limit + 1) item as a sentinel to build the nextCursor
   */
  protected async paginateCursor<T extends object>(opts: {
    table: string;
    sortCol?: string | undefined;
    idCol?: string | undefined;
    selectCols?: string | undefined;
    extraWhere?: string | undefined;
    params?: unknown[] | undefined;
    limit?: number | undefined;
    nextCursor?: string | undefined;
    prevCursor?: string | undefined;
  }): Promise<ICursorPage<T>> {
    const {
      table,
      sortCol = "created_at",
      selectCols = "*",
      extraWhere,
      params = [],
      nextCursor,
    } = opts;

    const limit = Math.min(opts.limit ?? this.defaultLimit, 100);
    const cursorValue = nextCursor ? decodeCursor(nextCursor) : null;

    const bindParams: unknown[] = [...params];
    const whereParts: string[] = [];

    if (extraWhere) {
      whereParts.push(extraWhere);
    }

    if (cursorValue) {
      bindParams.push(cursorValue);
      whereParts.push(`${sortCol} < $${bindParams.length}`);
    }

    const whereClause =
      whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    bindParams.push(limit + 1);
    const sql = `
      SELECT ${selectCols}
      FROM ${table}
      ${whereClause}
      ORDER BY ${sortCol} DESC
      LIMIT $${bindParams.length}
    `;

    const result = await this.pool.query<T>(sql, bindParams);
    const rows = result.rows;

    const hasNextPage = rows.length > limit;
    if (hasNextPage) {
      rows.pop();
    }

    const lastRow = rows[rows.length - 1] as Record<string, any> | undefined;
    const newNextCursor =
      hasNextPage && lastRow
        ? encodeCursor(lastRow[sortCol] ?? lastRow.id)
        : null;

    return {
      data: rows,
      pagination: {
        nextCursor: newNextCursor,
        prevCursor: null,
        hasNextPage,
        hasPrevPage: !!nextCursor,
        limit,
      },
    };
  }
}

export type Constructor<T = {}> = new (...args: any[]) => T;
