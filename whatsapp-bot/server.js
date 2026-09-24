// שרת Webhook ל-WhatsApp Cloud API: מקבל הודעות, מעביר לסוכן ומחזיר תשובה.
import http from "node:http";
import crypto from "node:crypto";
import { parseIncoming, askAgent, resetHistory, HELP_TEXT } from "./agent.js";

const {
  PORT = 3000,
  WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_APP_SECRET,
  ALLOWED_NUMBERS = "",
  GRAPH_API_VERSION = "v25.0",
} = process.env;

// רק המספרים האלה יכולים לדבר עם הסוכן (פורמט 972501234567, מופרדים בפסיקים)
const allowed = new Set(ALLOWED_NUMBERS.split(",").map((n) => n.trim()).filter(Boolean));
const WHATSAPP_MAX_CHARS = 4096;
const seenMessageIds = new Set();

export function isValidSignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  );
}

export function splitMessage(text, max = WHATSAPP_MAX_CHARS) {
  const parts = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max / 2) cut = rest.lastIndexOf(" ", max);
    if (cut < max / 2) cut = max;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

async function graphRequest(body) {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    },
  );
  if (!res.ok) console.error("WhatsApp API error", res.status, await res.text());
}

async function sendText(to, text) {
  for (const part of splitMessage(text)) {
    await graphRequest({ to, type: "text", text: { body: part } });
  }
}

// מסמן את ההודעה כנקראה ומציג "מקליד..." בזמן שהסוכן עובד
function markReadWithTyping(messageId) {
  return graphRequest({
    status: "read",
    message_id: messageId,
    typing_indicator: { type: "text" },
  });
}

async function handleMessage(msg) {
  if (seenMessageIds.has(msg.id)) return; // Meta שולחת לפעמים את אותה הודעה שוב
  seenMessageIds.add(msg.id);
  if (seenMessageIds.size > 1000) seenMessageIds.delete(seenMessageIds.values().next().value);

  const from = msg.from;
  if (!allowed.has(from)) {
    console.warn(`Ignoring message from unauthorized number ${from}`);
    return;
  }

  if (msg.type !== "text") {
    await sendText(from, "כרגע אני מבין רק הודעות טקסט ✍️");
    return;
  }

  const parsed = parseIncoming(msg.text.body);
  if (parsed.type === "help") return sendText(from, HELP_TEXT);
  if (parsed.type === "reset") {
    resetHistory(from);
    return sendText(from, "🧹 השיחה אופסה. על מה נעבוד?");
  }

  await markReadWithTyping(msg.id);
  try {
    const reply = await askAgent(from, parsed.prompt);
    await sendText(from, reply);
  } catch (err) {
    console.error("Agent error", err);
    await sendText(from, "❌ הייתה תקלה ביצירת התשובה, נסה שוב בעוד רגע.");
  }
}

function handleWebhookEvent(payload) {
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;
      for (const msg of change.value?.messages || []) {
        handleMessage(msg).catch((err) => console.error("Failed handling message", err));
      }
    }
  }
}

export const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/health") {
    res.writeHead(200).end("ok");
    return;
  }

  if (url.pathname !== "/webhook") {
    res.writeHead(404).end();
    return;
  }

  // אימות ה-Webhook מול Meta (פעם אחת, בזמן ההגדרה)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && WHATSAPP_VERIFY_TOKEN && token === WHATSAPP_VERIFY_TOKEN) {
      res.writeHead(200, { "Content-Type": "text/plain" }).end(challenge);
    } else {
      res.writeHead(403).end();
    }
    return;
  }

  if (req.method === "POST") {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const rawBody = Buffer.concat(chunks);
      if (!isValidSignature(rawBody, req.headers["x-hub-signature-256"], WHATSAPP_APP_SECRET)) {
        res.writeHead(401).end();
        return;
      }
      // עונים מיד ל-Meta, ומטפלים בהודעה ברקע
      res.writeHead(200).end();
      try {
        handleWebhookEvent(JSON.parse(rawBody.toString("utf8")));
      } catch (err) {
        console.error("Invalid webhook payload", err);
      }
    });
    return;
  }

  res.writeHead(405).end();
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const missing = ["ANTHROPIC_API_KEY", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_VERIFY_TOKEN", "WHATSAPP_APP_SECRET", "ALLOWED_NUMBERS"].filter((k) => !process.env[k]);
  if (missing.length) console.warn(`⚠️  Missing environment variables: ${missing.join(", ")}`);
  server.listen(PORT, () => console.log(`WhatsApp bot listening on port ${PORT} (POST /webhook)`));
}
