export interface WholesaleProductInfo {
    id: number;
    name: string;
    price: string | number;
    stock: number;
    sku?: string | null;
}

export interface WholesaleCategoryInfo {
    id: number;
    name: string;
}

export interface DiscountRule {
    id: number;
    name: string;
    type: string;
    value: string | number;
    minPurchase?: string | number | null;
    code?: string | null;
    scope?: 'ORDER' | 'PRODUCT_QTY' | 'CATEGORY' | string;
    productId?: number | null;
    categoryId?: number | null;
    minQuantity?: number | null;
    bonusQuantity?: number | null;
    pricingMode?:
        | 'ORDER'
        | 'ORDER_FIXED'
        | 'BUNDLE_PRICE'
        | 'UNIT_PRICE'
        | 'BUY_X_GET_Y'
        | 'PERCENTAGE'
        | 'FIXED_PER_UNIT'
        | string;
    unitLabel?: string | null;
    maxDiscount?: string | number | null;
    autoApply?: boolean;
    targetTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | string | null;
    maxUses?: number | null;
    usedCount?: number;
    currentUses?: number;
    isActive: boolean;
    startDate?: string | null;
    endDate?: string | null;
    product?: WholesaleProductInfo | null;
    category?: WholesaleCategoryInfo | null;
}

export interface WholesaleEvaluation {
    discountAmount: number;
    matchedRule: DiscountRule | null;
    freeUnits: number;
    lineGross: number;
    lineSubtotal: number;
}

export interface BuyXGetYNudge {
    rule: DiscountRule;
    addQty: number;
    freeQty: number;
}

export function isDiscountRuleActiveValid(rule: DiscountRule): boolean {
    if (!rule.isActive) {
        return false;
    }
    if (rule.endDate) {
        const endTs = new Date(rule.endDate).getTime();
        if (!Number.isNaN(endTs) && endTs < Date.now()) {
            return false;
        }
    }
    const maxUses = rule.maxUses ?? null;
    const used = rule.usedCount ?? rule.currentUses ?? 0;
    if (maxUses !== null && maxUses > 0 && used >= maxUses) {
        return false;
    }
    return true;
}

export function isWholesaleRuleCurrentlyEligible(rule: DiscountRule): boolean {
    return isDiscountRuleActiveValid(rule) && rule.scope === 'PRODUCT_QTY' && Boolean(rule.productId);
}

export function isCategoryRuleCurrentlyEligible(rule: DiscountRule): boolean {
    return isDiscountRuleActiveValid(rule) && rule.scope === 'CATEGORY' && Boolean(rule.categoryId);
}

export function isItemRuleCurrentlyEligible(rule: DiscountRule): boolean {
    return isWholesaleRuleCurrentlyEligible(rule) || isCategoryRuleCurrentlyEligible(rule);
}

export function isOrderRuleCurrentlyEligible(rule: DiscountRule): boolean {
    return isDiscountRuleActiveValid(rule) && (!rule.scope || rule.scope === 'ORDER');
}

export function tierRank(tier?: string | null): number {
    switch ((tier || '').trim().toUpperCase()) {
        case 'PLATINUM':
            return 4;
        case 'GOLD':
            return 3;
        case 'SILVER':
            return 2;
        case 'BRONZE':
            return 1;
        default:
            return 0;
    }
}

export function calculateOrderPromoAmount(
    subtotal: number,
    discountType: string,
    value: number | string,
    maxDiscount?: number | string | null
): number {
    const val = Number(value || 0);
    if (subtotal <= 0 || val <= 0) {
        return 0;
    }
    let raw = 0;
    if (discountType === 'PERCENTAGE') {
        const pct = Math.min(100, Math.max(0, val));
        const calc = Math.round((subtotal * pct) / 100);
        const cap = Number(maxDiscount || 0);
        raw = cap > 0 ? Math.min(calc, cap) : calc;
    } else {
        raw = val;
    }
    return Math.min(subtotal, Math.max(0, raw));
}

export function isOrderPromoEligible(
    rule: DiscountRule,
    subtotal: number,
    customerTier?: string | null
): boolean {
    if (!isOrderRuleCurrentlyEligible(rule)) {
        return false;
    }
    const minPurchase = Number(rule.minPurchase || 0);
    if (subtotal < minPurchase) {
        return false;
    }
    if (rule.targetTier && tierRank(customerTier) < tierRank(rule.targetTier)) {
        return false;
    }
    return true;
}

export function selectBestAutoOrderPromo(
    rules: DiscountRule[],
    subtotal: number,
    customerTier?: string | null
): { rule: DiscountRule; discountAmount: number } | null {
    let bestRule: DiscountRule | null = null;
    let bestAmount = 0;

    for (const rule of rules) {
        if (!rule.autoApply) continue;
        if (!isOrderPromoEligible(rule, subtotal, customerTier)) continue;
        const amt = calculateOrderPromoAmount(subtotal, rule.type, rule.value, rule.maxDiscount);
        if (amt > bestAmount) {
            bestAmount = amt;
            bestRule = rule;
        }
    }

    return bestRule && bestAmount > 0 ? { rule: bestRule, discountAmount: bestAmount } : null;
}

/**
 * Mirrors server-rust calculate_wholesale_rule_discount exact formula.
 */
export function calculateWholesaleRuleDiscount(
    unitPrice: number,
    quantity: number,
    rule: Pick<DiscountRule, 'minQuantity' | 'bonusQuantity' | 'pricingMode' | 'value'>
): number {
    const minQty = Number(rule.minQuantity || 0);
    const val = Number(rule.value || 0);
    if (quantity <= 0 || minQty <= 0 || quantity < minQty || unitPrice <= 0) {
        return 0;
    }

    const lineGross = unitPrice * quantity;
    let discount = 0;

    switch (rule.pricingMode) {
        case 'BUNDLE_PRICE': {
            const bundles = Math.floor(quantity / minQty);
            const normalBundlePrice = unitPrice * minQty;
            const savingsPerBundle = Math.max(0, normalBundlePrice - val);
            discount = savingsPerBundle * bundles;
            break;
        }
        case 'UNIT_PRICE': {
            const perUnitSavings = Math.max(0, unitPrice - val);
            discount = perUnitSavings * quantity;
            break;
        }
        case 'BUY_X_GET_Y': {
            const bonusQty = Number(rule.bonusQuantity || 0);
            if (bonusQty <= 0) {
                discount = 0;
            } else {
                const groupSize = minQty + bonusQty;
                const sets = Math.floor(quantity / groupSize);
                const freeUnits = sets * bonusQty;
                discount = unitPrice * freeUnits;
            }
            break;
        }
        case 'PERCENTAGE': {
            const pct = Math.min(100, Math.max(0, val));
            discount = Math.round((lineGross * pct) / 100);
            break;
        }
        case 'FIXED_PER_UNIT': {
            const perUnitCut = Math.min(unitPrice, Math.max(0, val));
            discount = perUnitCut * quantity;
            break;
        }
        default:
            discount = 0;
    }

    return Math.min(lineGross, Math.max(0, discount));
}

export function evaluateWholesaleForProduct(
    unitPrice: number,
    quantity: number,
    rules: DiscountRule[]
): WholesaleEvaluation {
    const lineGross = Math.max(0, unitPrice * quantity);
    let bestDiscount = 0;
    let matchedRule: DiscountRule | null = null;
    let freeUnits = 0;

    for (const rule of rules) {
        const d = calculateWholesaleRuleDiscount(unitPrice, quantity, rule);
        if (d > bestDiscount) {
            bestDiscount = d;
            matchedRule = rule;
            if (rule.pricingMode === 'BUY_X_GET_Y') {
                const minQty = Number(rule.minQuantity || 0);
                const bonusQty = Number(rule.bonusQuantity || 0);
                if (minQty > 0 && bonusQty > 0) {
                    freeUnits = Math.floor(quantity / (minQty + bonusQty)) * bonusQty;
                } else {
                    freeUnits = 0;
                }
            } else {
                freeUnits = 0;
            }
        }
    }

    return {
        discountAmount: bestDiscount,
        matchedRule,
        freeUnits,
        lineGross,
        lineSubtotal: Math.max(0, lineGross - bestDiscount),
    };
}

export function getBuyXGetYNudge(quantity: number, rules: DiscountRule[]): BuyXGetYNudge | null {
    if (quantity <= 0) return null;
    for (const rule of rules) {
        if (rule.pricingMode !== 'BUY_X_GET_Y') continue;
        const minQty = Number(rule.minQuantity || 0);
        const bonusQty = Number(rule.bonusQuantity || 0);
        if (minQty <= 0 || bonusQty <= 0) continue;
        const groupSize = minQty + bonusQty;
        const remainder = quantity % groupSize;
        if (remainder >= minQty && remainder < groupSize) {
            return {
                rule,
                addQty: groupSize - remainder,
                freeQty: bonusQty,
            };
        }
    }
    return null;
}

export function formatWholesaleSummary(rule: DiscountRule, normalUnitPrice?: number): {
    packageLabel: string;
    priceDisplay: string;
    savingsHint: string | null;
} {
    const minQty = Math.max(1, Number(rule.minQuantity || 1));
    const bonusQty = Math.max(0, Number(rule.bonusQuantity || 0));
    const val = Number(rule.value || 0);
    const packageLabel = rule.unitLabel?.trim()
        ? `${rule.unitLabel.trim()} (${minQty} pcs)`
        : `Min. ${minQty} pcs`;

    if (rule.pricingMode === 'BUNDLE_PRICE') {
        const normalBundle = (normalUnitPrice || 0) * minQty;
        const save = normalBundle > val ? normalBundle - val : 0;
        const unitAfter = Math.round(val / minQty);
        return {
            packageLabel,
            priceDisplay: `Rp ${val.toLocaleString('id-ID')} / ${rule.unitLabel?.trim() || `${minQty} pcs`}`,
            savingsHint:
                save > 0
                    ? `Normal Rp ${normalBundle.toLocaleString('id-ID')} · Hemat Rp ${save.toLocaleString('id-ID')} (~Rp ${unitAfter.toLocaleString('id-ID')}/pcs)`
                    : null,
        };
    }

    if (rule.pricingMode === 'UNIT_PRICE') {
        const savePerUnit = normalUnitPrice && normalUnitPrice > val ? normalUnitPrice - val : 0;
        return {
            packageLabel,
            priceDisplay: `Rp ${val.toLocaleString('id-ID')} / pcs`,
            savingsHint:
                savePerUnit > 0
                    ? `Normal Rp ${normalUnitPrice!.toLocaleString('id-ID')}/pcs · Hemat Rp ${savePerUnit.toLocaleString('id-ID')}/pcs`
                    : null,
        };
    }

    if (rule.pricingMode === 'BUY_X_GET_Y') {
        const paidTotal = (normalUnitPrice || 0) * minQty;
        const freeValue = (normalUnitPrice || 0) * bonusQty;
        return {
            packageLabel: `Beli ${minQty} Gratis ${bonusQty}`,
            priceDisplay: `Beli ${minQty} Gratis ${bonusQty}${rule.unitLabel?.trim() ? ` (${rule.unitLabel.trim()})` : ''}`,
            savingsHint:
                normalUnitPrice && normalUnitPrice > 0 && bonusQty > 0
                    ? `Beli ${minQty} = Rp ${paidTotal.toLocaleString('id-ID')} · Bawa ${minQty + bonusQty} pcs Tetap Rp ${paidTotal.toLocaleString('id-ID')} (Gratis Rp ${freeValue.toLocaleString('id-ID')})`
                    : null,
        };
    }

    if (rule.pricingMode === 'FIXED_PER_UNIT') {
        const unitCut = normalUnitPrice ? Math.min(normalUnitPrice, val) : val;
        const unitAfter = normalUnitPrice ? Math.max(0, normalUnitPrice - unitCut) : 0;
        return {
            packageLabel,
            priceDisplay: `Potongan Rp ${val.toLocaleString('id-ID')} / pcs`,
            savingsHint:
                normalUnitPrice && normalUnitPrice > 0
                    ? `Jadi Rp ${unitAfter.toLocaleString('id-ID')}/pcs · Beli ${minQty} hemat Rp ${(unitCut * minQty).toLocaleString('id-ID')}`
                    : null,
        };
    }

    const totalForMin = normalUnitPrice ? normalUnitPrice * minQty : 0;
    const discForMin = totalForMin > 0 ? Math.round((totalForMin * val) / 100) : 0;
    return {
        packageLabel,
        priceDisplay: `Diskon ${val}%`,
        savingsHint:
            discForMin > 0
                ? `Beli ${minQty} pcs jadi Rp ${(totalForMin - discForMin).toLocaleString('id-ID')} (Hemat Rp ${discForMin.toLocaleString('id-ID')})`
                : null,
    };
}
