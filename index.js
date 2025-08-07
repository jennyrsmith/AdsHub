import { fetchFacebookInsights } from './facebookInsights.js';

try {
  const data = await fetchFacebookInsights();
  console.log(JSON.stringify(data, null, 2));
} catch (err) {
  console.error('Error fetching insights:', err.message);
}

