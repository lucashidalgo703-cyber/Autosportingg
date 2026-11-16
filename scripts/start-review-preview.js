// Disposable fixtures, loopback only; no deployment settings or real emails.
process.env.LOCAL_BUYER_PORTAL_FIXTURES = 'true';
await import('./start-mobile-crm-preview.js');
