import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, RefreshCw, Download } from 'lucide-react';
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

export const AppUpdateModal: React.FC = () => {
    const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
    const [isOpen, setIsOpen] = useState(false);

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

    const handleRestartAndApply = () => {
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    const handleDownloadApk = () => {
        if (updateInfo?.downloadUrl) {
            window.open(updateInfo.downloadUrl, '_blank');
        }
    };

    if (!updateInfo) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleDismiss}
            title="Pembaruan Aplikasi Tersedia"
        >
            <VStack gap={4} padding={1}>
                <Banner
                    status="info"
                    title={`Versi Baru v${updateInfo.version} Tersedia!`}
                    description="Pembaruan sistem kasir telah dirilis untuk meningkatkan kinerja dan kestabilan."
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
                    <Text size="sm" color="secondary">
                        {updateInfo.releaseNotes}
                    </Text>
                </VStack>

                <Divider />

                <HStack gap={2} justify="end" wrap="wrap">
                    <Button
                        variant="secondary"
                        label="Nanti Saja"
                        onClick={handleDismiss}
                    />
                    <Button
                        variant="secondary"
                        icon={<Download size={15} />}
                        label="Unduh APK Baru"
                        onClick={handleDownloadApk}
                    />
                    <Button
                        variant="primary"
                        icon={<RefreshCw size={15} />}
                        label="Muat Ulang / Terapkan"
                        onClick={handleRestartAndApply}
                    />
                </HStack>
            </VStack>
        </Modal>
    );
};
