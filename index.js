const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// Set the base URL for short URLs using an environment variable
const BASE_SHORT_URL = process.env.BASE_SHORT_URL || `http://localhost:${PORT}`;

// In-memory storage for URL mappings and analytics
const urlMappings = {};
let counter = 60466176; // Starting counter for 6-character shortcodes

// Function to generate a shortcode based on a number
function generateShortcode(number) {
  const s = '0123456789abcdefghijklmnopqrstuvwxyz';
  let hash_str = '';
  while (number > 0) {
    hash_str = s[number % 36] + hash_str;
    number = Math.floor(number / 36);
  }
  return hash_str;
}

// Middleware for logging requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Endpoint for submitting a URL with desired shortcode
app.post('/submit', (req, res) => {
  const url = req.body.url;
  let desiredShortcode = req.body.desired_shortcode;

  if (desiredShortcode) {
    // Convert desired shortcode to lowercase
    desiredShortcode = desiredShortcode.toLowerCase();

    // Check if desired shortcode is available and meets len req
    if (desiredShortcode.length >= 4 && !urlMappings[desiredShortcode]) {
      urlMappings[desiredShortcode] = {
        url: url,
        created: new Date(),
        clicks: 0
      };

      return res.json({
        short_url: `${BASE_SHORT_URL}/${desiredShortcode}`,
        custom_shortcode: desiredShortcode
      });
    } else {
      return res.status(400).send('Invalid or unavailable desired shortcode.');
    }
  }

  // If no desired shortcode, generate one
  const shortcode = generateShortcode(counter);
  urlMappings[shortcode] = {
    url: url,
    created: new Date(),
    last_accessed: null,
    clicks: 0
  };

  counter++;

  return res.json({
    short_url: `${BASE_SHORT_URL}/${shortcode}`,
    custom_shortcode: shortcode
  });
});

// Redirect endpoint for short URLs
app.get('/:shortcode', (req, res) => {
  const shortcode = req.params.shortcode.toLowerCase();
  const mapping = urlMappings[shortcode];

  if (mapping) {
    // Update the last_accessed time, increment click count and redirect with 302 status
    mapping.last_accessed = new Date();
    mapping.clicks++;
    console.log(`Redirecting ${shortcode} to ${mapping.url}`);
    return res.redirect(302, mapping.url);
  } else {
    return res.status(404).send('Shortcode not found.');
  }
});

// Endpoint for getting shortcode statistics
app.get('/:shortcode/stats', (req, res) => {
  const shortcode = req.params.shortcode.toLowerCase();
  const mapping = urlMappings[shortcode];

  if (mapping) {
    return res.json({
      shortcode: shortcode,
      generated: mapping.created,
      last_accessed: mapping.last_accessed,
      clicks: mapping.clicks,
      long_url: mapping.url
    });
  } else {
    return res.status(404).send('Shortcode not found.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
