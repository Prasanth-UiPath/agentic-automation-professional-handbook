/* ===========================================================
   Agentic Automation Professional workbook — shared behaviour
   1) Copy-to-clipboard buttons (reliable, with fallback)
   2) Interactive checklists (click / keyboard, progress saved)
   Loaded at the end of every page.
   =========================================================== */
(function () {
  'use strict';

  /* ---------- 1. Copy to clipboard ---------- */

  function textOf(el) {
    if (!el) return '';
    var t = (typeof el.innerText === 'string' && el.innerText) ? el.innerText : (el.textContent || '');
    return t.replace(/\r/g, '').replace(/\s+$/, '');
  }

  // Terminal blocks show "PS> command" followed by sample output.
  // Copy only the commands (without the "PS> " prompt) so they paste and run cleanly.
  function cleanForCopy(text) {
    var lines = text.split('\n');
    var cmds = [];
    for (var i = 0; i < lines.length; i++) {
      if (/^PS>\s/.test(lines[i]) || /^PS>$/.test(lines[i])) {
        cmds.push(lines[i].replace(/^PS>\s?/, ''));
      }
    }
    return cmds.length ? cmds.join('\n') : text;
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch (e) {
      return false;
    }
  }

  function flash(btn, ok) {
    if (!btn) return;
    clearTimeout(btn._timer);
    btn.classList.toggle('copied', !!ok);
    btn.classList.toggle('copy-failed', !ok);
    btn.title = ok ? 'Copied!' : 'Copy failed - select the text and press Ctrl+C';
    btn.setAttribute('aria-label', btn.title);
    btn._timer = setTimeout(function () {
      btn.classList.remove('copied');
      btn.classList.remove('copy-failed');
      btn.title = 'Copy to clipboard';
      btn.setAttribute('aria-label', 'Copy to clipboard');
    }, 2000);
  }

  function copyFromElement(btn, id) {
    var el = document.getElementById(id);
    if (!el) { flash(btn, false); return; }
    var text = cleanForCopy(textOf(el));
    var done = function (ok) { flash(btn, ok); };
    if (navigator.clipboard && navigator.clipboard.writeText && (window.isSecureContext !== false)) {
      navigator.clipboard.writeText(text).then(
        function () { done(true); },
        function () { done(fallbackCopy(text)); }
      );
    } else {
      done(fallbackCopy(text));
    }
  }

  // Names used by the existing buttons in the pages
  window.copyCodeBlock = function (btn, id) { copyFromElement(btn, id); };
  window.copyText = function (btn, id) { copyFromElement(btn, id); };
  window.copySystemPrompt = function (btn) { copyFromElement(btn, 'system-prompt-text'); };
  window.copyAppHtml = function (btn) { copyFromElement(btn, 'app-html-text'); };

  /* ---------- 2. Interactive checklists ---------- */

  var store = {};
  var storageOk = true;
  var STORE_KEY = 'aap-workbook-checklists-v1';

  try {
    store = JSON.parse(window.localStorage.getItem(STORE_KEY) || '{}') || {};
  } catch (e) {
    storageOk = false;
    store = {};
  }

  function save() {
    if (!storageOk) return;
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { storageOk = false; }
  }

  function moduleOf() {
    var m = (window.location.pathname || '').match(/\/(part\d)\//);
    return m ? m[1] : 'root';
  }

  function setChecked(row, on) {
    row.classList.toggle('checked', !!on);
    row.setAttribute('aria-checked', on ? 'true' : 'false');
  }

  function initChecklists() {
    var mod = moduleOf();
    var seen = {};
    var rows = document.querySelectorAll('.checklist .row');
    for (var i = 0; i < rows.length; i++) {
      (function (row) {
        var label = (row.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140);
        seen[label] = (seen[label] || 0) + 1;
        // Same step text in steps.html and lesson-*.html shares one saved state.
        var key = mod + '|' + label + '|' + seen[label];
        row.setAttribute('role', 'checkbox');
        row.setAttribute('tabindex', '0');
        setChecked(row, !!store[key]);

        function toggle() {
          var on = !row.classList.contains('checked');
          setChecked(row, on);
          if (on) store[key] = 1; else delete store[key];
          save();
        }
        row.addEventListener('click', function (ev) {
          var t = ev.target;
          while (t && t !== row) {
            if (t.tagName === 'A') return;   // let links inside a row work normally
            t = t.parentNode;
          }
          toggle();
        });
        row.addEventListener('keydown', function (ev) {
          if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); toggle(); }
        });
      })(rows[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChecklists);
  } else {
    initChecklists();
  }
})();
