/* Capture the native install event before React hydration. No user data is stored. */
(function () {
  if (window.__ahaPwaInstall) return;
  var state = window.__ahaPwaInstall = { prompt: null, phase: 'idle' };
  function changed() { window.dispatchEvent(new Event('aha-install-change')); }
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    state.prompt = event;
    state.phase = 'available';
    changed();
  });
  window.addEventListener('appinstalled', function () {
    state.prompt = null;
    state.phase = 'installed';
    changed();
  });
})();
