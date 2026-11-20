/**
 * Thermal Receipt Printer Utility
 * Menggunakan hidden iframe terisolasi agar saat window.print() dipanggil:
 * 1. Tidak terpengaruh overflow: hidden, modal dialog, atau class styling Astryx di #root.
 * 2. Preview cetak Chrome/Edge langsung memuat struk 80mm/58mm secara presisi (tidak pernah blank).
 * 3. Bekerja mulus baik di PC Desktop maupun browser mobile.
 */
export const printThermalReceipt = (sale: any) => {
    if (!sale) return;

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

    const items = sale.items || (sale.details ? sale.details.map((d: any) => ({
        name: d.product?.name || `Produk #${d.productId}`,
        quantity: d.quantity,
        price: d.unitPrice || d.price || (Number(d.subtotal) / Number(d.quantity)),
        subtotal: d.subtotal,
    })) : []);

    const paymentMethod = sale.method || sale.payments?.[0]?.method || 'TUNAI';
    const paidAmount = sale.paid || sale.payments?.[0]?.amount || sale.finalPrice || 0;
    const changeAmount = sale.change || sale.payments?.[0]?.change || 0;

    const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Struk - ${sale.receiptNumber || 'POS'}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    @media print {
      body { margin: 0; padding: 4mm; }
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000000;
      background: #ffffff;
      width: 72mm;
      margin: 0 auto;
      padding: 8px;
      line-height: 1.35;
      box-sizing: border-box;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
    .double-divider { border-bottom: 2px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="center">
    <div class="bold" style="font-size: 14px;">POS SYSTEM STORE</div>
    <div>Jl. Jendral Sudirman Kav. 52, Jakarta</div>
    <div>Telp: (021) 5299-1000</div>
  </div>
  <div class="double-divider"></div>
  <div>
    <div class="row"><span>No. Struk:</span><span class="bold">${sale.receiptNumber || '-'}</span></div>
    <div class="row"><span>Waktu:</span><span>${receiptDate}</span></div>
    <div class="row"><span>Kasir:</span><span>${sale.user?.name || 'Kasir Utama'}</span></div>
    <div class="row"><span>Pelanggan:</span><span>${sale.customer?.name || 'Umum'}</span></div>
    <div class="row"><span>Metode:</span><span class="bold">${paymentMethod}</span></div>
    ${sale.reference ? `<div class="row"><span>Ref:</span><span>${sale.reference}</span></div>` : ''}
  </div>
  <div class="divider"></div>
  <div>
    ${items.map((it: any) => `
      <div style="margin-bottom: 4px;">
        <div class="bold">${it.name}</div>
        <div class="row">
          <span>${it.quantity} x Rp ${Number(it.price).toLocaleString('id-ID')}</span>
          <span>Rp ${(Number(it.subtotal || (Number(it.price) * it.quantity))).toLocaleString('id-ID')}</span>
        </div>
      </div>
    `).join('')}
  </div>
  <div class="divider"></div>
  <div>
    <div class="row">
      <span>Subtotal:</span>
      <span>Rp ${Number(sale.totalPrice || sale.finalPrice || 0).toLocaleString('id-ID')}</span>
    </div>
    ${Number(sale.discountAmount || 0) > 0 ? `
      <div class="row">
        <span>Diskon:</span>
        <span>-Rp ${Number(sale.discountAmount).toLocaleString('id-ID')}</span>
      </div>
    ` : ''}
    <div class="double-divider"></div>
    <div class="row bold" style="font-size: 13px;">
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
  <div class="center" style="font-size: 11px;">
    <div>Terima kasih atas kunjungan Anda!</div>
    <div>Barang yang dibeli tidak dapat ditukar</div>
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
