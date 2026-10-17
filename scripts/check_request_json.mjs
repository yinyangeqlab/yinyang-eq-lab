import assert from "node:assert/strict";
import { readJsonObject, RequestInputError } from "../lib/request-json.ts";

const json = (body, headers = {}) => new Request("https://example.test/api/targets", {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body,
});

assert.deepEqual(await readJsonObject(json('{"name":"valid"}'), 64), { name: "valid" });
await assert.rejects(readJsonObject(json(`{"name":"${"x".repeat(100)}"}`), 64), error => error instanceof RequestInputError && error.status === 413);
await assert.rejects(readJsonObject(json("[]"), 64), error => error instanceof RequestInputError && error.status === 400);
await assert.rejects(readJsonObject(json("{}", { "Content-Type": "text/plain" }), 64), error => error instanceof RequestInputError && error.status === 415);
console.log("Bounded JSON reader rejects oversized and malformed submissions.");
