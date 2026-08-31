// Mission Control — online shell (Vercel serverless)
// /mc-api/* vrací canonical chybu: živá data běží LOKÁLNĚ
// (DataHub :5180 → Paperclip, Gmail, TURBOW …). Online kopie je
// UI shell bez přístupu k lokálním zdrojům — UI na to umí
// reagovat (stav "Data nejsou dostupná", backoff polling).
module.exports = function handler(req, res) {
  res.statusCode = 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify({
    ok: false,
    error: {
      code: 'integration_unavailable',
      message: 'Integrační vrstva (DataHub) běží lokálně na Macu — online verze Mission Controlu nezobrazuje živá data.',
      retryable: true,
      integration: 'datahub',
      operation: 'online-shell'
    }
  }));
};
