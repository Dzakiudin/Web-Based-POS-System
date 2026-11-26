#!/usr/bin/env python3
"""
Deep Multi-Source Retail & F&B Barcode Lookup Engine powered by D4Vinci/Scrapling.

Queries Indonesian supermarket catalogs (Mega Swalayan, Reny Swalayanku),
global barcode registries (Go-UPC, Open Food/Beauty/Products Facts, UPCitemdb,
Buycott, BarcodeSpider), and strict-verified Yahoo Indonesia web search in parallel.

Outputs a single JSON object to stdout for consumption by server-rust.
"""

from __future__ import annotations

import concurrent.futures
import html
import json
import logging
import re
import sys
import urllib.parse
from typing import Any, Dict, List, Optional

# Silence noisy Scrapling/curl_cffi logs on stdout; keep warnings on stderr only
logging.basicConfig(level=logging.ERROR, stream=sys.stderr)
for noisy in ("scrapling", "curl_cffi", "urllib3", "asyncio"):
    logging.getLogger(noisy).setLevel(logging.CRITICAL)

from scrapling.fetchers import Fetcher  # noqa: E402

# Scrapling configures its own StreamHandler on import; silence it so stdout stays pure JSON
for _lg_name in ("scrapling", "scrapling.fetchers", "curl_cffi"):
    _lg = logging.getLogger(_lg_name)
    _lg.handlers.clear()
    _lg.propagate = False
    _lg.setLevel(logging.CRITICAL)


KEEP_UPPER = {
    "UHT", "RTD", "BBQ", "ABC", "B29", "XL", "XXL", "SML", "MSG",
    "LED", "USB", "UV", "SPF", "AHA", "BHA", "VIT", "DHA", "EPA",
    "KFC", "MUI", "BPOM", "SNI", "ID", "PH", "TV", "AC",
}

UNIT_RE = re.compile(r"^(\d+(?:[.,]\d+)?)(ML|GR|G|KG|L|LTR|CC|PCS|PC|SACH|SACHET|BTL|KLG|PACK|PAK|BOX|DUS)$", re.I)

NOISE_TITLE_PATTERNS = (
    "product not found",
    "page not found",
    "not found",
    "404",
    "error",
    "just a moment",
    "security verification",
    "access denied",
    "captcha",
    "cek barcode",
    "arti angka",
    "barcode lookup",
    "pencarian nomor",
    "pelacakan paket",
    "cek produk",
    "cek halal",
    "cek status bpom",
    "badan pengawas",
    "verified indonesia business",
)

SITE_SUFFIX_RE = re.compile(
    r"\s*(?:\||—|–|-)\s*(?:Mega Swalayan|Reny Swalayanku|Go-UPC|Buycott|Barcode Spider|"
    r"EAN Lookup|Tokopedia|Shopee(?:\s+Indonesia)?|Blibli(?:\.com)?|Lazada(?:\.co\.id)?|"
    r"Bukalapak|KlikIndomaret|Alfagift|RedMed Pharmacy Online|MAXsi Mart|Scribd|"
    r"Open Food Facts.*|UPCitemdb.*)\s*$",
    re.I,
)

LEADING_STORE_RE = re.compile(
    r"^(?:Mega Swalayan|Reny Swalayanku|Jual|Beli|Harga|Promo)\s*(?:[-–—:]\s*|\s+)",
    re.I,
)


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(text or "")).strip()


def is_noise_title(title: str, barcode: str) -> bool:
    t = normalize_whitespace(title).lower()
    if len(t) < 3:
        return True
    if t.replace("-", "").replace(" ", "") == barcode:
        return True
    if re.fullmatch(r"(?:ean|upc|gtin|barcode|sku)?\s*[:#-]?\s*\d{6,14}", t):
        return True
    return any(p in t for p in NOISE_TITLE_PATTERNS)


def smart_title_case(raw: str, strip_carton_suffix: bool = False) -> str:
    s = normalize_whitespace(raw)
    # Strip leading barcode if present (e.g. "8996001600146 - Minuman Teh Pucuk Harum")
    s = re.sub(r"^\d{8,14}\s*[-–—:|]\s*", "", s)
    s = re.sub(r"^[–—-]\s*", "", s)
    # Strip trailing store names iteratively
    for _ in range(3):
        next_s = SITE_SUFFIX_RE.sub("", s).strip()
        if next_s == s:
            break
        s = next_s
    # Strip leading store name prefix (e.g. "Mega Swalayan - LE MINERALE 600ML")
    for _ in range(2):
        next_s = LEADING_STORE_RE.sub("", s).strip()
        if next_s == s:
            break
        s = next_s

    # Strip Japanese/CJK bilingual slash suffixes like "Indomie Mi Goreng / インドミー..."
    s = re.sub(r"\s*/\s*[\u3000-\u9fff\uff00-\uffef].*$", "", s).strip()

    # Strip distributor carton multiplier at end (e.g., "350ML X 24", "75G X 40")
    if strip_carton_suffix:
        s = re.sub(r"\s+[xX×]\s*\d{1,3}\s*$", "", s).strip()

    # If mostly ALL CAPS, convert nicely to Title Case while preserving units & acronyms
    letters = [c for c in s if c.isalpha()]
    if letters and sum(1 for c in letters if c.isupper()) / len(letters) > 0.72:
        words = s.split(" ")
        formatted: List[str] = []
        for w in words:
            clean_u = w.upper().strip("()[].,")
            m_unit = UNIT_RE.match(w)
            if m_unit:
                num, unit = m_unit.group(1), m_unit.group(2).lower()
                if unit == "l":
                    unit = "L"
                elif unit == "gr":
                    unit = "g"
                formatted.append(f"{num}{unit}")
            elif clean_u in KEEP_UPPER:
                formatted.append(w.upper())
            elif w.lower() in {"dan", "di", "ke", "dari", "isi", "rasa", "btl", "klg", "pcs"}:
                formatted.append(w.lower() if formatted else w.capitalize())
            else:
                formatted.append(w.capitalize())
        s = " ".join(formatted)

    # Normalize common Indonesian abbreviations
    s = re.sub(r"\bbtl\b", "Botol", s, flags=re.I)
    s = re.sub(r"\bklg\b", "Kaleng", s, flags=re.I)
    s = re.sub(r"\b(\d+)\s+ml\b", r"\1ml", s, flags=re.I)
    s = re.sub(r"\b(\d+)\s+gr\b", r"\1g", s, flags=re.I)
    s = re.sub(r"\b(\d+)\s+g\b", r"\1g", s, flags=re.I)
    return normalize_whitespace(s)


def infer_category(name: str, raw_category: str = "") -> str:
    combined = f"{raw_category} {name}".lower()
    if re.search(
        r"\b(air|mineral|water|teh|tea|kopi|coffee|susu|milk|uht|jus|juice|sirup|syrup|"
        r"soda|cola|sprite|fanta|pocari|isotonic|isotonik|ion|minuman|drink|beverage|"
        r"rtd|ready to drink|cincau|yakult|yogurt|yoghurt|floridina|pucuk|le minerale|aqua|club|cleo|vit|pristine|good day|kapal api|luwak|torabika|nescafe)\b",
        combined,
    ):
        return "Minuman"
    if re.search(
        r"\b(biskuit|biscuit|wafer|snack|kripik|keripik|chips|chitato|lays|taro|oreo|"
        r"nabati|tango|beng[\s-]?beng|chocolatos|silverqueen|coklat|cokelat|chocolate|"
        r"permen|candy|kacang|peanut|kuaci|popcorn|cracker|crackers|malkist|roma|regal|"
        r"goriorio|astor|pocky|ritz|oat|kue|roti|cake|bread|pastry|donut|donat)\b",
        combined,
    ):
        return "Snacks & Finger Food"
    if re.search(
        r"\b(mie|mi\s+goreng|mi\s+instan|noodle|indomie|sedaap|sarimi|supermi|pop\s+mie|"
        r"bihun|soun|pasta|spaghetti|makaroni|bubur|sereal|cereal|oatmeal|sarden|kornet|"
        r"nugget|sosis|bakso|makanan|food|meal)\b",
        combined,
    ):
        return "Makanan"
    if re.search(
        r"\b(minyak|goreng|beras|gula|garam|tepung|kecap|saus|saos|sambal|bumbu|royco|"
        r"masako|sasa|micin|penyedap|mentega|margarin|blue\s*band|santan|kara|kaldu|terasi|"
        r"sembako|cooking|seasoning|condiment)\b",
        combined,
    ):
        return "Bumbu & Sembako"
    if re.search(
        r"\b(sabun|soap|shampo|shampoo|odol|pasta\s*gigi|pepsodent|ciptadent|sikat\s*gigi|"
        r"deterjen|detergent|rinso|daia|attack|so\s*klin|pewangi|molto|downy|sunlight|"
        r"mama\s*lemon|pembersih|wipol|karbol|tisu|tissue|paseo|nice|popok|diaper|pembalut|"
        r"deodoran|parfum|lotion|bedak|facial|skincare|cosmetic|beauty|hygiene|care)\b",
        combined,
    ):
        return "Perawatan & Kebersihan"
    if re.search(
        r"\b(obat|vitamin|tolak\s*angin|antangin|balsem|minyak\s*kayu\s*putih|bodrex|"
        r"panadol|paramex|promag|mylanta|betadine|hansaplast|masker|kesehatan|health|pharmacy)\b",
        combined,
    ):
        return "Kesehatan"
    return raw_category.strip() if raw_category and len(raw_category.strip()) <= 36 else "Makanan & Minuman"


def parse_price_idr(val: Any) -> Optional[int]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        p = int(round(val))
        return p if 100 <= p <= 50_000_000 else None
    s = str(val).strip()
    if not s:
        return None
    # Match Indonesian thousands formatting like 3.500 or 15,500 or 3500.00
    m = re.search(r"(\d{1,3}(?:[.,]\d{3})+|\d{3,8})(?:[.,]\d{1,2})?", s)
    if not m:
        return None
    digits = re.sub(r"[^\d]", "", m.group(1))
    if not digits:
        return None
    p = int(digits)
    return p if 100 <= p <= 50_000_000 else None


def extract_json_object_around_barcode(body: str, code: str) -> Optional[Dict[str, Any]]:
    needle = f'"barcode":"{code}"'
    idx = body.find(needle)
    if idx == -1:
        needle = f'"barcode": "{code}"'
        idx = body.find(needle)
    if idx == -1:
        return None
    start = body.rfind("{", 0, idx)
    if start == -1:
        return None
    depth = 0
    in_str = False
    esc = False
    end = -1
    limit = min(len(body), start + 8000)
    for i in range(start, limit):
        ch = body[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
    if end == -1:
        return None
    try:
        return json.loads(body[start:end])
    except Exception:
        return None


def fetch_arti_supermarket(host: str, source_id: str, codes: List[str]) -> Optional[Dict[str, Any]]:
    for code in codes:
        try:
            url = f"{host}/web/products?search={urllib.parse.quote(code)}"
            r = Fetcher.get(url, timeout=6, retries=1, stealthy_headers=True, follow_redirects=True)
            if r.status != 200:
                continue
            body = r.body.decode("utf-8", errors="ignore")
            obj = extract_json_object_around_barcode(body, code)
            if not obj:
                continue
            raw_name = str(obj.get("name") or "").strip()
            if not raw_name or is_noise_title(raw_name, code):
                continue
            price = parse_price_idr(obj.get("sale_price") or obj.get("normal_price"))
            # Supermarket catalogs often list unit retail price with "X 24" carton hint in title
            clean_name = smart_title_case(raw_name, strip_carton_suffix=bool(price and price < 50000))
            brand = smart_title_case(str(obj.get("brand") or "").strip())
            if brand.lower() in {"-", "none", "null", "n/a", "no brand", "tanpa merek"}:
                brand = ""
            raw_cat = str(obj.get("category") or "").strip()
            image = str(obj.get("image_url") or "").strip() or None
            if image and not image.startswith("http"):
                image = None
            return {
                "name": clean_name,
                "brand": brand,
                "category": infer_category(clean_name, raw_cat),
                "image": image,
                "suggestedPrice": price,
                "source": source_id,
                "score": 95,
            }
        except Exception:
            continue
    return None


def fetch_openfacts(base_url: str, source_id: str, codes: List[str]) -> Optional[Dict[str, Any]]:
    fields = "product_name,product_name_id,product_name_en,generic_name,generic_name_id,brands,categories,categories_tags,quantity,image_front_small_url,image_url"
    for code in codes:
        try:
            url = f"{base_url}/api/v2/product/{urllib.parse.quote(code)}.json?fields={fields}"
            r = Fetcher.get(url, timeout=5, retries=1, stealthy_headers=True)
            if r.status != 200:
                continue
            data = json.loads(r.body.decode("utf-8", errors="ignore"))
            if data.get("status") != 1 or not data.get("product"):
                continue
            p = data["product"]
            raw_name = (
                p.get("product_name_id")
                or p.get("product_name")
                or p.get("product_name_en")
                or p.get("generic_name_id")
                or p.get("generic_name")
            )
            if not raw_name and isinstance(p.get("categories"), str):
                first_cat = re.sub(r"^[a-z]{2}:", "", p["categories"].split(",")[0], flags=re.I).strip()
                if first_cat:
                    raw_name = first_cat
            if not raw_name:
                continue
            name = smart_title_case(str(raw_name))
            if is_noise_title(name, code):
                continue
            brand = smart_title_case(str(p.get("brands") or "").split(",")[0].strip())
            if brand and brand.lower() not in name.lower():
                name = f"{brand} {name}"
            qty = str(p.get("quantity") or "").strip()
            if qty and qty.lower() not in name.lower() and len(qty) <= 16:
                name = f"{name} {qty}"
            raw_cat = ""
            if isinstance(p.get("categories"), str):
                raw_cat = re.sub(r"^[a-z]{2}:", "", p["categories"].split(",")[0], flags=re.I).strip()
            image = p.get("image_front_small_url") or p.get("image_url") or None
            return {
                "name": name,
                "brand": brand,
                "category": infer_category(name, raw_cat),
                "image": image,
                "suggestedPrice": None,
                "source": source_id,
                "score": 88,
            }
        except Exception:
            continue
    return None


def fetch_goupc(codes: List[str]) -> Optional[Dict[str, Any]]:
    for code in codes:
        try:
            url = f"https://go-upc.com/search?q={urllib.parse.quote(code)}"
            r = Fetcher.get(url, timeout=6, retries=1, stealthy_headers=True, follow_redirects=True)
            if r.status != 200:
                continue
            raw_name = (r.css("h1.product-name::text").get() or "").strip()
            if not raw_name or is_noise_title(raw_name, code):
                continue
            brand = ""
            raw_cat = ""
            for tr in r.css("table.table tr"):
                tds = [normalize_whitespace(" ".join(td.css("*::text, ::text").getall())) for td in tr.css("td")]
                if len(tds) >= 2:
                    key = tds[0].lower()
                    if key == "brand":
                        brand = tds[1]
                    elif key == "category":
                        raw_cat = tds[1]
            clean_name = smart_title_case(raw_name)
            image = (r.css("figure.product-image img::attr(src)").get() or "").strip() or None
            if image and "no-image" in image.lower():
                image = None
            return {
                "name": clean_name,
                "brand": smart_title_case(brand) if brand else "",
                "category": infer_category(clean_name, raw_cat),
                "image": image,
                "suggestedPrice": None,
                "source": "scrapling:go-upc",
                "score": 86,
            }
        except Exception:
            continue
    return None


def fetch_upcitemdb(codes: List[str]) -> Optional[Dict[str, Any]]:
    for code in codes:
        try:
            url = f"https://api.upcitemdb.com/prod/trial/lookup?upc={urllib.parse.quote(code)}"
            r = Fetcher.get(url, timeout=5, retries=1, stealthy_headers=True)
            if r.status != 200:
                continue
            data = json.loads(r.body.decode("utf-8", errors="ignore"))
            items = data.get("items") or []
            if not items:
                continue
            it = items[0]
            raw_name = str(it.get("title") or "").strip()
            if not raw_name or is_noise_title(raw_name, code):
                continue
            clean_name = smart_title_case(raw_name)
            brand = smart_title_case(str(it.get("brand") or "").strip())
            raw_cat = str(it.get("category") or "").strip()
            imgs = it.get("images") or []
            image = imgs[0] if isinstance(imgs, list) and imgs else None
            return {
                "name": clean_name,
                "brand": brand,
                "category": infer_category(clean_name, raw_cat),
                "image": image,
                "suggestedPrice": None,
                "source": "scrapling:upcitemdb",
                "score": 84,
            }
        except Exception:
            continue
    return None


def fetch_buycott(codes: List[str]) -> Optional[Dict[str, Any]]:
    for code in codes:
        try:
            url = f"https://www.buycott.com/upc/{urllib.parse.quote(code)}"
            r = Fetcher.get(url, timeout=6, retries=1, stealthy_headers=True, follow_redirects=True)
            if r.status != 200:
                continue
            raw_name = normalize_whitespace(r.css("h2::text").get() or "")
            if not raw_name or is_noise_title(raw_name, code):
                continue
            brand = ""
            raw_cat = ""
            for tr in r.css("table tr"):
                cells = [normalize_whitespace(" ".join(c.css("*::text, ::text").getall())) for c in tr.css("th, td")]
                if len(cells) >= 2:
                    k = cells[0].lower()
                    if "brand" in k or "manufacturer" in k:
                        brand = brand or cells[1]
                    elif "category" in k:
                        raw_cat = raw_cat or cells[1]
            clean_name = smart_title_case(raw_name)
            if brand and brand.lower() not in clean_name.lower() and len(clean_name.split()) <= 2:
                clean_name = f"{smart_title_case(brand)} {clean_name}"
            image = (r.css("img.product_image::attr(src), div.product_image img::attr(src)").get() or "").strip() or None
            return {
                "name": clean_name,
                "brand": smart_title_case(brand) if brand else "",
                "category": infer_category(clean_name, raw_cat),
                "image": image,
                "suggestedPrice": None,
                "source": "scrapling:buycott",
                "score": 76 if len(clean_name.split()) >= 3 else 68,
            }
        except Exception:
            continue
    return None


def fetch_barcodespider(codes: List[str]) -> Optional[Dict[str, Any]]:
    for code in codes:
        try:
            url = f"https://www.barcodespider.com/{urllib.parse.quote(code)}"
            r = Fetcher.get(url, timeout=5, retries=1, stealthy_headers=True, follow_redirects=True)
            if r.status != 200:
                continue
            raw_name = normalize_whitespace(r.css("div.detailtitle h2::text, h2.detailtitle::text").get() or "")
            if not raw_name or is_noise_title(raw_name, code):
                continue
            clean_name = smart_title_case(raw_name)
            image = (r.css("div.thumb-image img::attr(src)").get() or "").strip() or None
            return {
                "name": clean_name,
                "brand": "",
                "category": infer_category(clean_name),
                "image": image,
                "suggestedPrice": None,
                "source": "scrapling:barcodespider",
                "score": 80,
            }
        except Exception:
            continue
    return None


def extract_title_from_yahoo_heading(algo: Any) -> str:
    # Yahoo wraps domain breadcrumb + link text inside h3.title; prefer the <a> direct text without breadcrumb span
    a = algo.css("h3.title a")
    if a:
        # Remove breadcrumb spans if present by selecting direct text or aria-label
        aria = a.attrib.get("aria-label") if hasattr(a, "attrib") else None
        if aria and len(aria.strip()) >= 4:
            return normalize_whitespace(aria)
        texts = [normalize_whitespace(t) for t in algo.css("h3.title a::text").getall() if normalize_whitespace(t)]
        if texts:
            return " ".join(texts)
    raw = normalize_whitespace(" ".join(algo.css("h3.title *::text").getall()))
    # Strip domain breadcrumb like "megaswalayan.com › web › products "
    raw = re.sub(r"^[a-z0-9.-]+\.[a-z]{2,}(?:\s*[›>]\s*[^\s]+)*\s+", "", raw, flags=re.I)
    return raw.strip()


def fetch_yahoo_indonesia_deep(codes: List[str]) -> Optional[Dict[str, Any]]:
    """
    Deep Indonesian web search via Scrapling Fetcher with STRICT barcode verification:
    only accepts results where the exact barcode digits appear in the title, snippet, or URL.
    """
    for code in codes:
        try:
            url = f"https://id.search.yahoo.com/search?p=%22{urllib.parse.quote(code)}%22"
            r = Fetcher.get(url, timeout=7, retries=1, stealthy_headers=True, follow_redirects=True)
            if r.status != 200:
                continue

            best_hit: Optional[Dict[str, Any]] = None
            for algo in r.css("div.dd.algo")[:8]:
                title = extract_title_from_yahoo_heading(algo)
                snippet = normalize_whitespace(" ".join(algo.css("div.compText *::text").getall()))
                href = (algo.css("h3.title a::attr(href)").get() or "").strip()
                combined_check = f"{title} {snippet} {href}"

                # STRICT GUARD: reject any search fallback that doesn't actually mention this barcode
                if code not in combined_check:
                    continue
                if is_noise_title(title, code):
                    continue
                # Skip PDF/Scribd generic catalog documents unless no better result
                is_doc = "scribd.com" in href.lower() or "pdf" in title.lower()

                # Extract structured metadata from Indonesian supermarket snippets (Harga, Merek, Kategori)
                price = None
                m_harga = re.search(r"(?:Harga|Rp\.?)\s*[:.]?\s*(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+)", snippet, re.I)
                if m_harga:
                    price = parse_price_idr(m_harga.group(1))

                brand = ""
                m_brand = re.search(r"(?:Merek|Brand)\s*:\s*([^,|;]+)", snippet, re.I)
                if m_brand:
                    cand_b = normalize_whitespace(m_brand.group(1))
                    if cand_b and cand_b not in {"-", "–"} and len(cand_b) <= 32:
                        brand = smart_title_case(cand_b)

                raw_cat = ""
                m_cat = re.search(r"(?:Kategori|Category)\s*:\s*([^,|;]+)", snippet, re.I)
                if m_cat:
                    raw_cat = normalize_whitespace(m_cat.group(1))[:40]

                clean_name = smart_title_case(title, strip_carton_suffix=bool(price and price < 50000))
                if is_noise_title(clean_name, code):
                    continue

                score = 72
                if any(dom in href.lower() for dom in ("megaswalayan", "renyswalayan", "tokopedia", "shopee", "blibli", "indomaret", "alfagift", "buycott")):
                    score += 10
                if price:
                    score += 4
                if brand:
                    score += 3
                if is_doc:
                    score -= 25

                if best_hit is None or score > best_hit["score"]:
                    best_hit = {
                        "name": clean_name,
                        "brand": brand,
                        "category": infer_category(clean_name, raw_cat),
                        "image": None,
                        "suggestedPrice": price,
                        "source": "scrapling:yahoo-id",
                        "score": score,
                    }

            if best_hit and best_hit["score"] >= 60:
                return best_hit
        except Exception:
            continue
    return None


def build_code_variants(raw_barcode: str) -> List[str]:
    clean = re.sub(r"[^0-9A-Za-z]", "", raw_barcode.strip())
    if not clean:
        return []
    variants = [clean]
    if clean.isdigit():
        if len(clean) == 12:
            variants.append("0" + clean)
        elif len(clean) == 13 and clean.startswith("0"):
            variants.append(clean[1:])
    return variants


def lookup_barcode(raw_barcode: str) -> Dict[str, Any]:
    codes = build_code_variants(raw_barcode)
    if not codes:
        return {"found": False, "barcode": raw_barcode, "sourcesChecked": 0}

    primary_code = codes[0]

    # Tier 1: All structured Indonesian & global catalogs in parallel
    tier1_tasks = [
        ("megaswalayan", lambda: fetch_arti_supermarket("https://megaswalayan.com", "scrapling:megaswalayan", codes)),
        ("renyswalayanku", lambda: fetch_arti_supermarket("https://renyswalayanku.com", "scrapling:renyswalayanku", codes)),
        ("openfoodfacts", lambda: fetch_openfacts("https://world.openfoodfacts.org", "scrapling:openfoodfacts", codes)),
        ("goupc", lambda: fetch_goupc(codes)),
        ("upcitemdb", lambda: fetch_upcitemdb(codes)),
        ("openbeautyfacts", lambda: fetch_openfacts("https://world.openbeautyfacts.org", "scrapling:openbeautyfacts", codes)),
        ("openproductsfacts", lambda: fetch_openfacts("https://world.openproductsfacts.org", "scrapling:openproductsfacts", codes)),
        ("buycott", lambda: fetch_buycott(codes)),
        ("barcodespider", lambda: fetch_barcodespider(codes)),
        ("yahoo-id", lambda: fetch_yahoo_indonesia_deep(codes)),
    ]

    results: List[Dict[str, Any]] = []
    pool = concurrent.futures.ThreadPoolExecutor(max_workers=len(tier1_tasks))
    try:
        future_map = {pool.submit(fn): name for name, fn in tier1_tasks}
        done, _ = concurrent.futures.wait(future_map.keys(), timeout=9.0)
        for fut in done:
            try:
                res = fut.result(timeout=0)
                if res and res.get("name"):
                    results.append(res)
            except Exception:
                continue
    finally:
        pool.shutdown(wait=False, cancel_futures=True)

    if not results:
        return {
            "found": False,
            "barcode": primary_code,
            "sourcesChecked": len(tier1_tasks),
        }

    # Pick highest-scoring result, then enrich missing fields (brand, image, suggestedPrice) from other hits
    results.sort(key=lambda r: r.get("score", 0), reverse=True)
    best = dict(results[0])

    for alt in results[1:]:
        if not best.get("brand") and alt.get("brand"):
            best["brand"] = alt["brand"]
        if not best.get("image") and alt.get("image"):
            best["image"] = alt["image"]
        if not best.get("suggestedPrice") and alt.get("suggestedPrice"):
            best["suggestedPrice"] = alt["suggestedPrice"]
        if best.get("category") in {"", "Makanan & Minuman"} and alt.get("category") not in {"", "Makanan & Minuman"}:
            best["category"] = alt["category"]

    # Infer brand from first word if still empty
    if not best.get("brand") and best.get("name"):
        first_word = best["name"].split(" ")[0]
        if len(first_word) >= 3:
            best["brand"] = first_word

    return {
        "found": True,
        "barcode": primary_code,
        "name": best["name"],
        "brand": best.get("brand") or "",
        "category": best.get("category") or "Makanan & Minuman",
        "image": best.get("image"),
        "suggestedPrice": best.get("suggestedPrice"),
        "source": best.get("source") or "scrapling",
        "sourcesChecked": len(tier1_tasks),
        "matchedSources": [r.get("source") for r in results],
    }


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"found": False, "error": "Barcode argument required"}))
        sys.exit(0)
    code = sys.argv[1]
    result = lookup_barcode(code)
    print(json.dumps(result, ensure_ascii=False), flush=True)
    # Exit immediately without waiting on any slow daemon/network threads past timeout
    import os
    os._exit(0)


if __name__ == "__main__":
    main()
