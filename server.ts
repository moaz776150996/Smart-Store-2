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

async function fetchProductsFromSheet(): Promise<SheetResult> {
  if (isFetching) {
    return cachedResult || { success: true, products: PRODUCTS };
  }
  isFetching = true;
  console.log("Fetching products from Google Sheets Apps Script with robust retry...");
  
  let lastError: any = null;
  let attempts = 3;
  
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout
      
      const response = await fetch('https://script.google.com/macros/s/AKfycbxJBtIIjNMX_bixahUQWOjZ1zdOD3K_B0_Cn4fJxCfj7VVn2enEbpWrc9K3LDyUwyn2qQ/exec', {
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
          
          const productsArray = rawProducts.filter((item: any) => {
            if (!item) return false;
            const name = String(item.name || item.nameEn || item.nameAr || '').trim();
            return name.length > 0;
          }).map((item: any) => {
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
              .filter(u => u.toLowerCase().startsWith('http'));
            
            return {
              ...item,
              image: imageUrls[0] || '',
              images: imageUrls
            };
          });

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

  // If all attempts failed:
  isFetching = false;
  if (cachedResult && cachedResult.success) {
    console.log("All fetch attempts failed. Falling back to fresh server cache.");
    return cachedResult;
  }

  console.log("All fetch attempts failed and no server cache exists. Falling back to default static products list.");
  return {
    success: true, // We set success to true because we provide valid products fallback!
    products: PRODUCTS,
    error: lastError?.error,
    details: lastError?.details,
    instructions: lastError?.instructions
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json());

  // API Route: Fetch products with caching layer (Stale-While-Revalidate)
  app.get("/api/products", async (req, res) => {
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
