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
  const queries = [
    'Nguyen Kim Long Xuyen',
    'Nguyen Kim An Giang'
  ];
  for (const q of queries) {
    const url = 'https://photon.komoot.io/api/?q=' + encodeURIComponent(q) + '&limit=5';
    const data = await fetchJson(url);
    console.log('--- ' + q + ' ---');
    if (data.features) {
      data.features.forEach((f: any) => console.log(f.properties.name + ' | lat: ' + f.geometry.coordinates[1] + ', lng: ' + f.geometry.coordinates[0]));
    }
  }
}
run();
