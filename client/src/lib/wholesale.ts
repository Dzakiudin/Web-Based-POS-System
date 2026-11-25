export interface WholesaleProductInfo {
    id: number;
    name: string;
    price: string | number;
    stock: number;
    sku?: string | null;
}

export interface DiscountRule {
    id: number;
    name: string;
    type: string;
    value: string | number;
    minPurchase?: string | number | null;
    code?: string | null;
    scope?: 'ORDER' | 'PRODUCT_QTY' | string;
    productId?: number | null;
    minQuantity?: number | null;
    pricingMode?: 'ORDER' | 'ORDER_FIXED' | 'BUNDLE_PRICE' | 'UNIT_PRICE' | 'PERCENTAGE' | string;
    unitLabel?: string | null;
    maxUses?: number | null;
    usedCount?: number;
    currentUses?: number;
    isActive: boolean;
    startDate?: string | null;
    endDate?: string | null;
    product?: WholesaleProductInfo | null;
}

export interface WholesaleEvaluation {
    discountAmount: number;
    matchedRule: DiscountRule | null;
    lineGross: number;
    lineSubtotal: number;
}

export function isWholesaleRuleCurrentlyEligible(rule: DiscountRule): boolean {
    if (!rule.isActive || rule.scope !== 'PRODUCT_QTY' || !rule.productId) {
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

/**
 * Mirrors server-rust calculate_wholesale_rule_discount exact formula.
 */
export function calculateWholesaleRuleDiscount(
    unitPrice: number,
    quantity: number,
    rule: Pick<DiscountRule, 'minQuantity' | 'pricingMode' | 'value'>
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
        case 'PERCENTAGE': {
            const pct = Math.min(100, Math.max(0, val));
            discount = Math.round((lineGross * pct) / 100);
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

    for (const rule of rules) {
        const d = calculateWholesaleRuleDiscount(unitPrice, quantity, rule);
        if (d > bestDiscount) {
            bestDiscount = d;
            matchedRule = rule;
        }
    }

    return {
        discountAmount: bestDiscount,
        matchedRule,
        lineGross,
        lineSubtotal: Math.max(0, lineGross - bestDiscount),
    };
}

export function formatWholesaleSummary(rule: DiscountRule, normalUnitPrice?: number): {
    packageLabel: string;
    priceDisplay: string;
    savingsHint: string | null;
} {
    const minQty = Math.max(1, Number(rule.minQuantity || 1));
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
