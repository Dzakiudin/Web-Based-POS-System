/**
 * Preloaded catalog of popular Indonesian FMCG / retail product barcodes
 * and deep multi-source lookup via backend Scrapling engine (Mega Swalayan,
 * Reny Swalayanku, Go-UPC, Open Food/Beauty/Products Facts, UPCitemdb,
 * Buycott, BarcodeSpider, Yahoo Indonesia) with direct browser fallback.
 */
import api from './axios';

export interface BarcodeProductInfo {
    barcode: string;
    name: string;
    brand?: string;
    category?: string;
    suggestedPrice?: number;
    costPrice?: number;
    image?: string;
    source?: string;
    cached?: boolean;
}

// Popular Indonesian Retail Products Barcodes for instant zero-latency offline / instant match
const INDONESIAN_RETAIL_CATALOG: Record<string, Omit<BarcodeProductInfo, 'barcode'>> = {
    // Air Mineral & Minuman Ringan
    '8886008101053': {
        name: 'Aqua Air Mineral Botol 600ml',
        brand: 'Danone Aqua',
        category: 'Minuman',
        suggestedPrice: 4000,
        costPrice: 2500,
    },
    '8886008101091': {
        name: 'Aqua Air Mineral Botol 1500ml',
        brand: 'Danone Aqua',
        category: 'Minuman',
        suggestedPrice: 7000,
        costPrice: 4800,
    },
    '8886008101015': {
        name: 'Aqua Air Mineral Gelas 220ml',
        brand: 'Danone Aqua',
        category: 'Minuman',
        suggestedPrice: 1000,
        costPrice: 650,
    },
    '8996001600269': {
        name: 'Le Minerale Air Mineral 600ml',
        brand: 'Le Minerale',
        category: 'Minuman',
        suggestedPrice: 3500,
        costPrice: 2200,
    },
    '8996001600276': {
        name: 'Le Minerale Air Mineral 1500ml',
        brand: 'Le Minerale',
        category: 'Minuman',
        suggestedPrice: 6500,
        costPrice: 4500,
    },
    '8996001600146': {
        name: 'Teh Pucuk Harum Jasmine 350ml',
        brand: 'Mayora',
        category: 'Minuman',
        suggestedPrice: 4000,
        costPrice: 2700,
    },
    '8999999195044': {
        name: 'Teh Botol Sosro Kotak 250ml',
        brand: 'Sosro',
        category: 'Minuman',
        suggestedPrice: 4000,
        costPrice: 2800,
    },
    '8992761136015': {
        name: 'Pocari Sweat Botol 500ml',
        brand: 'Pocari Sweat',
        category: 'Minuman',
        suggestedPrice: 8500,
        costPrice: 6500,
    },
    '8998866200225': {
        name: 'Bear Brand Susu Steril 189ml',
        brand: 'Nestle Bear Brand',
        category: 'Minuman',
        suggestedPrice: 11000,
        costPrice: 9000,
    },
    '8998009010613': {
        name: 'Ultra Milk Susu UHT Full Cream 250ml',
        brand: 'Ultra Jaya',
        category: 'Minuman',
        suggestedPrice: 6500,
        costPrice: 4800,
    },
    '8998009010620': {
        name: 'Ultra Milk Susu UHT Cokelat 250ml',
        brand: 'Ultra Jaya',
        category: 'Minuman',
        suggestedPrice: 6500,
        costPrice: 4800,
    },
    '8991002101234': {
        name: 'Kopiko 78C Coffee Latte 240ml',
        brand: 'Kopiko',
        category: 'Coffee & Espresso',
        suggestedPrice: 7000,
        costPrice: 5000,
    },
    '8998989100128': {
        name: 'Good Day Moccacinno Botol 250ml',
        brand: 'Good Day',
        category: 'Coffee & Espresso',
        suggestedPrice: 7500,
        costPrice: 5500,
    },

    // Mi Instan (Indomie, Sedaap, dll)
    '0089686010947': {
        name: 'Indomie Mi Goreng Spesial 85g',
        brand: 'Indomie',
        category: 'Makanan',
        suggestedPrice: 3500,
        costPrice: 2800,
    },
    '089686010947': {
        name: 'Indomie Mi Goreng Spesial 85g',
        brand: 'Indomie',
        category: 'Makanan',
        suggestedPrice: 3500,
        costPrice: 2800,
    },
    '8999999056239': {
        name: 'Indomie Mi Goreng Spesial 85g',
        brand: 'Indomie',
        category: 'Makanan',
        suggestedPrice: 3500,
        costPrice: 2800,
    },
    '0089686011104': {
        name: 'Indomie Kuah Rasa Ayam Bawang 69g',
        brand: 'Indomie',
        category: 'Makanan',
        suggestedPrice: 3500,
        costPrice: 2800,
    },
    '0089686011111': {
        name: 'Indomie Kuah Rasa Soto Mie 70g',
        brand: 'Indomie',
        category: 'Makanan',
        suggestedPrice: 3500,
        costPrice: 2800,
    },
    '8998866200010': {
        name: 'Mie Sedaap Goreng 90g',
        brand: 'Wings Food',
        category: 'Makanan',
        suggestedPrice: 3500,
        costPrice: 2750,
    },
    '8998866200027': {
        name: 'Mie Sedaap Kuah Soto 75g',
        brand: 'Wings Food',
        category: 'Makanan',
        suggestedPrice: 3500,
        costPrice: 2750,
    },

    // Biskuit, Cokelat & Camilan
    '8994834007682': {
        name: 'Goriorio Biskuit Sandwich Rasa Vanilla',
        brand: 'Goriorio',
        category: 'Snacks & Finger Food',
        suggestedPrice: 1000,
        costPrice: 750,
    },
    '8992760221028': {
        name: 'Oreo Original Biskuit Vanilla 133g',
        brand: 'Mondelez Oreo',
        category: 'Snacks & Finger Food',
        suggestedPrice: 10500,
        costPrice: 8200,
    },
    '8992759114018': {
        name: 'Chitato Sapi Panggang 68g',
        brand: 'Indofood Chitato',
        category: 'Snacks & Finger Food',
        suggestedPrice: 11500,
        costPrice: 9000,
    },
    '8992759114025': {
        name: 'Lays Rasa Rumput Laut 68g',
        brand: 'Lays',
        category: 'Snacks & Finger Food',
        suggestedPrice: 11000,
        costPrice: 8500,
    },
    '8991102210012': {
        name: 'Silverqueen Chocolate Cashew 58g',
        brand: 'Silverqueen',
        category: 'Snacks & Finger Food',
        suggestedPrice: 16500,
        costPrice: 13000,
    },
    '8991001410118': {
        name: 'Beng-Beng Wafer Cokelat 25g',
        brand: 'Mayora Beng-Beng',
        category: 'Snacks & Finger Food',
        suggestedPrice: 2500,
        costPrice: 1800,
    },
    '8991001300129': {
        name: 'Roma Biskuit Kelapa 300g',
        brand: 'Mayora Roma',
        category: 'Snacks & Finger Food',
        suggestedPrice: 12000,
        costPrice: 9500,
    },

    // Kebutuhan & Bumbu Dapur
    '8992770094117': {
        name: 'Saori Saos Tiram 133ml',
        brand: 'Ajinomoto',
        category: 'Makanan',
        suggestedPrice: 11500,
        costPrice: 9000,
    },
    '8998866105279': {
        name: 'Shampo & Conditioner Kodomo 200ml',
        brand: 'Kodomo Lion',
        category: 'Perawatan & Kebersihan',
        suggestedPrice: 14000,
        costPrice: 11000,
    },
    '8999999710322': {
        name: 'Lifebuoy Sabun Cair Total 10 450ml',
        brand: 'Unilever Lifebuoy',
        category: 'Perawatan & Kebersihan',
        suggestedPrice: 24000,
        costPrice: 19500,
    },
    '8999999026416': {
        name: 'Pepsodent Pasta Gigi Pencegah Gigi Berlubang 190g',
        brand: 'Pepsodent',
        category: 'Perawatan & Kebersihan',
        suggestedPrice: 14500,
        costPrice: 11500,
    },
    '8999999516627': {
        name: 'Sunlight Sabun Cuci Piring Jeruk Nipis 750ml',
        brand: 'Unilever Sunlight',
        category: 'Kebutuhan Rumah',
        suggestedPrice: 16000,
        costPrice: 13000,
    },
};

/**
 * Robust extractor that handles incomplete / user-submitted data models from Open Food Facts,
 * including cases where product titles are stored in categories or category tags.
 */
function extractProductInfo(p: any, cleanCode: string): BarcodeProductInfo | null {
    if (!p) return null;

    // 1. Extract Name
    let rawName =
        p.product_name_id ||
        p.product_name ||
        p.product_name_en ||
        p.generic_name_id ||
        p.generic_name ||
        p.abbreviated_product_name;

    // If explicit product name is missing, extract from categories / categories_tags
    // (very common for Indonesian products where contributor typed title into category field)
    if (!rawName && p.categories && typeof p.categories === 'string') {
        const firstCat = p.categories.split(',')[0].replace(/^[a-z]{2}:/i, '').trim();
        if (firstCat && !firstCat.startsWith('en:')) {
            rawName = firstCat;
        }
    }

    if (!rawName && Array.isArray(p.categories_tags) && p.categories_tags.length > 0) {
        for (const tag of p.categories_tags) {
            const cleanTag = String(tag).replace(/^[a-z]{2}:/i, '').trim();
            if (cleanTag && !cleanTag.startsWith('en:')) {
                rawName = cleanTag;
                break;
            }
        }
    }

    if (!rawName && p.brands) {
        rawName = String(p.brands).trim();
    }

    if (!rawName) return null;

    // Clean up name
    let name = String(rawName).trim();

    // 2. Extract Brand
    let brand = (p.brands && typeof p.brands === 'string') ? p.brands.trim() : '';
    if (!brand) {
        // If name starts with all-caps brand like "GORIORIO", "INDOMIE", extract it
        const firstWord = name.split(' ')[0];
        if (firstWord && firstWord.length >= 3 && firstWord === firstWord.toUpperCase()) {
            brand = firstWord;
        }
    }

    // Prepend brand if not already in title
    if (brand && !name.toLowerCase().includes(brand.toLowerCase())) {
        name = `${brand} ${name}`;
    }

    // 3. Extract Category
    let category = p.categories?.split(',')[0]?.replace(/^[a-z]{2}:/i, '')?.trim();
    if (!category || category === name) {
        // Infer category from product name keywords
        const lower = name.toLowerCase();
        if (lower.match(/biskuit|biscuit|wafer|snack|kripik|keripik|chitato|lays|taro|oreo|goriorio|kue|roti/)) {
            category = 'Snacks & Finger Food';
        } else if (lower.match(/mie|noodle|rice|nasi|bubur|makanan/)) {
            category = 'Makanan';
        } else if (lower.match(/air|mineral|teh|kopi|coffee|tea|susu|milk|juice|jus|drink|beverage|minuman/)) {
            category = 'Minuman';
        } else if (lower.match(/sabun|shampo|odol|pasta gigi|deterjen|pembersih|care/)) {
            category = 'Perawatan & Kebersihan';
        }
    }

    // 4. Extract Image
    const image = p.image_front_small_url || p.image_url || undefined;

    return {
        barcode: cleanCode,
        name,
        brand,
        category,
        image,
    };
}

/**
 * Searches local catalog first, then falls back to Open Food Facts,
 * Open Beauty Facts, and Open Products Facts public APIs in real-time.
 */
export async function lookupBarcodeInfo(barcode: string): Promise<BarcodeProductInfo | null> {
    const cleanCode = barcode.trim();
    if (!cleanCode) return null;

    // 1. Direct local catalog check (0 latency match)
    if (INDONESIAN_RETAIL_CATALOG[cleanCode]) {
        const item = INDONESIAN_RETAIL_CATALOG[cleanCode];
        return { barcode: cleanCode, ...item, source: 'katalog-lokal' };
    }

    // Try without leading zeros or with leading zero in local catalog
    const unpadded = cleanCode.replace(/^0+/, '');
    if (unpadded && INDONESIAN_RETAIL_CATALOG[unpadded]) {
        const item = INDONESIAN_RETAIL_CATALOG[unpadded];
        return { barcode: cleanCode, ...item, source: 'katalog-lokal' };
    }

    // 2. Backend Deep Scrapling Multi-Source Engine (10+ Indonesian & global sources + PostgreSQL cache)
    try {
        const res = await api.get(`/products/barcode-lookup/${encodeURIComponent(cleanCode)}`, {
            timeout: 18000,
        });
        const data = res.data;
        if (data && data.found && data.name) {
            return {
                barcode: data.barcode || cleanCode,
                name: String(data.name).trim(),
                brand: data.brand ? String(data.brand).trim() : undefined,
                category: data.category ? String(data.category).trim() : undefined,
                suggestedPrice:
                    typeof data.suggestedPrice === 'number' && data.suggestedPrice > 0
                        ? Math.round(data.suggestedPrice)
                        : undefined,
                image: data.image ? String(data.image) : undefined,
                source: data.source ? String(data.source) : 'scrapling',
                cached: Boolean(data.cached),
            };
        }
    } catch {
        // Fallback to direct client-side public APIs if backend scraper is unreachable
    }

    // 3. Direct browser fallback (Open Food / Beauty / Products Facts)
    // Prepare code variations (exact, 13-digit padded with 0, or unpadded)
    const codeVariants = [cleanCode];
    if (cleanCode.length === 12) codeVariants.push('0' + cleanCode);
    if (cleanCode.length === 13 && cleanCode.startsWith('0')) codeVariants.push(cleanCode.slice(1));

    const fields = 'product_name,product_name_id,product_name_en,generic_name,generic_name_id,brands,categories,categories_tags,image_front_small_url';

    for (const code of codeVariants) {
        // Step A: Query Open Food Facts v2
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`, {
                signal: controller.signal,
                headers: { 'User-Agent': 'WebPOSPro - Retail Assistant - Version 2.0' },
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data.status === 1 && data.product) {
                    const info = extractProductInfo(data.product, cleanCode);
                    if (info) return info;
                }
            }
        } catch {
            // fallback to next service
        }

        // Step B: Query Open Beauty Facts (Cosmetics, Body Care, Shampoos, Soaps) ONLY if Food Facts didn't resolve
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const res = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${code}.json?fields=${fields}`, {
                signal: controller.signal,
                headers: { 'User-Agent': 'WebPOSPro - Retail Assistant - Version 2.0' },
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data.status === 1 && data.product) {
                    const info = extractProductInfo(data.product, cleanCode);
                    if (info) return info;
                }
            }
        } catch {
            // fallback
        }

        // Step C: Query Open Products Facts (General Goods & Household)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const res = await fetch(`https://world.openproductsfacts.org/api/v2/product/${code}.json?fields=${fields}`, {
                signal: controller.signal,
                headers: { 'User-Agent': 'WebPOSPro - Retail Assistant - Version 2.0' },
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data.status === 1 && data.product) {
                    const info = extractProductInfo(data.product, cleanCode);
                    if (info) return info;
                }
            }
        } catch {
            // fallback
        }
    }

    return null;
}
