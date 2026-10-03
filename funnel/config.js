// ===== הגדרות המשפך – זה הקובץ היחיד שצריך לערוך =====
window.FUNNEL_CONFIG = {
  brandName: "רן מסיקה",
  brandTagline: "ייעוץ פנסיוני אישי ובלתי תלוי",
  siteUrl: "https://ranmessika.com/",

  // מספר וואטסאפ בפורמט בינלאומי, בלי + ובלי אפסים מובילים (לדוגמה 972501234567)
  whatsappNumber: "972500000000",
  phoneDisplay: "050-000-0000",

  // כתובת Webhook לקליטת לידים (Make / Zapier / Google Apps Script / CRM).
  // אם ריק – הליד יועבר ישירות לוואטסאפ.
  leadWebhookUrl: "",

  // קישור לקביעת פגישה (Calendly / Google Calendar booking). אם ריק – הכפתור יוסתר.
  bookingUrl: "",

  // Meta Pixel ID ו-Google Tag (GA4) – אופציונלי
  metaPixelId: "",
  ga4Id: "",

  // מספר רישיון יועץ פנסיוני (מוצג בתחתית העמוד)
  licenseNumber: "",

  // המלצות אמיתיות בלבד, באישור הלקוח. מערך ריק = הסקשן לא יוצג.
  testimonials: [
    // { name: "דנה, 42, תל אביב", text: "..." },
  ],
};
