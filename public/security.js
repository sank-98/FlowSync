(function () {
  function sanitizeText(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function secureFetch(url, options = {}) {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
    const headers = {
      'Content-Type': 'application/json',
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
      ...(options.headers || {}),
    };

    return fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin',
    });
  }

  window.FlowSyncSecurity = { sanitizeText, secureFetch };
})();
