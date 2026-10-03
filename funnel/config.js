// ===== הגדרות המשפך – זה הקובץ היחיד שצריך לערוך =====
window.FUNNEL_CONFIG = {
  brandName: "רן פיננסים",
  brandTagline: "שיפור כלכלי למשפחות ולעסקים",
  siteUrl: "https://ranmessika.com/",

  // מספר וואטסאפ בפורמט בינלאומי, בלי + ובלי אפסים מובילים (לדוגמה 972501234567)
  whatsappNumber: "972525949449",
  phoneDisplay: "052-594-9449",

  // חיבור ל-CRM של רן פיננסים (Firebase). להעתיק מתוך firebaseConfig: projectId ו-apiKey.
  // כשמוגדר, כל ליד נכנס אוטומטית ל-CRM כלקוח בסטטוס "מעקב" + משימה להתקשר.
  firebaseProjectId: "",
  firebaseApiKey: "",

  // כתובת Webhook לקליטת לידים (Make / Zapier / Google Apps Script / CRM).
  // אם גם ה-CRM וגם ה-Webhook ריקים – הליד יועבר ישירות לוואטסאפ.
  leadWebhookUrl: "",

  // קישור לקביעת פגישה (Calendly / Google Calendar booking). אם ריק – הכפתור יוסתר.
  bookingUrl: "",

  // Meta Pixel ID ו-Google Tag (GA4) – אופציונלי
  metaPixelId: "",
  ga4Id: "",

  // רישיון / הסמכה מקצועית להצגה בתחתית העמוד, כולל סוג הרישיון (לדוגמה: "יועץ כלכלי מוסמך, מס׳ 123"). ריק = לא מוצג
  licenseNumber: "",

  // המלצות אמיתיות בלבד, באישור הלקוח. מערך ריק = הסקשן לא יוצג.
  testimonials: [
    // { name: "דנה, 42, תל אביב", text: "..." },
  ],
};
