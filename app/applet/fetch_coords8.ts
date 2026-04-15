import https from 'https';

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  const url = 'https://photon.komoot.io/reverse?lon=105.4420&lat=10.3826';
  const data = await fetchJson(url);
  console.log(JSON.stringify(data, null, 2));
}
run();
