import { Request } from "express";

export function getPaginationParameters(req: Request) {
  const page = parseInt(req.query.page as string, 10);
  const perPage =
    parseInt(req.query.perPage as string, 10) ||
    parseInt(req.query.limit as string, 10);

  const validPage = isNaN(page) || page < 0 ? 1 : page;
  const validPerPage =
    isNaN(perPage) || perPage < 0
      ? Number(process.env.DEFAULT_PER_PAGE)
      : perPage;

  const limit = validPerPage;
  const offset = (validPage - 1) * validPerPage;

  return {
    page: validPage,
    perPage: validPerPage,
    limit,
    offset,
  };
}
