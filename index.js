const { fetchFacebookInsights } = require('./services/facebook');

(async () => {
  try {
    const data = await fetchFacebookInsights();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching insights:', err.message);
  }
})();
