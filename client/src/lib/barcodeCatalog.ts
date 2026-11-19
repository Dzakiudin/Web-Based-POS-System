/**
 * Preloaded catalog of popular Indonesian FMCG / retail product barcodes
 * and online lookup utility via Open Food Facts API.
 */

export interface BarcodeProductInfo {
    barcode: string;
    name: string;
    brand?: string;
    category?: string;
    suggestedPrice?: number;
    costPrice?: number;
    image?: string;
}

// Popular Indonesian Retail Products Barcodes for instant zero-latency match
const INDONESIAN_RETAIL_CATALOG: Record<string, Omit<BarcodeProductInfo, 'barcode'>> = {
    '8999999056239': {
        name: 'Indomie Mi Goreng Spesial 85g',
        brand: 'Indomie',
        category: 'Makanan',
        suggestedPrice: 3500,
        costPrice: 2800,
    },
    '8999999056246': {
        name: 'Indomie Kuah Rasa Ayam Bawang 69g',
        brand: 'Indomie',
        category: 'Makanan',
        suggestedPrice: 3500,
        costPrice: 2800,
    },
    '8999999056253': {
        name: 'Indomie Kuah Rasa Soto Mie 70g',
        brand: 'Indomie',
        category: 'Makanan',
        suggestedPrice: 3500,
        costPrice: 2800,
    },
    '8992388111003': {
        name: 'Aqua Air Mineral Botol 600ml',
        brand: 'Aqua',
        category: 'Minuman',
        suggestedPrice: 4000,
        costPrice: 2500,
    },
    '8992388111010': {
        name: 'Aqua Air Mineral Botol 1500ml',
        brand: 'Aqua',
        category: 'Minuman',
        suggestedPrice: 7000,
        costPrice: 4800,
    },
    '8996001304212': {
        name: 'Le Minerale Air Mineral 600ml',
        brand: 'Le Minerale',
        category: 'Minuman',
        suggestedPrice: 3500,
        costPrice: 2300,
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
    '8992772111117': {
        name: 'Ultra Milk Susu UHT Cokelat 250ml',
        brand: 'Ultra Milk',
        category: 'Minuman',
        suggestedPrice: 6500,
        costPrice: 4800,
    },
    '8992772111124': {
        name: 'Ultra Milk Susu UHT Full Cream 250ml',
        brand: 'Ultra Milk',
        category: 'Minuman',
        suggestedPrice: 6500,
        costPrice: 4800,
    },
    '8991001001': {
        name: 'Kopi Susu Gula Aren 250ml',
        brand: 'POS Cafe',
        category: 'Coffee & Espresso',
        suggestedPrice: 18000,
        costPrice: 8000,
    },
    '8991001002': {
        name: 'Americano Ice 350ml',
        brand: 'POS Cafe',
        category: 'Coffee & Espresso',
        suggestedPrice: 15000,
        costPrice: 6000,
    },
    '8991002001': {
        name: 'Matcha Latte Ice 350ml',
        brand: 'POS Cafe',
        category: 'Non-Coffee & Tea',
        suggestedPrice: 22000,
        costPrice: 10000,
    },
    '8991003001': {
        name: 'Rice Bowl Beef Teriyaki',
        brand: 'POS Kitchen',
        category: 'Makanan & Rice Bowls',
        suggestedPrice: 35000,
        costPrice: 19000,
    },
    '8992759114018': {
        name: 'Chitato Rasa Sapi Panggang 68g',
        brand: 'Chitato',
        category: 'Snacks & Finger Food',
        suggestedPrice: 11000,
        costPrice: 8500,
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
        suggestedPrice: 16000,
        costPrice: 12500,
    },
    '8991002101234': {
        name: 'Kopiko 78C Coffee Latte 240ml',
        brand: 'Kopiko',
        category: 'Coffee & Espresso',
        suggestedPrice: 7000,
        costPrice: 5000,
    },
    '8998866200225': {
        name: 'Bear Brand Susu Steril 189ml',
        brand: 'Nestle Bear Brand',
        category: 'Minuman',
        suggestedPrice: 10500,
        costPrice: 8800,
    },
};

/**
 * Searches local catalog first, then falls back to Open Food Facts public API
 */
export async function lookupBarcodeInfo(barcode: string): Promise<BarcodeProductInfo | null> {
    const cleanCode = barcode.trim();
    if (!cleanCode) return null;

    // 1. Direct match in Indonesian retail dictionary
    if (INDONESIAN_RETAIL_CATALOG[cleanCode]) {
        const item = INDONESIAN_RETAIL_CATALOG[cleanCode];
        return {
            barcode: cleanCode,
            name: item.name,
            brand: item.brand,
            category: item.category,
            suggestedPrice: item.suggestedPrice,
            costPrice: item.costPrice,
            image: item.image,
        };
    }

    // 2. Query Open Food Facts API (timeout 3.5s to avoid lagging)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cleanCode}.json`, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'WebPOSPro - Retail Assistant - Version 2.0',
            },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data.status === 1 && data.product) {
                const p = data.product;
                const name =
                    p.product_name ||
                    p.product_name_id ||
                    p.product_name_en ||
                    p.generic_name ||
                    p.brands ||
                    `Produk Barcode ${cleanCode}`;
                const brand = p.brands || '';
                const image = p.image_front_small_url || p.image_url || undefined;

                return {
                    barcode: cleanCode,
                    name: brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${name}` : name,
                    brand,
                    category: p.categories?.split(',')[0]?.trim() || undefined,
                    image,
                };
            }
        }
    } catch {
        // Network timeout or offline mode, gracefully ignore
    }

    return null;
}
