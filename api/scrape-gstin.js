export default async function handler(req, res) {
  const { gstin } = req.query;
  
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!gstin) return res.status(400).json({ error: 'Missing GSTIN' });

  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' };

  const sources = [
    fetch(`https://www.bing.com/search?q=GSTIN+${gstin}+details`, { headers }),
    fetch(`https://search.yahoo.com/search?p=GSTIN+${gstin}+details`, { headers }),
    fetch(`https://www.ecosia.org/search?q=GSTIN+${gstin}+details`, { headers })
  ];

  try {
    const results = await Promise.allSettled(sources);
    const successfullyFetchedTexts = [];

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.ok) {
        const html = await result.value.text();
        successfullyFetchedTexts.push(html);
        
        const text = html.replace(/<[^>]*>?/gm, ' ');
        
        // Comprehensive Regex for Business Name
        const nameMatch = text.match(/(?:Legal Name|Trade Name|Business Name|Name of Business)\s*[:\-]?\s*([A-Z0-9\s\.\-\&]{3,60})(?:\s{2,}|GSTIN|Address|Principal|Date|PAN|Status)/i);
        
        // Aggressive Address/State extraction
        // Look for common address labels OR State names directly following the GSTIN or Name
        const addressMatch = text.match(/(?:Principal Place of Business|Address|Location|State)\s*[:\-]?\s*([A-Z0-9\s\,\.\-\/\(\)]{5,100})(?:\s{2,}|GSTIN|Legal|Date|PAN|Status|Entity)/i);

        if (nameMatch) {
          let address = addressMatch ? addressMatch[1].trim() : 'Location not found';
          
          // Fallback State check (if address is generic or not found)
          if (address === 'Location not found' || address.length < 5) {
             const states = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar","Chandigarh","Dadra and Nagar Haveli","Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"];
             const stateFound = states.find(s => text.toLowerCase().includes(s.toLowerCase()));
             if (stateFound) address = stateFound;
          }

          return res.status(200).json({
            name: nameMatch[1].trim().replace(/\s+/g, ' '),
            address: address.replace(/\s+/g, ' ')
          });
        }
      }
    }
    
    // Last resort fallback
    for (const html of successfullyFetchedTexts) {
      const text = html.replace(/<[^>]*>?/gm, ' ');
      const nameMatch = text.match(new RegExp(`(?:${gstin}).{1,50}([A-Z\\s\\&\\.\\-]{5,50})`, 'i'));
      if (nameMatch) {
        return res.status(200).json({ 
          name: nameMatch[1].trim().replace(/\s+/g, ' '), 
          address: 'State not identified' 
        });
      }
    }

    return res.status(404).json({ error: 'Details not found.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
