export default async function handler(req, res) {
  const { gstin } = req.query;
  
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!gstin) return res.status(400).json({ error: 'Missing GSTIN' });

  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' };

  // Scraping Multiple Sources Parallely to bypass blocks and increase reliability
  const sources = [
    fetch(`https://www.bing.com/search?q=GSTIN+${gstin}+details`, { headers }),
    fetch(`https://search.yahoo.com/search?p=GSTIN+${gstin}+details`, { headers }),
    fetch(`https://www.ecosia.org/search?q=GSTIN+${gstin}+details`, { headers })
  ];

  try {
    const results = await Promise.allSettled(sources);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.ok) {
        const html = await result.value.text();
        const text = html.replace(/<[^>]*>?/gm, ' '); // Strip HTML
        
        // Regex patterns
        const nameMatch = text.match(/(?:Legal Name|Trade Name|Business Name|Name of Business)\s*[:\-]?\s*([A-Z0-9\s\.\-\&]{3,50})(?:\s{2,}|GSTIN|Address|Principal|Date)/i);
        const addressMatch = text.match(/(?:Principal Place of Business|Address|Location)\s*[:\-]?\s*([A-Z0-9\s\,\.\-\/\(\)]{10,100})(?:\s{2,}|GSTIN|Legal|Date)/i);

        if (nameMatch) {
          return res.status(200).json({
            name: nameMatch[1].trim(),
            address: addressMatch ? addressMatch[1].trim() : 'Address not found'
          });
        }
      }
    }
    
    // If exact regex fails, do a generic snippet fallback on the first successful response
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.ok) {
        const html = await result.value.text();
        const text = html.replace(/<[^>]*>?/gm, ' ');
        const snippetMatch = text.match(new RegExp(`(?:${gstin}).{1,30}([A-Z\\s\\&\\.\\-]{5,40})`, 'i'));
        if (snippetMatch) {
          return res.status(200).json({ name: snippetMatch[1].trim(), address: 'Address not found' });
        }
      }
    }

    return res.status(404).json({ error: 'Could not extract details automatically. All sources failed or blocked.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
