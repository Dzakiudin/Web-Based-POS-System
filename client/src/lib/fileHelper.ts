/**
 * Helper untuk download atau bagikan file (PDF, CSV, Gambar)
 * Mendukung Web Share API di Android / HP agar file bisa langsung dibuka,
 * dicetak via printer Bluetooth / WiFi, atau dibagikan ke WhatsApp.
 */
export const downloadOrShareFile = async (
    blob: Blob,
    filename: string,
    mimeType: string = 'application/octet-stream'
) => {
    // 1. Cek apakah perangkat mendukung Web Share API untuk File (Android / HP)
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        try {
            const file = new File([blob], filename, { type: mimeType });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: filename,
                    text: `File dari POS System: ${filename}`,
                });
                return;
            }
        } catch (e: any) {
            if (e.name === 'AbortError') {
                return; // User membatalkan dialog share
            }
            console.warn('Share API error, fallback ke download biasa', e);
        }
    }

    // 2. Fallback untuk Desktop PC (download via blob URL)
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 2000);
};
