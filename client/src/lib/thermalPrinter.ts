import { getCachedStoreSettings, type StoreSettings } from './storeSettings';

const escapeHtml = (input: unknown): string => {
    const str = String(input ?? '');
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

export const getReceiptDiscountLabel = (pricingMode?: string | null): string => {
    switch (pricingMode) {
        case 'BUNDLE_PRICE':
            return 'Diskon Paket';
        case 'UNIT_PRICE':
            return 'Diskon Grosir';
        case 'BUY_X_GET_Y':
            return 'Beli X Gratis Y';
        case 'FIXED_PER_UNIT':
            return 'Potongan/Pcs';
        case 'PERCENTAGE':
            return 'Diskon %';
        default:
            return 'Diskon Produk';
    }
};

/**
 * Thermal Receipt Printer Utility
 * Menggunakan hidden iframe terisolasi agar saat window.print() dipanggil:
 * 1. Tidak terpengaruh overflow: hidden, modal dialog, atau class styling Astryx di #root.
 * 2. Preview cetak Chrome/Edge langsung memuat struk 58mm atau 80mm secara presisi (tidak pernah blank).
 * 3. Seluruh teks dinamis dilindungi escapeHtml() terhadap XSS/markup rusak.
 */
export const printThermalReceipt = (sale: any, customSettings?: StoreSettings) => {
    if (!sale) return;

    const store = customSettings || getCachedStoreSettings();
    const is58mm = store.paperWidth === '58mm';
    const pageWidth = is58mm ? '58mm' : '80mm';
    const bodyWidth = is58mm ? '48mm' : '72mm';
    const baseFontSize = is58mm ? '11px' : '12px';
    const titleFontSize = is58mm ? '13px' : '14px';

    // Bersihkan iframe lama jika ada
    const existingIframe = document.getElementById('pos-thermal-print-iframe');
    if (existingIframe && existingIframe.parentNode) {
        existingIframe.parentNode.removeChild(existingIframe);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'pos-thermal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const receiptDate = sale.date
        ? new Date(sale.date).toLocaleString('id-ID')
        : new Date().toLocaleString('id-ID');

    const items = sale.items
        ? sale.items.map((it: any) => ({
              name: it.name,
              quantity: Number(it.quantity),
              price: Number(it.price),
              discount: Number(it.discount ?? it.discountAmount ?? 0),
              subtotal: Number(it.subtotal ?? (Number(it.price) * Number(it.quantity) - Number(it.discount ?? it.discountAmount ?? 0))),
              pricingMode: it.appliedPricingMode || it.pricingMode || null,
          }))
        : sale.details
        ? sale.details.map((d: any) => ({
              name: d.product?.name || `Produk #${d.productId}`,
              quantity: Number(d.quantity),
              price: Number(d.unitPrice || d.price || (Number(d.subtotal) / Math.max(1, Number(d.quantity)))),
              discount: Number(d.discountAmount ?? d.discount ?? 0),
              subtotal: Number(d.subtotal),
              pricingMode: d.pricingMode || d.appliedPricingMode || null,
          }))
        : [];

    const itemsDiscountSum = items.reduce((s: number, it: any) => s + Number(it.discount || 0), 0);
    const receiptGrossNormal = Number(sale.totalPrice || sale.finalPrice || 0) + itemsDiscountSum;

    const paymentMethod = sale.method || sale.payments?.[0]?.method || 'TUNAI';
    const paidAmount = sale.paid || sale.payments?.[0]?.amount || sale.finalPrice || 0;
    const changeAmount = sale.change || sale.payments?.[0]?.change || 0;
    const refText = sale.reference || sale.payments?.[0]?.reference || '';

    const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Struk - ${escapeHtml(sale.receiptNumber || 'POS')}</title>
  <style>
    @page {
      size: ${pageWidth} auto;
      margin: 0;
    }
    @media print {
      body { margin: 0; padding: ${is58mm ? '2.5mm' : '4mm'}; }
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${baseFontSize};
      color: #000000;
      background: #ffffff;
      width: ${bodyWidth};
      margin: 0 auto;
      padding: ${is58mm ? '4px' : '8px'};
      line-height: 1.35;
      box-sizing: border-box;
      word-break: break-word;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
    .double-divider { border-bottom: 2px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; gap: 6px; }
  </style>
</head>
<body>
  <div class="center">
    <div class="bold" style="font-size: ${titleFontSize};">${escapeHtml(store.storeName)}</div>
    ${store.address ? `<div>${escapeHtml(store.address)}</div>` : ''}
    ${store.phone ? `<div>Telp: ${escapeHtml(store.phone)}</div>` : ''}
  </div>
  <div class="double-divider"></div>
  <div>
    <div class="row"><span>No. Struk:</span><span class="bold">${escapeHtml(sale.receiptNumber || '-')}</span></div>
    <div class="row"><span>Waktu:</span><span>${escapeHtml(receiptDate)}</span></div>
    <div class="row"><span>Kasir:</span><span>${escapeHtml(sale.user?.name || 'Kasir Utama')}</span></div>
    <div class="row"><span>Pelanggan:</span><span>${escapeHtml(sale.customer?.name || 'Umum')}</span></div>
    <div class="row"><span>Metode:</span><span class="bold">${escapeHtml(paymentMethod)}</span></div>
    ${refText ? `<div class="row"><span>Ref:</span><span>${escapeHtml(refText)}</span></div>` : ''}
  </div>
  <div class="divider"></div>
  <div>
    ${items.map((it: any) => `
      <div style="margin-bottom: 4px;">
        <div class="bold">${escapeHtml(it.name)}</div>
        <div class="row">
          <span>${Number(it.quantity)} x Rp ${Number(it.price).toLocaleString('id-ID')}</span>
          <span>Rp ${(Number(it.subtotal || (Number(it.price) * Number(it.quantity)))).toLocaleString('id-ID')}</span>
        </div>
        ${Number(it.discount || 0) > 0 ? `
          <div class="row" style="font-size: ${is58mm ? '10px' : '11px'};">
            <span>${escapeHtml(getReceiptDiscountLabel(it.pricingMode))}:</span>
            <span>-Rp ${Number(it.discount).toLocaleString('id-ID')}</span>
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
  <div class="divider"></div>
  <div>
    <div class="row">
      <span>Subtotal:</span>
      <span>Rp ${receiptGrossNormal.toLocaleString('id-ID')}</span>
    </div>
    ${itemsDiscountSum > 0 ? `
      <div class="row">
        <span>Diskon Produk:</span>
        <span>-Rp ${itemsDiscountSum.toLocaleString('id-ID')}</span>
      </div>
    ` : ''}
    ${Number(sale.discountAmount || 0) > 0 ? `
      <div class="row">
        <span>Diskon Promo:</span>
        <span>-Rp ${Number(sale.discountAmount).toLocaleString('id-ID')}</span>
      </div>
    ` : ''}
    ${Number(sale.taxAmount || 0) > 0 ? `
      <div class="row">
        <span>PPN${sale.taxRate ? ` (${Number(sale.taxRate)}%)` : ''}:</span>
        <span>Rp ${Number(sale.taxAmount).toLocaleString('id-ID')}</span>
      </div>
    ` : ''}
    ${Number(sale.serviceChargeAmount || 0) > 0 ? `
      <div class="row">
        <span>Biaya Layanan${sale.serviceChargeRate ? ` (${Number(sale.serviceChargeRate)}%)` : ''}:</span>
        <span>Rp ${Number(sale.serviceChargeAmount).toLocaleString('id-ID')}</span>
      </div>
    ` : ''}
    <div class="double-divider"></div>
    <div class="row bold" style="font-size: ${titleFontSize};">
      <span>TOTAL:</span>
      <span>Rp ${Number(sale.finalPrice || 0).toLocaleString('id-ID')}</span>
    </div>
    <div class="row">
      <span>Bayar:</span>
      <span>Rp ${Number(paidAmount).toLocaleString('id-ID')}</span>
    </div>
    <div class="row bold">
      <span>Kembali:</span>
      <span>Rp ${Number(changeAmount).toLocaleString('id-ID')}</span>
    </div>
  </div>
  <div class="double-divider"></div>
  <div class="center" style="font-size: ${is58mm ? '10px' : '11px'};">
    ${store.footerLine1 ? `<div>${escapeHtml(store.footerLine1)}</div>` : ''}
    ${store.footerLine2 ? `<div>${escapeHtml(store.footerLine2)}</div>` : ''}
  </div>
</body>
</html>
    `;

    doc.open();
    doc.write(receiptHtml);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
    }, 250);
};
