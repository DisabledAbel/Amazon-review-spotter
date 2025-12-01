const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const morgan = require('morgan');
const url = require('url');

const app = express();
app.use(morgan('tiny'));

const BLOCKED_HOSTS = [
  // add or remove hosts as you like
  'www.amazon.com',
  'amazon.com',
  'smile.amazon.com',
  'aws.amazon.com',
  'amazonaws.com',
  's3.amazonaws.com',
  'primevideo.com',
  'www.primevideo.com',
  'images-na.ssl-images-amazon.com',
  'fls-na.amazon.com',
  'completion.amazon.com'
];

// headers to remove for privacy
const STRIP_REQUEST_HEADERS = [
  'cookie', 'x-amzn-trace-id', 'referer', 'user-agent'
];
const STRIP_RESPONSE_HEADERS = [
  'set-cookie', 'x-amz-request-id', 'server'
];

function isBlockedHost(hostname) {
  if (!hostname) return false;
  return BLOCKED_HOSTS.some(b => hostname.endsWith(b));
}

// General-purpose proxy endpoint: /proxy?url=<target_url>
// Example: /proxy?url=https://example.com
app.get('/proxy', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing ?url=');

  let parsed;
  try {
    parsed = new URL(target);
  } catch (err) {
    return res.status(400).send('Invalid URL');
  }

  if (isBlockedHost(parsed.hostname)) {
    console.log(`[BLOCKED] attempt to access blocked host: ${parsed.hostname} -> ${target}`);
    return res.status(403).send('Access to this host is blocked by policy.');
  }

  // Prepare request headers
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!STRIP_REQUEST_HEADERS.includes(k.toLowerCase())) {
      headers[k] = v;
    }
  }
  // Add a safe user-agent or leave minimal
  headers['user-agent'] = 'AntiAmazonProxy/0.1 (+https://github.com/DisabledAbeHTTP)';

  try {
    const upstream = await fetch(target, { headers, redirect: 'follow' });
    // Copy status
    res.status(upstream.status);

    // Copy & strip response headers
    upstream.headers.forEach((v, k) => {
      if (!STRIP_RESPONSE_HEADERS.includes(k.toLowerCase())) {
        res.set(k, v);
      }
    });

    const contentType = upstream.headers.get('content-type') || '';

    // If HTML, perform rewriting to remove amazon widgets/iframes
    if (contentType.includes('text/html')) {
      const text = await upstream.text();
      const $ = cheerio.load(text);

      // remove common Amazon iframes, widgets, links
      $('iframe').each((i, el) => {
        const src = $(el).attr('src') || '';
        if (/amazon|primevideo|smile|aws|images-na/.test(src)) $(el).remove();
      });
      // remove links that go to amazon
      $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        if (/amazon|primevideo|smile|aws|amazonaws/.test(href)) {
          // replace link with span
          $(el).replaceWith(`<span class="removed-amazon-link">${$(el).text() || 'Amazon link removed'}</span>`);
        }
      });
      // remove script tags pointing to amazon domains
      $('script').each((i, el) => {
        const src = $(el).attr('src') || '';
        if (/amazon|amzn|amazonaws|fls-na/.test(src)) $(el).remove();
      });

      // optional: strip elements with class/id containing "amazon"
      $('[class*="amazon"]').remove();
      $('[id*="amazon"]').remove();

      const out = $.html();
      res.set('content-type', 'text/html; charset=utf-8');
      return res.send(out);
    } else {
      // For non-HTML, stream binary/text directly
      const buffer = await upstream.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }
  } catch (err) {
    console.error('Upstream fetch error', err);
    return res.status(502).send('Bad Gateway: upstream failed');
  }
});

// A simpler passthrough proxy for path-based proxying (optional)
app.use('/r/', (req, res, next) => {
  // Expect /r/<encoded_url> or /r/?url=
  let target = req.query.url;
  if (!target) {
    // parse from path after /r/
    const enc = req.path.replace(/^\/r\//, '');
    try {
      target = decodeURIComponent(enc);
    } catch (e) {
      target = null;
    }
  }
  if (!target) return res.status(400).send('Missing target');
  // reuse logic above by rewriting to /proxy?url=...
  req.query.url = target;
  return app._router.handle(req, res, next);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Anti-Amazon proxy listening on ${PORT}`));
