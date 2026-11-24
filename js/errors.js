/* js/errors.js — Automatic error reporting for Community Meals KMS.
   Classic (non-module) script so it still runs when the app's modules fail to load.
   Sends reports to the Supabase table kms_error_log (insert-only). */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://vydclmlheskrvvtvemky.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_MpzBqpjpEl4l7G9mM_XEFg_H5u-xSTv';
  var APP_VERSION = '2026-11-23';
  var QUEUE_KEY = 'kms_err_queue_v1';
  var MAX_PER_LOAD = 10;      // stop reporting after this many per page load
  var DEDUPE_MS = 60000;      // ignore the same error repeated within a minute
  var sent = 0;
  var seen = {};

  // Anonymous per-browser id so we can tell "one tablet" from "everyone".
  var deviceId = '';
  try {
    deviceId = localStorage.getItem('kms_device_id') || '';
    if (!deviceId) {
      deviceId = 'd-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      localStorage.setItem('kms_device_id', deviceId);
    }
  } catch (e) { deviceId = 'd-unknown'; }

  function clip(v, n) {
    v = v == null ? '' : String(v);
    return v.length > n ? v.slice(0, n) : v;
  }

  function buildReport(err, ctx) {
    ctx = ctx || {};
    var message = err && err.message ? err.message : String(err || 'Unknown error');
    return {
      kind: clip(ctx.kind || 'error', 40),
      message: clip(message, 1500),
      source: clip(ctx.source || '', 300),
      line: ctx.line || null,
      col: ctx.col || null,
      stack: clip(err && err.stack ? err.stack : '', 4000),
      page_url: clip(location.href.split('#')[0], 300),
      user_agent: clip(navigator.userAgent, 300),
      app_version: APP_VERSION,
      device_id: deviceId,
      context: {
        tab: ctx.tab || null,
        online: navigator.onLine,
        viewport: window.innerWidth + 'x' + window.innerHeight,
        extra: ctx.extra || null
      }
    };
  }

  function readQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (e) { return []; }
  }
  function writeQueue(q) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-20))); } catch (e) {}
  }

  function post(report) {
    return fetch(SUPABASE_URL + '/rest/v1/kms_error_log', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(report)
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); });
  }

  function flushQueue() {
    var q = readQueue();
    if (!q.length || !navigator.onLine) return;
    writeQueue([]);
    q.forEach(function (rep) {
      post(rep).catch(function () { writeQueue(readQueue().concat([rep])); });
    });
  }

  function report(err, ctx) {
    try {
      var rep = buildReport(err, ctx);
      var key = rep.message + '|' + rep.source + '|' + rep.line;
      var now = Date.now();
      if (seen[key] && now - seen[key] < DEDUPE_MS) return;
      seen[key] = now;
      if (sent >= MAX_PER_LOAD) return;
      sent++;
      post(rep).catch(function () { writeQueue(readQueue().concat([rep])); });
    } catch (e) { /* never let the reporter break the app */ }
  }

  window.kmsReportError = report;

  window.addEventListener('error', function (e) {
    // Failed <script>/<link> loads have no e.error; they have e.target
    if (e.target && e.target !== window && (e.target.src || e.target.href)) {
      report(new Error('Resource failed to load: ' + (e.target.src || e.target.href)), { kind: 'resource' });
      return;
    }
    report(e.error || new Error(e.message), { kind: 'error', source: e.filename, line: e.lineno, col: e.colno });
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    report(r instanceof Error ? r : new Error(typeof r === 'string' ? r : JSON.stringify(r)), { kind: 'promise' });
  });

  window.addEventListener('online', flushQueue);

  // Blank-page watchdog: if the app never draws anything, say so and report it.
  window.addEventListener('load', function () {
    flushQueue();
    setTimeout(function () {
      var main = document.getElementById('app-main');
      var empty = !main || !main.innerHTML.trim();
      if (!empty) return;
      report(new Error('App content area is empty 6 seconds after load'), { kind: 'blank-page' });
      if (document.getElementById('kms-fail-banner')) return;
      var b = document.createElement('div');
      b.id = 'kms-fail-banner';
      b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#7a0d1d;color:#fff;padding:14px 16px;font:600 14px system-ui,sans-serif;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap';
      var t = document.createElement('span');
      t.textContent = 'The Kitchen OS did not load correctly. This was reported automatically.';
      var btn = document.createElement('button');
      btn.textContent = 'Reload';
      btn.style.cssText = 'background:#fff;color:#7a0d1d;border:0;border-radius:8px;padding:6px 14px;font-weight:700;cursor:pointer';
      btn.onclick = function () { location.reload(); };
      b.appendChild(t); b.appendChild(btn);
      document.body.appendChild(b);
    }, 6000);
  });
})();