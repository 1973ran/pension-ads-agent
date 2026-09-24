// הלוגיקה של הסוכן: היסטוריית שיחה לכל מספר, פקודות קצרות וקריאה ל-Claude.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";
const MAX_HISTORY_MESSAGES = 20;

const SYSTEM_PROMPT = `אתה סוכן שיווק דיגיטלי מומחה בתחום הפנסיוני בישראל, ועובד עבור יועץ פנסיוני.
אתה מדבר איתו דרך WhatsApp, ועוזר לו עם:
- כתיבת פוסטים לפייסבוק ואינסטגרם (חינוכי, טיפ מהיר, עידוד אינטראקציה, המלצת לקוח, ממומן, סטורי/ריל)
- ברייפים לקמפיינים ממומנים בפייסבוק (קהל, כותרות, טקסטים, CTA, תקציב, KPIs)
- ניתוח נתוני ביצועים והמלצות לשיפור
- רעיונות לתוכן ותכנון לוח פרסומים חודשי

כללים:
- כתוב תמיד בעברית, אלא אם ביקשו אחרת.
- זו שיחת WhatsApp: תשובות ממוקדות וקצרות יחסית. אל תשתמש בטבלאות או בכותרות Markdown (#).
  לעיצוב השתמש רק בתחביר של WhatsApp: *מודגש*, _נטוי_, ורשימות עם • או מספרים.
- פוסט לפרסום כתוב ישירות, בלי הקדמות, כדי שיהיה קל להעתיק אותו.
- הקפד על תוכן מקצועי ואמין: בלי הבטחות לתשואה ובלי ייעוץ השקעות אישי, בהתאם לרגולציה בישראל.
- אם חסר פרט חשוב (נושא, קהל יעד, תקציב), שאל שאלה קצרה אחת לפני שאתה כותב.`;

// פקודות קצרות: הופכות הודעה כמו "פוסט קרן השתלמות לעצמאים" לבקשה מפורטת.
const COMMANDS = {
  "פוסט": (arg) =>
    `כתוב פוסט לפייסבוק בנושא: ${arg || "נושא פנסיוני לבחירתך"}.
כלול פתיח מושך, גוף עם ערך אמיתי לקורא, קריאה לפעולה ברורה ו-2-3 אמוג'י. 80-150 מילים.
בסוף הוסף שורה של 5-7 האשטגים רלוונטיים.`,
  "קמפיין": (arg) =>
    `צור ברייף לקמפיין פייסבוק ממומן. פרטים: ${arg || "יעד: לידים לפגישת ייעוץ"}.
כלול: מטרה, הגדרת קהל, 3 כותרות, 2 גרסאות טקסט ראשי, CTA, אסטרטגיית תקציב ו-KPIs.`,
  "ניתוח": (arg) =>
    `נתח את נתוני הביצועים הבאים ותן 4-5 המלצות מעשיות לשיפור: ${arg || "(לא צוינו נתונים – בקש ממני אותם)"}`,
  "רעיונות": (arg) =>
    `תן 10 רעיונות לפוסטים${arg ? " בנושא " + arg : ""} לחודש הקרוב, כל רעיון בשורה אחת עם סוג הפוסט.`,
};

export const HELP_TEXT = `👋 *סוכן הפרסום הפנסיוני*
אפשר פשוט לכתוב לי חופשי, או להשתמש בפקודות:

• *פוסט* <נושא> – פוסט לפייסבוק
  לדוגמה: פוסט קרן השתלמות לעצמאים
• *קמפיין* <מטרה, תקציב, קהל> – ברייף לקמפיין ממומן
• *ניתוח* <נתונים> – המלצות לשיפור ביצועים
• *רעיונות* <נושא> – 10 רעיונות לתוכן
• *איפוס* – התחלת שיחה חדשה
• *עזרה* – התפריט הזה`;

const histories = new Map(); // phone -> [{role, content}]

export function resetHistory(phone) {
  histories.delete(phone);
}

// ממיר הודעה נכנסת לבקשה לסוכן, או מחזיר תשובה ישירה לפקודות מערכת.
export function parseIncoming(text) {
  const trimmed = text.trim();
  const [first, ...rest] = trimmed.split(/\s+/);
  const word = first.replace(/^\//, "");
  const arg = rest.join(" ");

  if (["עזרה", "help", "תפריט"].includes(word.toLowerCase()) && !arg) return { type: "help" };
  if (["איפוס", "reset"].includes(word.toLowerCase()) && !arg) return { type: "reset" };
  if (COMMANDS[word]) return { type: "prompt", prompt: COMMANDS[word](arg) };
  return { type: "prompt", prompt: trimmed };
}

let client;
function getClient() {
  client ??= new Anthropic();
  return client;
}

export async function askAgent(phone, prompt) {
  const history = histories.get(phone) || [];
  const messages = [...history, { role: "user", content: prompt }];

  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages,
    // אם מסווג הבטיחות דוחה בקשה, הרצה חוזרת אוטומטית על מודל חלופי מתאים
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  if (response.stop_reason === "refusal") {
    return "מצטער, לא אוכל לעזור בבקשה הזו. נסה לנסח אותה אחרת 🙏";
  }

  const reply = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!reply) return "לא התקבלה תשובה, נסה שוב.";

  // שומרים רק את הטקסט כדי שההיסטוריה תישאר קטנה, ומגבילים את אורכה
  const updated = [...messages, { role: "assistant", content: reply }];
  histories.set(phone, updated.slice(-MAX_HISTORY_MESSAGES));
  return reply;
}
