import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "../lib/sqlite.ts";

test("Empty independent databases, durable writes, atomic rollback and foreign keys", async () => {
  const first = mkdtempSync(join(tmpdir(), "katsotaan-db-test-"));
  const second = mkdtempSync(join(tmpdir(), "katsotaan-db-test-"));
  let a, b;
  try {
    a = new Database(first); b = new Database(second);
    assert.equal((await a.prepare("SELECT COUNT(*) AS n FROM titles").first()).n, 0);
    await a.prepare("INSERT INTO services VALUES (?,?,?)").bind("netflix", 1, 1).run();
    a.close(); a = new Database(first);
    assert.equal((await a.prepare("SELECT enabled FROM services WHERE id=?").bind("netflix").first()).enabled, 1);
    assert.equal((await b.prepare("SELECT COUNT(*) AS n FROM services").first()).n, 0);
    await assert.rejects(a.batch([
      a.prepare("INSERT INTO services VALUES ('cineast',1,1)"),
      a.prepare("INSERT INTO services VALUES ('netflix',1,1)"),
    ]));
    assert.equal(await a.prepare("SELECT * FROM services WHERE id='cineast'").first(), null);
    await assert.rejects(a.prepare("INSERT INTO ratings VALUES ('movie:1','person1',4,1)").run());
  } finally { a?.close(); b?.close(); rmSync(first, { recursive: true }); rmSync(second, { recursive: true }); }
});
