(function (window) {
  window['env'] = window['env'] || {};

  // Environment variables
  window['env']['apiUrl'] = 'https://eudiplo.eudi-wallet.dev';

  // Application version (injected at runtime in Docker)
  window['env']['version'] = 'dev';
})(this);
