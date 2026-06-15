const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3001;

// Mock fallback data based on Esha's portfolio
const mockStats = {
  publicRepos: 18,
  totalStars: 42,
  followers: 65,
  topLanguage: 'JavaScript'
};

const mockRepos = {
  languages: [
    { name: 'JavaScript', percent: 62.4, color: '#F7DF1E' },
    { name: 'TypeScript', percent: 18.2, color: '#3178C6' },
    { name: 'Python', percent: 12.1, color: '#3776AB' },
    { name: 'HTML', percent: 4.8, color: '#E44D26' },
    { name: 'CSS', percent: 2.5, color: '#1572B6' }
  ],
  recent: [
    {
      name: 'CivicConnect_Frontend_EshaDey',
      url: 'https://github.com/esha-dey-22/CivicConnect_Frontend_EshaDey',
      description: 'Crowdsourced Civic Issue Reporting and Resolution System - Frontend in Next.js',
      language: 'TypeScript',
      langColor: '#3178C6',
      stars: 15,
      forks: 5,
      updatedAt: new Date().toISOString()
    },
    {
      name: 'E-mart',
      url: 'https://github.com/esha-dey-22/E-mart',
      description: 'A comprehensive e-commerce platform built with React and Node.js',
      language: 'JavaScript',
      langColor: '#F7DF1E',
      stars: 12,
      forks: 3,
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      name: 'Portfolio',
      url: 'https://github.com/esha-dey-22/Portfolio',
      description: 'Interactive portfolio website with custom cyberpunk animations',
      language: 'HTML',
      langColor: '#E44D26',
      stars: 8,
      forks: 1,
      updatedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]
};

const mockLeetCode = {
  total: 800,
  easy: 208,
  medium: 451,
  hard: 141,
  submissions: [
    { title: "Merge Two Sorted Lists", timestamp: String(Math.floor(Date.now() / 1000) - 3600), statusDisplay: "Accepted", lang: "java" },
    { title: "Add Two Numbers", timestamp: String(Math.floor(Date.now() / 1000) - 7200), statusDisplay: "Accepted", lang: "java" },
    { title: "Linked List Cycle", timestamp: String(Math.floor(Date.now() / 1000) - 14400), statusDisplay: "Accepted", lang: "java" },
    { title: "Basic Calculator", timestamp: String(Math.floor(Date.now() / 1000) - 86400), statusDisplay: "Accepted", lang: "java" },
    { title: "Evaluate Reverse Polish Notation", timestamp: String(Math.floor(Date.now() / 1000) - 172800), statusDisplay: "Accepted", lang: "java" }
  ]
};

// Helper function to fetch data from GitHub API
function fetchGitHubData(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'NodeJS-Backend-App'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`HTTP Status ${res.statusCode}`));
        }
      });
    });
    req.on('error', (err) => { reject(err); });
    req.end();
  });
}

// Helper function to fetch LeetCode statistics and submissions via GraphQL API
function fetchLeetCodeData(username) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      query: `query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          submitStats: submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
            }
          }
        }
        recentSubmissionList(username: $username, limit: 6) {
          title
          timestamp
          statusDisplay
          lang
        }
      }`,
      variables: { username: username }
    });

    const options = {
      hostname: 'leetcode.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.errors) {
              reject(new Error(parsed.errors[0].message));
            } else {
              resolve(parsed.data);
            }
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`LeetCode HTTP Status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => { reject(err); });
    req.write(postData);
    req.end();
  });
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/github/stats') {
    res.setHeader('Content-Type', 'application/json');
    fetchGitHubData('/users/esha-dey-22')
      .then(user => {
        return fetchGitHubData('/users/esha-dey-22/repos?per_page=100')
          .then(repos => {
            let totalStars = 0;
            repos.forEach(repo => { totalStars += repo.stargazers_count; });
            const data = {
              publicRepos: user.public_repos,
              totalStars: totalStars,
              followers: user.followers,
              topLanguage: repos.length > 0 ? (repos[0].language || 'JavaScript') : 'JavaScript'
            };
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, data: data }));
          });
      })
      .catch(err => {
        console.warn('Using fallback data for stats due to error or rate-limiting:', err.message);
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, data: mockStats }));
      });

  } else if (req.method === 'GET' && url.pathname === '/api/github/repos') {
    res.setHeader('Content-Type', 'application/json');
    fetchGitHubData('/users/esha-dey-22/repos?sort=updated&per_page=6')
      .then(repos => {
        const recent = repos.map(repo => ({
          name: repo.name,
          url: repo.html_url,
          description: repo.description,
          language: repo.language || 'HTML',
          langColor: repo.language === 'JavaScript' ? '#F7DF1E' : (repo.language === 'TypeScript' ? '#3178C6' : '#89E051'),
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          updatedAt: repo.updated_at
        }));
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, data: { languages: mockRepos.languages, recent: recent } }));
      })
      .catch(err => {
        console.warn('Using fallback data for repos due to error or rate-limiting:', err.message);
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, data: mockRepos }));
      });

  } else if (req.method === 'GET' && url.pathname === '/api/leetcode') {
    res.setHeader('Content-Type', 'application/json');
    fetchLeetCodeData('ed0629')
      .then(lcData => {
        if (lcData && lcData.matchedUser) {
          const stats = lcData.matchedUser.submitStats.acSubmissionNum;
          const all = stats.find(s => s.difficulty === 'All').count;
          const easy = stats.find(s => s.difficulty === 'Easy').count;
          const medium = stats.find(s => s.difficulty === 'Medium').count;
          const hard = stats.find(s => s.difficulty === 'Hard').count;
          const submissions = lcData.recentSubmissionList || [];
          res.statusCode = 200;
          res.end(JSON.stringify({
            ok: true,
            data: { total: all, easy, medium, hard, submissions }
          }));
        } else {
          throw new Error('User not found');
        }
      })
      .catch(err => {
        console.warn('Using fallback data for LeetCode due to error:', err.message);
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, data: mockLeetCode }));
      });

  } else if (req.method === 'POST' && url.pathname === '/api/contact') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        console.log('--- New Contact Form Message Received ---');
        console.log(`Name:    ${payload.name}`);
        console.log(`Email:   ${payload.email}`);
        console.log(`Subject: ${payload.subject}`);
        console.log(`Message: ${payload.message}`);
        console.log('----------------------------------------');
        
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, demo: true }));
      } catch (e) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'Invalid JSON body' }));
      }
    });
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Backend Server running at http://localhost:${PORT}`);
  console.log(`Serving GitHub and LeetCode integrations, and contact endpoint.`);
});
