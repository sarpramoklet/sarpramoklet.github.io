const https = require('https');

function checkDashboardData() {
  const url = 'https://api.smktelkom-mlg.sch.id/auth/sarmok/dashboard';
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
        console.log('Dashboard API Raw Output:', data);
      } catch (e) {
        console.error('Failed:', e.message);
      }
    });
  }).on('error', (err) => {
    console.error('Request failed:', err.message);
  });
}

checkDashboardData();
