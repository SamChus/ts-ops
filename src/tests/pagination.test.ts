import test from "node:test";
import assert from "node:assert/strict";
import { Request } from "express";
import { getPaginationParameters } from "../utils/pagination";

test("getPaginationParameters parses valid page and limit", () => {
  const req = {
    query: {
      page: "2",
      limit: "5",
    },
  } as unknown as Request;

  const params = getPaginationParameters(req);

  assert.deepEqual(params, {
    page: 2,
    perPage: 5,
    limit: 5,
    offset: 5,
  });
});

test("getPaginationParameters falls back on negative or zero pages", () => {
  const req0 = {
    query: {
      page: "0",
      limit: "10",
    },
  } as unknown as Request;

  const params0 = getPaginationParameters(req0);

  assert.deepEqual(params0, {
    page: 1,
    perPage: 10,
    limit: 10,
    offset: 0,
  });

  const reqNeg = {
    query: {
      page: "-5",
      limit: "10",
    },
  } as unknown as Request;

  const paramsNeg = getPaginationParameters(reqNeg);

  assert.deepEqual(paramsNeg, {
    page: 1,
    perPage: 10,
    limit: 10,
    offset: 0,
  });
});

test("getPaginationParameters handles invalid numeric strings gracefully", () => {
  const reqInvalid = {
    query: {
      page: "abc",
      limit: "xyz",
    },
  } as unknown as Request;

  const paramsInvalid = getPaginationParameters(reqInvalid);

  assert.equal(paramsInvalid.page, 1);
  assert.equal(paramsInvalid.perPage, 10); // default per page
  assert.equal(paramsInvalid.offset, 0);
});
