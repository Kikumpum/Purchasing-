import assert from "node:assert/strict";
import { test } from "node:test";
import { warehouseRequestSchema } from "../src/features/warehouse-account/request";

test("normalizes a warehouse request and discards any client-supplied role or assignment", () => {
  const parsed = warehouseRequestSchema.parse({
    name: "  Petugas Uji  ",
    email: "  TEST@EXAMPLE.COM  ",
    role: "admin_procurement",
    warehouseId: "example-warehouse",
  });
  assert.deepEqual(parsed, { name: "Petugas Uji", email: "test@example.com" });
});

test("rejects blank names, control characters, and malformed email", () => {
  for (const data of [
    { name: "  ", email: "test@example.com" },
    { name: "Uji\nGudang", email: "test@example.com" },
    { name: "Petugas Uji", email: "example.com" },
  ]) {
    assert.equal(warehouseRequestSchema.safeParse(data).success, false);
  }
});
