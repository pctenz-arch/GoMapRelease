async function run() {
  const queries = [
    'Vincom Plaza Long Xuyen',
    'Co.opmart Long Xuyen',
    'Bệnh viện Đa khoa Trung tâm An Giang',
    'Đại học An Giang'
  ];
  for (const q of queries) {
    const url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=5';
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();
    console.log('--- ' + q + ' ---');
    data.forEach((d: any) => console.log(d.display_name + ' | lat: ' + d.lat + ', lng: ' + d.lon));
  }
}
run();
