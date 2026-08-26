/* =============================================================================
   Smart Education — Bengali (বাংলা) & Hindi (हिन्दी) via Google Translate.

   No account, no API key, no cost. This loads Google's free page-translate
   widget, hides Google's own toolbar, and drives it with a small on-brand
   "EN / বাংলা / हिन्दी" switch (bottom-left). The choice is remembered site-wide.

   Notes / honesty:
   - This uses Google's built-in website translate widget. It is a legacy,
     unofficial Google service (great because it is free and needs no setup,
     but Google could change or retire it someday).
   - Translation quality is machine translation. For the most natural Bengali,
     a human pass (e.g. your Bengali teacher) on a hand-made page is better;
     this option is the free, zero-maintenance route.
   - Text is sent to Google to translate, same as any online translator.
   ========================================================================== */
(function () {
  'use strict';

  var COOKIE = 'googtrans';

  injectStyles();
  applyScript();
  ready(injectHiddenEl);

  // Google calls this once its script loads.
  window.googleTranslateElementInit = function () {
    try {
      /* global google */
      new google.translate.TranslateElement(
        { pageLanguage: 'en', includedLanguages: 'en,bn,hi', autoDisplay: false },
        'google_translate_element'
      );
    } catch (e) {}
  };
  loadGoogle();
  ready(buildSwitcher);

  function loadGoogle() {
    if (document.querySelector('script[data-gtranslate]')) return;
    var s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    s.setAttribute('data-gtranslate', '');
    s.onerror = function () { console.warn('[Translate] Google Translate could not load.'); };
    document.head.appendChild(s);
  }

  function ready(fn) {
    if (document.body) fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function injectHiddenEl() {
    if (document.getElementById('google_translate_element')) return;
    var d = document.createElement('div');
    d.id = 'google_translate_element';
    d.setAttribute('aria-hidden', 'true');
    document.body.appendChild(d);
  }

  /* ---- language state via the googtrans cookie (what Google reads) ---- */
  function getCookie(n) {
    var m = document.cookie.match('(?:^|; )' + n + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : '';
  }
  function current() {
    var m = getCookie(COOKIE).match(/\/en\/(\w+)$/);
    return m ? m[1] : 'en';
  }

  function domainsToSet() {
    var out = [''];
    var h = location.hostname;
    if (h.indexOf('.') > -1) { out.push(';domain=.' + h); out.push(';domain=' + h); }
    return out;
  }
  function setLang(lang) {
    var doms = domainsToSet();
    if (lang === 'en') {
      var past = ';expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      doms.forEach(function (d) { document.cookie = COOKIE + '=' + past + d; });
    } else {
      doms.forEach(function (d) { document.cookie = COOKIE + '=/en/' + lang + ';path=/' + d; });
    }
    location.reload();
  }

  // Tag <html> with the active language so the right Indic font applies.
  function applyScript() {
    var root = document.documentElement;
    root.classList.remove('lang-bn', 'lang-hi');
    var cur = current();
    if (cur === 'bn' || cur === 'hi') root.classList.add('lang-' + cur);
  }

  /* ---- custom switch pill ---- */
  function buildSwitcher() {
    if (document.getElementById('gt-lang')) return;
    var box = document.createElement('div');
    box.id = 'gt-lang';
    box.className = 'gt-lang';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Choose language / ভাষা / भाषा');
    box.setAttribute('translate', 'no');
    box.classList.add('notranslate');
    box.appendChild(mk('en', 'EN', 'Read in English'));
    box.appendChild(mk('bn', 'বাংলা', 'বাংলায় পড়ুন'));
    box.appendChild(mk('hi', 'हिन्दी', 'हिंदी में पढ़ें'));
    document.body.appendChild(box);
    setActive(current());
  }
  function mk(lang, label, aria) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.gtlang = lang;
    b.textContent = label;
    b.setAttribute('aria-label', aria);
    b.addEventListener('click', function () { if (current() !== lang) setLang(lang); });
    return b;
  }
  function setActive(lang) {
    var bs = document.querySelectorAll('#gt-lang button');
    for (var i = 0; i < bs.length; i++) {
      var on = bs[i].dataset.gtlang === lang;
      bs[i].classList.toggle('on', on);
      bs[i].setAttribute('aria-pressed', on);
    }
  }

  function injectStyles() {
    var css =
      /* our switch: sleek + understated. Sits faded until hovered/focused. */
      '.gt-lang{position:fixed;left:15px;bottom:15px;z-index:47;display:inline-flex;gap:1px;' +
      'background:rgba(255,255,255,.5);-webkit-backdrop-filter:blur(10px) saturate(140%);backdrop-filter:blur(10px) saturate(140%);' +
      'border:1px solid rgba(20,20,20,.06);border-radius:999px;padding:2px;' +
      'box-shadow:0 3px 10px -7px rgba(0,0,0,.2);' +
      'opacity:.42;transition:opacity .35s cubic-bezier(.23,1,.32,1),box-shadow .35s cubic-bezier(.23,1,.32,1);' +
      "font-family:'General Sans','Nirmala UI','Noto Sans Bengali','Noto Sans Devanagari',system-ui,-apple-system,'Segoe UI',sans-serif}" +
      '.gt-lang:hover,.gt-lang:focus-within{opacity:1;box-shadow:0 8px 20px -10px rgba(0,0,0,.26)}' +
      '.gt-lang button{border:none;background:none;cursor:pointer;min-height:29px;padding:0 10px;' +
      'border-radius:999px;font-size:11.5px;font-weight:500;color:#5b574e;line-height:1;letter-spacing:.01em;' +
      'transition:background .2s cubic-bezier(.23,1,.32,1),color .2s cubic-bezier(.23,1,.32,1),transform .12s cubic-bezier(.23,1,.32,1)}' +
      '.gt-lang button:active{transform:scale(.95)}' +
      '.gt-lang button.on{background:#20503C;color:#fff;font-weight:600}' +
      '@media (hover:hover){.gt-lang button:not(.on):hover{background:rgba(20,20,20,.05)}}' +
      /* hide Google's toolbar only (its banner + container); leave the hidden helper
         iframes alone or translation stops working. body top reset removes the gap. */
      '.VIpgJd-ZVi9od-ORHb-OEVmcd,.VIpgJd-yAWNEb-L7lbkb,.goog-te-banner-frame{display:none !important}' +
      '.goog-te-gadget{height:0 !important;overflow:hidden}' +
      '#goog-gt-tt,.goog-te-balloon-frame{display:none !important}' +
      '.goog-text-highlight{background:none !important;box-shadow:none !important}' +
      'body{top:0 !important;position:static !important;min-height:100vh}' +
      '#google_translate_element{position:absolute !important;left:-9999px !important;top:0 !important;width:0;height:0;overflow:hidden}' +
      /* Bengali / Hindi read in a proper Indic face (system fonts, no download) */
      'html.lang-bn{' + "--indic:'Noto Sans Bengali','Hind Siliguri','Nirmala UI','Vrinda','Shonar Bangla'" + '}' +
      'html.lang-hi{' + "--indic:'Noto Sans Devanagari','Hind','Nirmala UI','Mangal','Kohinoor Devanagari','Utsaah'" + '}' +
      'html.lang-bn body,html.lang-hi body,html.lang-bn input,html.lang-hi input,' +
      'html.lang-bn select,html.lang-hi select,html.lang-bn textarea,html.lang-hi textarea,' +
      'html.lang-bn button:not(#gt-lang button),html.lang-hi button:not(#gt-lang button),' +
      'html.lang-bn h1,html.lang-hi h1,html.lang-bn h2,html.lang-hi h2,html.lang-bn h3,html.lang-hi h3,' +
      'html.lang-bn .h2,html.lang-hi .h2,html.lang-bn .lg-title,html.lang-hi .lg-title,' +
      'html.lang-bn .b-name,html.lang-hi .b-name,html.lang-bn .q-item blockquote,html.lang-hi .q-item blockquote,' +
      'html.lang-bn .dir-body .nm,html.lang-hi .dir-body .nm' +
      "{font-family:var(--indic),'General Sans',system-ui,sans-serif !important;letter-spacing:normal !important}" +
      '@media (prefers-reduced-motion:reduce){.gt-lang button{transition:none}}';
    var st = document.createElement('style');
    st.setAttribute('data-gtranslate-custom', '');
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }
})();
