import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { verifyUserToken } from "../utils/signer";

test("verifyUserToken reports expired tokens clearly", () => {
  process.env.JWT_SECRET = "test-secret";
  const token = jwt.sign(
    { userId: "123", role: "user" },
    process.env.JWT_SECRET,
    { expiresIn: "-1s" },
  );

  assert.throws(
    () => verifyUserToken(token),
    (error: unknown) => {
      return error instanceof Error && error.message === "TOKEN_EXPIRED";
    },
  );
});
