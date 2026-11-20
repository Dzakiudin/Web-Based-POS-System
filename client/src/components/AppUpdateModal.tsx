import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, RefreshCw, Download, AlertCircle } from 'lucide-react';
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

export const CURRENT_CLIENT_VERSION = '2.0.0';

export interface VersionInfo {
    version: string;
    releaseDate?: string;
    releaseNotes: string;
    downloadUrl: string;
}

interface AppInstallerPlugin {
    installApk(options: { filePath: string }): Promise<{ success: boolean }>;
}

const AppInstaller = registerPlugin<AppInstallerPlugin>('AppInstaller');

export const AppUpdateModal: React.FC = () => {
    const isNative = Capacitor.isNativePlatform();
    const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<string>('');
    const [installError, setInstallError] = useState<string>('');

    const checkUpdate = async (isManual = false) => {
        try {
            const res = await api.get('/app/version');
            if (res.data && res.data.version && res.data.version !== CURRENT_CLIENT_VERSION) {
                const dismissed = sessionStorage.getItem('dismissed_version');
                if (isManual || dismissed !== res.data.version) {
                    setUpdateInfo(res.data);
                    setIsOpen(true);
                }
            } else if (isManual) {
                alert(`Aplikasi sudah dalam versi terbaru (v${CURRENT_CLIENT_VERSION})!`);
            }
        } catch (e) {
            console.warn('Gagal memeriksa pembaruan aplikasi', e);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            checkUpdate(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        if (updateInfo) {
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

    // Untuk Android APK: Unduh APK di latar belakang aplikasi lalu buka installer otomatis
    const handleAutoDownloadAndInstallApk = async () => {
        if (!updateInfo?.downloadUrl) return;

        setIsDownloading(true);
        setInstallError('');
        setDownloadProgress('Menghubungkan ke server...');

        try {
            const apkFileName = `pos-update-v${updateInfo.version}.apk`;
            setDownloadProgress('Mengunduh paket APK pembaruan...');

            // Unduh file langsung ke Cache aplikasi menggunakan Filesystem
            const downloadRes = await Filesystem.downloadFile({
                url: updateInfo.downloadUrl,
                path: apkFileName,
                directory: Directory.Cache,
            });

            setDownloadProgress('Unduhan selesai! Membuka installer Android...');

            if (!downloadRes.path) {
                throw new Error('Gagal mendapatkan lokasi file APK yang diunduh.');
            }

            // Panggil native plugin untuk memunculkan dialog update sistem Android
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
            title={isNative ? "Pembaruan Aplikasi Android Tersedia" : "Pembaruan Web Tersedia"}
        >
            <VStack gap={4} padding={1}>
                <Banner
                    status="info"
                    title={`Versi Baru v${updateInfo.version} Tersedia!`}
                    description={
                        isNative
                            ? "Versi terbaru aplikasi POS Android siap dipasang. Anda dapat mengunduh dan memasangnya langsung di dalam aplikasi ini."
                            : "Sistem telah diperbarui di server. Muat ulang halaman browser untuk menerapkan fitur dan perbaikan terbaru."
                    }
                    icon={<ArrowUpCircle size={18} />}
                    container="section"
                />

                <HStack justify="between" align="center">
                    <Text size="sm" color="secondary">Versi Saat Ini:</Text>
                    <Badge variant="neutral" label={`v${CURRENT_CLIENT_VERSION}`} />
                </HStack>
                <HStack justify="between" align="center">
                    <Text size="sm" weight="semibold">Versi Terbaru:</Text>
                    <Badge variant="success" label={`v${updateInfo.version}`} />
                </HStack>

                <Divider />

                <VStack gap={1}>
                    <Text size="sm" weight="semibold">Catatan Pembaruan:</Text>
                    <div style={{
                        backgroundColor: '#f4f4f5',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        lineHeight: 1.5,
                        color: '#3f3f46',
                        whiteSpace: 'pre-line'
                    }}>
                        {updateInfo.releaseNotes}
                    </div>
                </VStack>

                {/* Progress / Status Unduhan untuk Android APK */}
                {isNative && isDownloading && (
                    <div style={{
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
                    }}>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>{downloadProgress}</span>
                    </div>
                )}

                {installError && (
                    <div style={{
                        padding: '10px 14px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#b91c1c',
                        fontSize: '12px',
                    }}>
                        <AlertCircle size={15} />
                        <span>{installError}</span>
                    </div>
                )}

                <Divider />

                <HStack gap={2} justify="end" wrap="wrap">
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
                                label={isDownloading ? "Sedang Mengunduh..." : "Unduh & Pasang Update Otomatis"}
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
                </HStack>
            </VStack>
        </Modal>
    );
};
