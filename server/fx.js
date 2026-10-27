import https from 'https';

/**
 * Fetch live GBP→INR rate from api.frankfurter.app
 * Returns a number (e.g. 110.5) or null on failure.
 */
export function fetchLiveRate() {
  return new Promise((resolve) => {
    const url = 'https://open.er-api.com/v6/latest/GBP';
    https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const rate = json?.rates?.INR;
          resolve(typeof rate === 'number' ? rate : null);
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null))
      .on('timeout', function () { this.destroy(); resolve(null); });
  });
}
