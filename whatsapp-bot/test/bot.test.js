import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

process.env.WHATSAPP_VERIFY_TOKEN = "verify-me";
process.env.WHATSAPP_APP_SECRET = "app-secret";
const { server, isValidSignature, splitMessage } = await import("../server.js");
const { parseIncoming } = await import("../agent.js");

test("parseIncoming recognizes commands", () => {
  assert.equal(parseIncoming("עזרה").type, "help");
  assert.equal(parseIncoming("/איפוס").type, "reset");
  const post = parseIncoming("פוסט קרן השתלמות לעצמאים");
  assert.equal(post.type, "prompt");
  assert.match(post.prompt, /קרן השתלמות לעצמאים/);
  assert.equal(parseIncoming("מה שלומך?").prompt, "מה שלומך?");
});

test("splitMessage keeps parts under the limit", () => {
  const text = Array.from({ length: 300 }, (_, i) => `שורה מספר ${i}`).join("\n");
  const parts = splitMessage(text, 500);
  assert.ok(parts.length > 1);
  assert.ok(parts.every((p) => p.length <= 500));
  assert.equal(parts.join("\n"), text);
});

test("isValidSignature checks the HMAC", () => {
  const body = Buffer.from('{"a":1}');
  const sig = "sha256=" + crypto.createHmac("sha256", "app-secret").update(body).digest("hex");
  assert.ok(isValidSignature(body, sig, "app-secret"));
  assert.ok(!isValidSignature(body, sig, "other"));
  assert.ok(!isValidSignature(body, undefined, "app-secret"));
});

test("webhook verification and signature enforcement", async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  try {
    let res = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=123`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "123");

    res = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123`);
    assert.equal(res.status, 403);

    res = await fetch(`${base}/webhook`, { method: "POST", body: "{}" });
    assert.equal(res.status, 401);

    const body = JSON.stringify({ entry: [] });
    const sig = "sha256=" + crypto.createHmac("sha256", "app-secret").update(body).digest("hex");
    res = await fetch(`${base}/webhook`, { method: "POST", body, headers: { "x-hub-signature-256": sig } });
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});
