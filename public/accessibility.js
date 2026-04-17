(function () {
  function announce(message) {
    const liveRegion = document.getElementById('a11y-live-region');
    if (!liveRegion) return;
    liveRegion.textContent = '';
    window.requestAnimationFrame(() => {
      liveRegion.textContent = message;
    });
  }

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (event.altKey && event.key.toLowerCase() === 'r') {
        const routeBtn = document.getElementById('get-route-btn');
        if (routeBtn) routeBtn.click();
        announce('Route generation requested');
      }
      if (event.key === 'Escape') {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
          chatInput.blur();
          announce('Focus removed from chat input');
        }
      }
    });
  }

  window.FlowSyncA11y = { announce, setupKeyboardShortcuts };
})();
