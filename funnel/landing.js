(function () {
  var C = window.FUNNEL_CONFIG;
  var $ = function (s) { return document.querySelector(s); };
  var fmt = function (n) { return '₪' + Math.round(n).toLocaleString('he-IL'); };

  // ---- מיתוג ----
  document.querySelectorAll('[data-brand-name]').forEach(function (e) { e.textContent = C.brandName; });
  document.querySelectorAll('[data-brand-tagline]').forEach(function (e) { e.textContent = C.brandTagline; });
  document.querySelectorAll('[data-site-link]').forEach(function (e) { e.href = C.siteUrl; });
  if (C.licenseNumber) $('#license').textContent = '· ' + C.licenseNumber;
  $('#wa-float').href = Funnel.waLink('היי, הגעתי מהאתר ואשמח לבדיקת שיפור כלכלי');
  $('#wa-float').target = '_blank';
  $('#phone-link').textContent = C.phoneDisplay;
  $('#phone-link').href = 'tel:' + C.phoneDisplay.replace(/-/g, '');

  if (C.testimonials && C.testimonials.length) {
    $('#testimonials').hidden = false;
    C.testimonials.forEach(function (t) {
      var d = document.createElement('div');
      d.className = 'tile quote';
      var p = document.createElement('p'); p.textContent = '"' + t.text + '"';
      var b = document.createElement('b'); b.textContent = t.name;
      d.append(p, b);
      $('#t-list').appendChild(d);
    });
  }

  // ---- מחשבון ----
  // הנחות שמרניות (מוצגות למשתמש מתחת למחשבון)
  var LOAN_CUT = 1.5, TARGET_FEE = 0.3, FIXED_CUT = 0.10, OD_RATE = 0.12;
  var lastSaving = 0;
  function calc() {
    var v = function (id) { return Math.max(0, +$(id).value || 0); };
    var loans = v('#c-loans') * Math.min(LOAN_CUT, v('#c-rate')) / 100;
    var fees = v('#c-savings') * Math.max(0, v('#c-fee') - TARGET_FEE) / 100;
    var fixed = v('#c-fixed') * 12 * FIXED_CUT;
    var od = v('#c-od') * OD_RATE;
    lastSaving = loans + fees + fixed + od;
    $('#c-year').textContent = fmt(lastSaving);
    $('#c-ten').textContent = fmt(lastSaving * 10);
  }
  var calcUsed = false;
  document.querySelectorAll('.calc input').forEach(function (i) {
    i.addEventListener('input', function () {
      calc();
      if (!calcUsed) { calcUsed = true; Funnel.track('ViewContent', { content_name: 'savings_calculator' }); }
    });
  });
  calc();

  // ---- שאלון רב-שלבי ----
  var answers = {}, step = 1, TOTAL = 5;
  function show(n) {
    step = n;
    document.querySelectorAll('.q-step').forEach(function (f) { f.classList.toggle('active', +f.dataset.step === n); });
    $('#q-bar').style.width = (n / TOTAL * 100) + '%';
    $('#q-back').hidden = n === 1;
    if (n === 2) Funnel.track('InitiateCheckout', { content_name: 'quiz_start' });
  }
  document.querySelectorAll('.opts').forEach(function (g) {
    g.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      answers[g.dataset.name] = b.dataset.v;
      g.querySelectorAll('button').forEach(function (x) { x.classList.toggle('sel', x === b); });
      setTimeout(function () { show(step + 1); }, 180);
    });
  });
  $('#q-back').addEventListener('click', function () { show(Math.max(1, step - 1)); });

  $('#q-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, err = $('#q-err');
    var name = f.name.value.trim(), phone = f.phone.value.replace(/[^\d+]/g, '');
    if (name.length < 2) return fail('נא להזין שם');
    if (!/^(\+972|0)5\d{8}$/.test(phone)) return fail('נא להזין מספר נייד תקין');
    if (!f.consent.checked) return fail('נא לאשר יצירת קשר');
    err.hidden = true;

    var lead = Object.assign({
      name: name, phone: phone,
      estimatedYearlySaving: Math.round(lastSaving),
      page: location.href, ts: new Date().toISOString(),
    }, answers, Funnel.utm);

    var btn = $('#q-submit'); btn.disabled = true; btn.textContent = 'שולח...';
    Funnel.track('Lead', { content_name: answers.concern || 'quiz' });
    try { sessionStorage.setItem('funnel_lead', JSON.stringify({ name: name, concern: answers.concern })); } catch (x) {}

    var done = function () { location.href = 'thank-you.html'; };
    var waUrl = Funnel.waLink(
      'היי, אני ' + name + '. מילאתי את שאלון השיפור הכלכלי:\n' +
      'מצב תעסוקתי: ' + (answers.status || '-') + '\nמה לשפר: ' + (answers.concern || '-') +
      '\nסוף החודש: ' + (answers.monthEnd || '-') + '\nהלוואות: ' + (answers.loans || '-'));
    var sends = [];
    if (C.firebaseProjectId && C.firebaseApiKey) sends.push(sendToCrm(lead));
    if (C.leadWebhookUrl) {
      sends.push(fetch(C.leadWebhookUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(lead) }));
    }
    if (!sends.length) { window.open(waUrl, '_blank'); return done(); }
    // אם השמירה נכשלה, לא מאבדים את הליד: הדף עובר לוואטסאפ (חלון קופץ אחרי המתנה נחסם בדפדפן)
    Promise.all(sends).then(done, function () { location.href = waUrl; });

    function fail(m) { err.textContent = m; err.hidden = false; }
  });

  // כתיבת הליד לאוסף leads ב-Firestore (דרך REST, בלי SDK). ה-CRM מושך משם את הלידים.
  function sendToCrm(lead) {
    var fields = {};
    Object.keys(lead).forEach(function (k) {
      if (lead[k] !== undefined && lead[k] !== '') fields[k] = { stringValue: String(lead[k]).slice(0, 500) };
    });
    var url = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(C.firebaseProjectId) +
      '/databases/(default)/documents/leads?key=' + encodeURIComponent(C.firebaseApiKey);
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: fields }) })
      .then(function (r) { if (!r.ok) throw new Error('crm ' + r.status); });
  }
})();
