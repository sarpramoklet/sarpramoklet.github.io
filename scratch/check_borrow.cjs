const https = require('https');

function checkBorrowData() {
  const url = 'https://api.smktelkom-mlg.sch.id/sarpra-borrow/sarmok/borrow';
  const auth = 'Basic bW9rbGV0TWFsYW5nOnRlbGtvbUhlYmF0MjAyMw==';

  const options = {
    headers: {
      'Authorization': auth,
      'Accept': 'application/json'
    }
  };

  https.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const payload = JSON.parse(data);
        const lends = payload.data?.lends || [];
        
        console.log(`Total lends: ${lends.length}`);
        
        const statusCounts = {};
        lends.forEach(row => {
          const status = row.status || 'UNKNOWN';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        console.log('Status counts:', JSON.stringify(statusCounts, null, 2));
        
        const returnedRow = lends.find(r => r.status === 'RETURNED' || r.status === 2);
        if (returnedRow) {
          console.log('Sample RETURNED row:', JSON.stringify(returnedRow, null, 2));
        }
      } catch (e) {
        console.error('Parse failed:', e.message);
      }
    });
  }).on('error', (err) => {
    console.error('Request failed:', err.message);
  });
}

checkBorrowData();
