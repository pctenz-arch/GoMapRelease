const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  const queries = [
    "Co.opmart Long Xuyen",
    "Vincom Plaza Long Xuyen",
    "Benh vien Da khoa Trung tam An Giang",
    "Dai hoc An Giang"
  ];
  
  for (const q of queries) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json`;
    const data = await fetch(url);
    console.log(`--- ${q} ---`);
    if (data.length > 0) {
      console.log(`lat: ${data[0].lat}, lng: ${data[0].lon}`);
    } else {
      console.log('Not found');
    }
  }
}
run();
