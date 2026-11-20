import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Helper untuk download atau bagikan file (PDF, CSV, Gambar)
 * Mendukung Capacitor Native di Android (menulis ke file storage asli dan membuka Share Sheet / Print)
 * dan fallback standar untuk browser Web Desktop & Mobile.
 */
export const downloadOrShareFile = async (
    blob: Blob,
    filename: string,
    mimeType: string = 'application/octet-stream'
) => {
    // 1. Android Native APK (Capacitor)
    if (Capacitor.isNativePlatform()) {
        try {
            // Konversi Blob ke Base64
            const reader = new FileReader();
            const base64Data = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                    const res = reader.result as string;
                    const base64 = res.includes(',') ? res.split(',')[1] : res;
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            // Simpan file ke direktori Cache
            const savedFile = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache,
            });

            // Buka Android Native Share Dialog
            // Memungkinkan: Cetak ke Bluetooth Thermal Printer, Kirim ke WA, atau Simpan ke Files
            await Share.share({
                title: filename,
                text: `File dari POS System: ${filename}`,
                url: savedFile.uri,
                dialogTitle: `Pilih Aksi untuk ${filename}`,
            });
            return;
        } catch (e: any) {
            console.error('Capacitor native file write/share failed:', e);
        }
    }

    // 2. Web Mobile (jika browser Chrome mobile mendukung Web Share API)
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
            if (e.name === 'AbortError') return;
            console.warn('Share API error, fallback to standard download:', e);
        }
    }

    // 3. Fallback Standar untuk Desktop Web (PC / Laptop)
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
