import { Request } from "express";

/**
 * Extracts LIMIT/OFFSET pagination parameters from a request.
 * Used by routes that haven't migrated to cursor pagination yet.
 *
 * @deprecated  Prefer getCursorParameters() for new endpoints.
 */
export function getPaginationParameters(req: Request) {
  const page = parseInt(req.query.page as string, 10);
  const perPage =
    parseInt(req.query.perPage as string, 10) ||
    parseInt(req.query.limit as string, 10);

  const validPage = isNaN(page) || page < 0 ? 1 : page;
  const validPerPage =
    isNaN(perPage) || perPage <= 0
      ? Number(process.env.DEFAULT_PER_PAGE) || 10
      : perPage;

  return {
    page: validPage,
    perPage: validPerPage,
    limit: validPerPage,
    offset: (validPage - 1) * validPerPage,
  };
}

/**
 * Extracts cursor-based pagination parameters from a request.
 *
 * Query parameters:
 *   ?limit=10            → number of items per page (default 10, max 100)
 *   ?nextCursor=<token>  → opaque token to fetch the NEXT page
 *   ?prevCursor=<token>  → opaque token to fetch the PREVIOUS page
 *
 * Usage in a controller:
 *
 *   const { limit, nextCursor, prevCursor } = getCursorParameters(req);
 *   const page = await service.getAllApartments({ limit, nextCursor, prevCursor });
 *   res.json(page); // returns { data: [...], pagination: { nextCursor, prevCursor, ... } }
 *
 * Client flow:
 *   1. GET /apartments?limit=5
 *      ← receives { data: [...5 items], pagination: { nextCursor: "abc123", ... } }
 *   2. GET /apartments?limit=5&nextCursor=abc123
 *      ← receives the next 5 items
 *   3. GET /apartments?limit=5&prevCursor=abc123
 *      ← receives the previous 5 items (going back)
 */
export function getCursorParameters(req: Request) {
  const rawLimit = parseInt(req.query.limit as string, 10);
  const limit =
    isNaN(rawLimit) || rawLimit <= 0
      ? Number(process.env.DEFAULT_PER_PAGE) || 10
      : Math.min(rawLimit, 100); // cap at 100 to protect the DB

  // These are opaque tokens — pass them straight through, no parsing
  const nextCursor = (req.query.nextCursor as string) || undefined;
  const prevCursor = (req.query.prevCursor as string) || undefined;

  return { limit, nextCursor, prevCursor };
}
