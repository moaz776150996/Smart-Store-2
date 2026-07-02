import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PRODUCTS } from "./src/data";

// Server-side cache for Google Sheet products
interface SheetResult {
  success: boolean;
  products?: any[];
  error?: string;
  details?: string;
  instructions?: string;
}

let cachedResult: SheetResult | null = null;
let lastFetched = 0;
let isFetching = false;
const CACHE_TTL = 5 * 1000; // 5 seconds cache expiration

// Helper to parse robust RFC 4180-compliant CSV with multi-line cells and quotes
function parseCSV(csvText: string): any[] {
  const lines: string[] = [];
  let currentLine = "";
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '"'; // Escaped quote
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === '\n' || char === '\r') {
      if (inQuotes) {
        currentLine += char;
      } else {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(currentLine);
        currentLine = "";
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  
  if (lines.length < 2) return [];
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  const result: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === "")) continue;
    
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index] !== undefined ? values[index] : "";
    });
    result.push(obj);
  }
  
  return result;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',') {
      if (inQuotes) {
        currentField += char;
      } else {
        fields.push(currentField);
        currentField = "";
      }
    } else {
      currentField += char;
    }
  }
  fields.push(currentField);
  return fields;
}

async function fetchProductsFromSheet(): Promise<SheetResult> {
  if (isFetching) {
    return cachedResult || { success: true, products: PRODUCTS };
  }
  isFetching = true;
  console.log("Fetching products from Google Sheets Apps Script with robust retry...");
  
  try {
    let lastError: any = null;
    let attempts = 3;
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout
        
        const response = await fetch(`https://script.google.com/macros/s/AKfycbxJBtIIjNMX_bixahUQWOjZ1zdOD3K_B0_Cn4fJxCfj7VVn2enEbpWrc9K3LDyUwyn2qQ/exec?_t=${Date.now()}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        if (response.ok && (contentType.includes('application/json') || text.trim().startsWith('[') || text.trim().startsWith('{'))) {
          try {
            const data = JSON.parse(text);
            const rawProducts = Array.isArray(data) ? data : (data.data || data.products || []);
            
            const productsArray = rawProducts.map((item: any) => {
              if (!item) return null;
              const name = String(item.name || item.nameEn || item.nameAr || '').trim();
              if (name.length === 0) return null;

              const imageStr = String(item.image || '').trim();
              const imageUrls = imageStr
                .split(/[\r\n,\s]+/)
                .map(s => {
                  let cleaned = s.trim().replace(/^["'`\s\[\(]+|["'`\s\]\)]+$/g, '');
                  if (/^https?:\/\//i.test(cleaned)) {
                    cleaned = cleaned.replace(/^https?:\/\//i, (match) => match.toLowerCase());
                  }
                  return cleaned;
                })
                .filter(Boolean)
                .filter(u => u.toLowerCase().startsWith('http') && (u.toLowerCase().includes('postimg') || u.toLowerCase().includes('postimage')));

              if (imageUrls.length === 0) {
                console.log(`Excluding product "${name}" because it does not have valid postimg/postimage image URLs.`);
                return null;
              }
              
              return {
                ...item,
                image: imageUrls[0],
                images: imageUrls
              };
            }).filter(Boolean);

            console.log(`Successfully fetched and filtered ${productsArray.length} active products from Google Sheet`);
            const result = { success: true, products: productsArray };
            cachedResult = result;
            lastFetched = Date.now();
            return result;
          } catch (e: any) {
            console.log('Failed to parse sheet JSON:', e);
            lastError = { error: "JSON Parse Error", details: e?.message || String(e) };
          }
        } else {
          console.log(`Apps Script returned non-JSON/error response (Attempt ${attempt}/${attempts}), content-type:`, contentType, 'Status:', response.status);
          
          let extractedMsg = "";
          const match = text.match(/font-family:monospace[^>]*>([\s\S]*?)<\/div>/i);
          if (match) {
            extractedMsg = match[1].replace(/&quot;/g, '"').trim();
          } else if (text.includes("TypeError:")) {
            const typeErrorIdx = text.indexOf("TypeError:");
            const endIdx = text.indexOf("</div>", typeErrorIdx);
            if (typeErrorIdx !== -1 && endIdx !== -1) {
              extractedMsg = text.substring(typeErrorIdx, endIdx).replace(/&quot;/g, '"').trim();
            }
          }

          lastError = {
            error: "Google Sheets Apps Script TypeError",
            details: extractedMsg || `Status ${response.status}: Expected JSON but received ${contentType.split(';')[0]}.`,
            instructions: "setHeaders is not a function"
          };
        }
      } catch (err: any) {
        console.log(`Failed to fetch from Google Sheet Apps Script (Attempt ${attempt}/${attempts}):`, err?.message || String(err));
        lastError = {
          error: "Failed to connect to Google Sheets Apps Script",
          details: err?.message || String(err),
          instructions: "setHeaders is not a function"
        };
      }

      if (attempt < attempts) {
        // Small exponential backoff before retry (e.g., 300ms, 600ms)
        const delay = attempt * 300;
        console.log(`Retrying fetch in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If all attempts failed, try to fetch the CSV directly from Google Sheets export URL
    try {
      console.log("Apps Script fetch failed. Attempting direct Google Sheets CSV export fetch as a robust fallback...");
      const csvUrl = 'https://docs.google.com/spreadsheets/d/1742rjytpxN5dzAZbCxeZ4EBF3kcalT6-GGatGcIZ4EU/export?format=csv';
      const csvResponse = await fetch(csvUrl);
      if (csvResponse.ok) {
        const csvText = await csvResponse.text();
        const rawProducts = parseCSV(csvText);
        const productsArray = rawProducts.map((item: any) => {
          if (!item) return null;
          const name = String(item.name || item.nameEn || item.nameAr || '').trim();
          if (name.length === 0) return null;

          const imageStr = String(item.image || '').trim();
          const imageUrls = imageStr
            .split(/[\r\n,\s]+/)
            .map(s => {
              let cleaned = s.trim().replace(/^["'`\s\[\(]+|["'`\s\]\)]+$/g, '');
              if (/^https?:\/\//i.test(cleaned)) {
                cleaned = cleaned.replace(/^https?:\/\//i, (match) => match.toLowerCase());
              }
              return cleaned;
            })
            .filter(Boolean)
            .filter(u => u.toLowerCase().startsWith('http') && (u.toLowerCase().includes('postimg') || u.toLowerCase().includes('postimage')));
          
          if (imageUrls.length === 0) {
            console.log(`Excluding fallback product "${name}" because it does not have valid postimg/postimage image URLs.`);
            return null;
          }

          return {
            id: String(item.id || ''),
            nameEn: item.name || '',
            nameAr: item.name || '',
            descriptionEn: item.description || '',
            descriptionAr: item.description || '',
            price: String(item.price || '').trim(),
            sale_price: String(item.sale_price || '').trim(),
            specs: String(item.specs || '').trim(),
            category: item.category || 'all',
            image: imageUrls[0],
            images: imageUrls
          };
        }).filter(Boolean);

        console.log(`Successfully fetched and parsed ${productsArray.length} products from direct CSV export fallback.`);
        const result = { success: true, products: productsArray };
        cachedResult = result;
        lastFetched = Date.now();
        return result;
      }
    } catch (csvErr: any) {
      console.error("Direct CSV export fallback failed too:", csvErr);
    }

    // If all attempts failed:
    if (cachedResult && cachedResult.success) {
      console.log("All fetch attempts failed. Falling back to fresh server cache.");
      return cachedResult;
    }

    console.log("All fetch attempts failed and no server cache exists. Falling back to default static products list.");
    return {
      success: true,
      products: PRODUCTS,
      error: lastError?.error,
      details: lastError?.details,
      instructions: lastError?.instructions
    };
  } finally {
    isFetching = false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json());

  // API Route: Fetch products with caching layer (Stale-While-Revalidate)
  app.get("/api/products", async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const now = Date.now();
    
    // 1. If cache is fresh (< CACHE_TTL), return it instantly!
    if (cachedResult && cachedResult.success && (now - lastFetched < CACHE_TTL)) {
      console.log("Returning fresh cached products list instantly.");
      return res.json(cachedResult.products);
    }

    // Otherwise, fetch synchronously (first load or expired cache)
    console.log("Cache expired or empty. Fetching synchronously...");
    const result = await fetchProductsFromSheet();
    
    if (result.success) {
      return res.json(result.products);
    } else {
      // If synchronous fetch failed but we have stale cache, fallback to it
      if (cachedResult && cachedResult.success && cachedResult.products) {
        console.log("Synchronous fetch failed. Falling back to stale cached products.");
        return res.json(cachedResult.products);
      }
      return res.json(result);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Pre-warm cache on startup
  fetchProductsFromSheet().catch(err => {
    console.log("Failed to pre-warm cache on startup:", err);
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
