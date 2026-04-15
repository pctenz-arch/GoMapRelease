import https from 'https';

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MyLongXuyenApp/1.0 (contact@example.com)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  const queries = [
    'Vincom Plaza Long Xuyen',
    'Co.opmart Long Xuyen',
    'Bệnh viện Đa khoa Trung tâm An Giang',
    'Đại học An Giang'
  ];
  for (const q of queries) {
    const url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=5';
    const data = await fetchJson(url);
    console.log('--- ' + q + ' ---');
    data.forEach((d: any) => console.log(d.display_name + ' | lat: ' + d.lat + ', lng: ' + d.lon));
  }
}
run();
