async function run() {
  const queries = [
    "Co.opmart Long Xuyen",
    "Vincom Plaza Long Xuyen",
    "Benh vien Da khoa Trung tam An Giang",
    "Dai hoc An Giang"
  ];
  
  for (const q of queries) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();
    console.log(`--- ${q} ---`);
    if (data.length > 0) {
      console.log(`lat: ${data[0].lat}, lng: ${data[0].lon}`);
    } else {
      console.log('Not found');
    }
  }
}
run();
