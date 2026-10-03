// טעינת פיקסלים, שמירת UTM ואירועי מעקב משותפים לכל עמודי המשפך
(function () {
  var C = window.FUNNEL_CONFIG || {};

  if (C.metaPixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', C.metaPixelId);
    fbq('track', 'PageView');
  }

  if (C.ga4Id) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + C.ga4Id;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', C.ga4Id);
  }

  // שמירת פרמטרי UTM לאורך המשפך
  var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
  var params = new URLSearchParams(location.search);
  var stored = {};
  try { stored = JSON.parse(sessionStorage.getItem('funnel_utm') || '{}'); } catch (e) {}
  keys.forEach(function (k) { if (params.get(k)) stored[k] = params.get(k); });
  try { sessionStorage.setItem('funnel_utm', JSON.stringify(stored)); } catch (e) {}

  window.Funnel = {
    utm: stored,
    track: function (event, data) {
      if (window.fbq) fbq('track', event, data || {});
      if (window.gtag) gtag('event', event, data || {});
    },
    waLink: function (text) {
      return 'https://wa.me/' + C.whatsappNumber + '?text=' + encodeURIComponent(text);
    },
  };
})();
