(function () {
  var C = window.FUNNEL_CONFIG;
  var $ = function (s) { return document.querySelector(s); };
  var fmt = function (n) { return '₪' + Math.round(n).toLocaleString('he-IL'); };

  // ---- מיתוג ----
  document.querySelectorAll('[data-brand-name]').forEach(function (e) { e.textContent = C.brandName; });
  document.querySelectorAll('[data-brand-tagline]').forEach(function (e) { e.textContent = C.brandTagline; });
  document.querySelectorAll('[data-site-link]').forEach(function (e) { e.href = C.siteUrl; });
  if (C.licenseNumber) $('#license').textContent = '· רישיון יועץ פנסיוני מס׳ ' + C.licenseNumber;
  $('#wa-float').href = Funnel.waLink('היי, הגעתי מהאתר ואשמח לבדיקת פנסיה');
  $('#wa-float').target = '_blank';

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
  var RET_AGE = 67, RATE = 0.04, TARGET_FEE_D = 1.5, CONVERSION = 200;
  function project(balance, monthly, years, feeB, feeD) {
    var r = (1 + RATE - feeB / 100);
    var m = Math.pow(r, 1 / 12) - 1;
    var dep = monthly * (1 - feeD / 100);
    var b = balance;
    for (var i = 0; i < years * 12; i++) b = b * (1 + m) + dep;
    return b;
  }
  var lastLoss = 0;
  function calc() {
    var age = +$('#c-age').value || 40;
    var years = Math.max(0, RET_AGE - age);
    var bal = +$('#c-balance').value || 0, dep = +$('#c-deposit').value || 0;
    var cur = project(bal, dep, years, +$('#c-feeB').value || 0, +$('#c-feeD').value || 0);
    var tgt = project(bal, dep, years, +$('#c-tB').value || 0, TARGET_FEE_D);
    lastLoss = Math.max(0, tgt - cur);
    $('#c-loss').textContent = fmt(lastLoss);
    $('#c-pension').textContent = fmt(lastLoss / CONVERSION) + ' לחודש';
  }
  var calcUsed = false;
  document.querySelectorAll('.calc input').forEach(function (i) {
    i.addEventListener('input', function () {
      calc();
      if (!calcUsed) { calcUsed = true; Funnel.track('ViewContent', { content_name: 'fee_calculator' }); }
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
      estimatedLoss: Math.round(lastLoss),
      page: location.href, ts: new Date().toISOString(),
    }, answers, Funnel.utm);

    var btn = $('#q-submit'); btn.disabled = true; btn.textContent = 'שולח...';
    Funnel.track('Lead', { content_name: answers.concern || 'quiz' });
    try { sessionStorage.setItem('funnel_lead', JSON.stringify({ name: name, concern: answers.concern })); } catch (x) {}

    var done = function () { location.href = 'thank-you.html'; };
    if (C.leadWebhookUrl) {
      fetch(C.leadWebhookUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(lead) })
        .then(done, done);
    } else {
      window.open(Funnel.waLink(
        'היי, אני ' + name + '. מילאתי את שאלון בדיקת הפנסיה:\n' +
        'מצב: ' + (answers.status || '-') + '\nגיל: ' + (answers.age || '-') +
        '\nמה לבדוק: ' + (answers.concern || '-') + '\nבדיקה אחרונה: ' + (answers.lastCheck || '-')
      ), '_blank');
      done();
    }

    function fail(m) { err.textContent = m; err.hidden = false; }
  });
})();
