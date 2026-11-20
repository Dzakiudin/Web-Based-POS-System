import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, CheckCircle2, RefreshCw, Download, AlertCircle, Sparkles } from 'lucide-react';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import Modal from './Modal';
import api from '../lib/axios';

export const CURRENT_CLIENT_VERSION = '2.0.2';

export interface VersionInfo {
    version: string;
    releaseDate?: string;
    releaseNotes: string;
    downloadUrl: string;
}

interface AppInstallerPlugin {
    installApk(options: { filePath: string }): Promise<{ success: boolean }>;
    getAppInfo(): Promise<{ versionName: string; versionCode: number }>;
}

const AppInstaller = registerPlugin<AppInstallerPlugin>('AppInstaller');

/**
 * Validator Pembanding Versi SemVer
 * Mengembalikan:
 * -1 jika v1 < v2 (v1 outdate / lebih tua dari v2)
 *  0 jika v1 === v2 (versi sama / identik)
 *  1 jika v1 > v2 (v1 lebih baru dari v2)
 */
export const compareVersions = (v1: string, v2: string): number => {
    const clean1 = (v1 || '').replace(/[^0-9.]/g, '').split('.').map((n) => parseInt(n, 10) || 0);
    const clean2 = (v2 || '').replace(/[^0-9.]/g, '').split('.').map((n) => parseInt(n, 10) || 0);

    const maxLen = Math.max(clean1.length, clean2.length);
    for (let i = 0; i < maxLen; i++) {
        const num1 = clean1[i] || 0;
        const num2 = clean2[i] || 0;
        if (num1 < num2) return -1;
        if (num1 > num2) return 1;
    }
    return 0;
};

export const isVersionOutdated = (current: string, remote: string): boolean => {
    return compareVersions(current, remote) < 0;
};

/**
 * Pemicu global untuk cek pembaruan secara manual (bisa dipanggil dari Menu / Pengaturan / Profil)
 */
export const triggerAppUpdateCheck = () => {
    window.dispatchEvent(new CustomEvent('check-app-update'));
};

export const AppUpdateModal: React.FC = () => {
    const isNative = Capacitor.isNativePlatform();
    const [installedVersion, setInstalledVersion] = useState<string>(CURRENT_CLIENT_VERSION);
    const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
    const [isOutdated, setIsOutdated] = useState<boolean>(false);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [downloadProgress, setDownloadProgress] = useState<string>('');
    const [installError, setInstallError] = useState<string>('');

    // Deteksi versi terpasang di awal
    useEffect(() => {
        const detectInstalledVersion = async () => {
            if (isNative) {
                try {
                    const info = await AppInstaller.getAppInfo();
                    if (info && info.versionName) {
                        setInstalledVersion(info.versionName);
                        return info.versionName;
                    }
                } catch (e) {
                    console.warn('Gagal membaca info native package:', e);
                }
            }
            return CURRENT_CLIENT_VERSION;
        };

        detectInstalledVersion().then((ver) => {
            // Pengecekan otomatis di latar belakang saat aplikasi pertama kali dibuka
            const timer = setTimeout(() => {
                checkUpdate(false, ver);
            }, 2500);
            return () => clearTimeout(timer);
        });

        // Event listener saat user memicu 'Cek Pembaruan' secara manual
        const handleManualCheck = () => {
            checkUpdate(true);
        };
        window.addEventListener('check-app-update', handleManualCheck);
        return () => window.removeEventListener('check-app-update', handleManualCheck);
    }, [isNative]);

    const checkUpdate = async (isManual = false, overrideCurrentVer?: string) => {
        try {
            const currentVer = overrideCurrentVer || installedVersion;
            const res = await api.get('/app/version');
            if (res.data && res.data.version) {
                const info: VersionInfo = res.data;
                setUpdateInfo(info);

                // Jalankan validator semver
                const outdated = isVersionOutdated(currentVer, info.version);
                setIsOutdated(outdated);

                if (outdated) {
                    // KASUS 1: Versi OUTDATE -> Tawarkan update
                    const dismissed = sessionStorage.getItem('dismissed_version');
                    if (isManual || dismissed !== info.version) {
                        setIsOpen(true);
                    }
                } else if (isManual) {
                    // KASUS 2: Versi TIDAK OUTDATE (Sudah Versi Terbaru) -> Berikan info pembaruan TANPA tawaran unduh
                    setIsOpen(true);
                }
            }
        } catch (e) {
            console.warn('Gagal memeriksa pembaruan aplikasi', e);
            if (isManual) {
                alert('Tidak dapat memeriksa pembaruan saat ini. Periksa koneksi server Anda.');
            }
        }
    };

    const handleDismiss = () => {
        if (updateInfo && isOutdated) {
            sessionStorage.setItem('dismissed_version', updateInfo.version);
        }
        setIsOpen(false);
    };

    // Untuk Web: Cukup reload halaman
    const handleReloadWeb = () => {
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    // Untuk Android APK Outdated: Unduh APK di latar belakang aplikasi lalu buka installer otomatis
    const handleAutoDownloadAndInstallApk = async () => {
        if (!updateInfo?.downloadUrl) return;

        setIsDownloading(true);
        setInstallError('');
        setDownloadProgress('Menghubungkan ke server...');

        try {
            const apkFileName = `pos-update-v${updateInfo.version}.apk`;
            setDownloadProgress('Mengunduh paket APK pembaruan...');

            const downloadRes = await Filesystem.downloadFile({
                url: updateInfo.downloadUrl,
                path: apkFileName,
                directory: Directory.Cache,
            });

            setDownloadProgress('Unduhan selesai! Membuka installer Android...');

            if (!downloadRes.path) {
                throw new Error('Gagal mendapatkan lokasi file APK yang diunduh.');
            }

            await AppInstaller.installApk({
                filePath: downloadRes.path,
            });

            setIsDownloading(false);
            setDownloadProgress('');
        } catch (err: any) {
            console.error('Gagal unduh / pasang APK otomatis:', err);
            setInstallError(err.message || 'Gagal mengunduh atau memasang APK otomatis');
            setIsDownloading(false);
        }
    };

    const handleManualDownloadFallback = () => {
        if (updateInfo?.downloadUrl) {
            window.open(updateInfo.downloadUrl, '_blank');
        }
    };

    if (!updateInfo) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleDismiss}
            title={
                isOutdated
                    ? isNative
                        ? 'Pembaruan Aplikasi Android Tersedia'
                        : 'Pembaruan Web Tersedia'
                    : 'Informasi Versi & Pembaruan'
            }
            width={520}
        >
            <VStack gap={4} padding={1}>
                {isOutdated ? (
                    /* KONDISI 1: OUTDATED -> Tampilkan Banner Peringatan Pembaruan */
                    <Banner
                        status="warning"
                        title={`Versi Baru v${updateInfo.version} Tersedia!`}
                        description={
                            isNative
                                ? 'Versi aplikasi yang terpasang saat ini sudah usang. Anda dapat mengunduh dan memasang versi terbaru langsung di dalam aplikasi ini.'
                                : 'Sistem telah diperbarui di server. Silakan muat ulang halaman untuk menerapkan fitur dan perbaikan terbaru.'
                        }
                        icon={<ArrowUpCircle size={18} />}
                        container="section"
                    />
                ) : (
                    /* KONDISI 2: TIDAK OUTDATED -> Berikan Info Pembaruan Saja (Just Info, Tidak Ditawari Unduh) */
                    <Banner
                        status="success"
                        title="Aplikasi Anda Sudah Versi Terbaru!"
                        description="Aplikasi POS yang Anda gunakan saat ini sudah berjalan pada versi paling mutakhir. Semua fitur dan patch keamanan terbaru sudah aktif."
                        icon={<CheckCircle2 size={18} />}
                        container="section"
                    />
                )}

                {/* Perbandingan Versi */}
                <HStack justify="between" align="center">
                    <Text size="sm" color="secondary">
                        Versi Terpasang:
                    </Text>
                    <Badge
                        variant={isOutdated ? 'warning' : 'success'}
                        label={isOutdated ? `v${installedVersion} (Perlu Update)` : `v${installedVersion} (Paling Baru)`}
                    />
                </HStack>

                {isOutdated && (
                    <HStack justify="between" align="center">
                        <Text size="sm" weight="semibold">
                            Versi Tersedia di Server:
                        </Text>
                        <Badge variant="success" label={`v${updateInfo.version}`} />
                    </HStack>
                )}

                <Divider />

                {/* Catatan Pembaruan / What's New */}
                <VStack gap={1.5}>
                    <HStack gap={1.5} align="center">
                        <Sparkles size={14} color="#059669" />
                        <Text size="sm" weight="semibold">
                            {isOutdated ? 'Catatan Pembaruan:' : 'Fitur & Perbaikan pada Versi Ini:'}
                        </Text>
                    </HStack>
                    <div
                        style={{
                            backgroundColor: '#f4f4f5',
                            border: '1px solid #e4e4e7',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            lineHeight: 1.55,
                            color: '#3f3f46',
                            whiteSpace: 'pre-line',
                        }}
                    >
                        {updateInfo.releaseNotes}
                    </div>
                </VStack>

                {/* Progress / Status Unduhan untuk Kasus Outdated pada APK */}
                {isOutdated && isNative && isDownloading && (
                    <div
                        style={{
                            padding: '10px 14px',
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#1e40af',
                            fontSize: '12px',
                            fontWeight: 500,
                        }}
                    >
                        <RefreshCw size={15} className="animate-spin" />
                        <span>{downloadProgress}</span>
                    </div>
                )}

                {isOutdated && installError && (
                    <div
                        style={{
                            padding: '10px 14px',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#b91c1c',
                            fontSize: '12px',
                        }}
                    >
                        <AlertCircle size={15} />
                        <span>{installError}</span>
                    </div>
                )}

                <Divider />

                {/* Footer Action Buttons */}
                <HStack gap={2} justify="end" wrap="wrap">
                    {isOutdated ? (
                        /* OUTDATED: Tampilkan Tombol Nanti Saja + Tawaran Unduh / Reload */
                        <>
                            <Button
                                variant="secondary"
                                label="Nanti Saja"
                                onClick={handleDismiss}
                                isDisabled={isDownloading}
                            />

                            {isNative ? (
                                <>
                                    {installError && (
                                        <Button
                                            variant="secondary"
                                            icon={<Download size={15} />}
                                            label="Unduh Manual via Browser"
                                            onClick={handleManualDownloadFallback}
                                        />
                                    )}
                                    <Button
                                        variant="primary"
                                        icon={<Download size={15} />}
                                        label={isDownloading ? 'Sedang Mengunduh...' : 'Unduh & Pasang Update Otomatis'}
                                        onClick={handleAutoDownloadAndInstallApk}
                                        isDisabled={isDownloading}
                                    />
                                </>
                            ) : (
                                <Button
                                    variant="primary"
                                    icon={<RefreshCw size={15} />}
                                    label="Muat Ulang Halaman Sekarang"
                                    onClick={handleReloadWeb}
                                />
                            )}
                        </>
                    ) : (
                        /* TIDAK OUTDATED: Hanya Berikan Tombol Tutup / Mengerti (JUST INFO, TIDAK DITAWARI UNDUH) */
                        <Button
                            variant="primary"
                            icon={<CheckCircle2 size={15} />}
                            label="Mengerti"
                            onClick={handleDismiss}
                        />
                    )}
                </HStack>
            </VStack>
        </Modal>
    );
};
