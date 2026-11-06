(() => {
  const widget = document.querySelector('[data-visitor-counter]');
  const starts = {total:1000,daily:100,downloads:100};
  const initialDownloads = 40;
  const initialDay = '2026-11-07';
  const day = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const endpoint = window.WEBBOOK_CONFIG?.registrationEndpoint;
  if (!widget || !endpoint) return;
  function render(data) {
    if (data.ok !== true || data.visitors !== true || !Number.isSafeInteger(data.total) || !Number.isSafeInteger(data.daily) || data.total < 0 || data.daily < 0 || !Number.isSafeInteger(data.downloads) || data.downloads < 0) return false;
    const downloads = starts.downloads + data.downloads;
    const daily = starts.daily + data.daily + (day === initialDay ? initialDownloads : 0);
    const total = starts.total + data.total + initialDownloads;
    widget.querySelector('[data-visitor-total]').textContent = total.toLocaleString('ko-KR');
    widget.querySelector('[data-visitor-daily]').textContent = daily.toLocaleString('ko-KR');
    widget.querySelector('[data-download-total]').textContent = downloads.toLocaleString('ko-KR');
    widget.hidden = false;
    return true;
  }
  (async () => {
    try {
      // Probe capability first so older PDF/feedback deployments are unaffected.
      const url = new URL(endpoint);
      url.searchParams.set('action', 'visitorStats');
      url.searchParams.set('_', String(Date.now()));
      const initial = await fetch(url, {cache:'no-store', signal:AbortSignal.timeout(20000)});
      if (!initial.ok || !render(await initial.json())) return;
      let visitorId;
      try {
        visitorId = localStorage.getItem('qs-webbook-visitor-v1');
        if (!/^[a-zA-Z0-9-]{20,80}$/.test(visitorId || '')) {
          visitorId = crypto.randomUUID();
          localStorage.setItem('qs-webbook-visitor-v1', visitorId);
        }
      } catch { return; } // Read totals only when browser storage is unavailable.
      const response = await fetch(endpoint, {
        method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action:'visit',visitorId}), signal:AbortSignal.timeout(20000)
      });
      if (response.ok) render(await response.json());
    } catch { /* Keep last verified counts, or hide the widget when unavailable. */ }
  })();
})();
