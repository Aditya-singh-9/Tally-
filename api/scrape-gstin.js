export default async function handler(req, res) {
  const { gstin } = req.query;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!gstin) {
    return res.status(400).json({ error: 'Missing GSTIN' });
  }

  try {
    // We scrape DuckDuckGo as a proxy to bypass CORS and find business details quickly
    const response = await fetch(`https://html.duckduckgo.com/html/?q=GSTIN+${gstin}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Scraper HTTP error: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Strip HTML tags for easier regex matching
    const text = html.replace(/<[^>]*>?/gm, ' ');
    
    const nameMatch = text.match(/(?:Legal Name|Trade Name|Business Name)\s*[:\-]\s*([A-Z0-9\s\.\-\&]+?)(?:\s{2,}|GSTIN|Address|Principal)/i);
    const addressMatch = text.match(/(?:Principal Place of Business|Address)\s*[:\-]\s*([^|]+)/i);

    if (nameMatch) {
      return res.status(200).json({
        name: nameMatch[1].trim(),
        address: addressMatch ? addressMatch[1].trim() : 'Address not found'
      });
    } else {
      // Fallback: look for the first title result
      const titleMatch = html.match(/<a class="result__url" href="[^"]*">([^<]+)<\/a>/i);
      if (titleMatch) {
        let name = titleMatch[1].split('-')[0].replace('GSTIN', '').trim();
        return res.status(200).json({ name, address: 'Address not found' });
      }
      
      return res.status(404).json({ error: 'Could not extract details automatically.' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
