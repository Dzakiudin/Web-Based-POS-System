import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Flashlight, SwitchCamera, Check, Barcode, AlertCircle } from 'lucide-react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Badge } from '@astryxdesign/core/Badge';
import { VStack } from '@astryxdesign/core/VStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { sound } from '../lib/sound';

interface BarcodeScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (barcode: string) => void;
    title?: string;
    subtitle?: string;
    allowContinuous?: boolean;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
    isOpen,
    onClose,
    onScan,
    title = 'Scan Barcode Kemasan',
    subtitle = 'Arahkan kamera ke barcode / QR code pada produk',
    allowContinuous = false,
}) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [cameraActive, setCameraActive] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [manualCode, setManualCode] = useState<string>('');
    const [torchOn, setTorchOn] = useState<boolean>(false);
    const [torchSupported, setTorchSupported] = useState<boolean>(false);
    const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
    const [cameraIndex, setCameraIndex] = useState<number>(0);
    const [lastScanned, setLastScanned] = useState<string>('');
    const [scannedCount, setScannedCount] = useState<number>(0);
    const [continuous, setContinuous] = useState<boolean>(allowContinuous);
    const isScanningRef = useRef<boolean>(false);

    // Initialize scanner when modal opens
    useEffect(() => {
        if (!isOpen) {
            stopScanner();
            return;
        }

        setErrorMsg('');
        setLastScanned('');
        setScannedCount(0);
        let mounted = true;

        const timer = setTimeout(() => {
            if (!mounted) return;
            startScanner();
        }, 220);

        return () => {
            mounted = false;
            clearTimeout(timer);
            stopScanner();
        };
    }, [isOpen, cameraIndex]);

    const startScanner = async () => {
        const readerElement = document.getElementById('pos-html5-qr-reader');
        if (!readerElement) return;

        try {
            if (scannerRef.current) {
                await stopScanner();
            }

            const html5QrCode = new Html5Qrcode('pos-html5-qr-reader', {
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.QR_CODE,
                ],
                verbose: false,
            });

            scannerRef.current = html5QrCode;

            const config = {
                fps: 15,
                qrbox: { width: 260, height: 160 },
                aspectRatio: 1.33,
            };

            // Query available cameras to avoid OverconstrainedError on PC/laptop webcams
            let cameras: Array<{ id: string; label: string }> = [];
            try {
                cameras = await Html5Qrcode.getCameras();
                setAvailableCameras(cameras);
            } catch {
                cameras = [];
            }

            if (cameras && cameras.length > 0) {
                const activeCam = cameras[cameraIndex % cameras.length];
                await html5QrCode.start(
                    activeCam.id,
                    config,
                    (decodedText) => handleScanSuccess(decodedText),
                    () => {}
                );
            } else {
                try {
                    await html5QrCode.start(
                        { facingMode: { ideal: 'environment' } },
                        config,
                        (decodedText) => handleScanSuccess(decodedText),
                        () => {}
                    );
                } catch {
                    await html5QrCode.start(
                        { facingMode: 'user' },
                        config,
                        (decodedText) => handleScanSuccess(decodedText),
                        () => {}
                    );
                }
            }

            setCameraActive(true);
            setErrorMsg('');

            // Safely check torch capability
            try {
                const capabilities = html5QrCode.getRunningTrackCameraCapabilities();
                const canTorch = capabilities?.torchFeature?.()?.isSupported?.() ?? false;
                setTorchSupported(Boolean(canTorch));
            } catch {
                setTorchSupported(false);
            }
        } catch (err: any) {
            console.warn('Camera scanner start error:', err);
            setCameraActive(false);
            if (String(err).includes('NotAllowedError') || String(err).includes('Permission')) {
                setErrorMsg('Izin kamera ditolak. Berikan izin akses kamera di browser Anda atau masukkan barcode secara manual di bawah.');
            } else if (String(err).includes('OverconstrainedError') || String(err).includes('Constraint')) {
                setErrorMsg('Kamera yang diminta tidak didukung oleh perangkat ini.');
            } else {
                setErrorMsg('Kamera tidak dapat diakses atau sedang digunakan oleh aplikasi lain.');
            }
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch {
                // Ignore transient stop errors
            } finally {
                scannerRef.current = null;
                setCameraActive(false);
                setTorchOn(false);
                setTorchSupported(false);
            }
        }
    };

    const handleScanSuccess = (code: string) => {
        const trimmed = code.trim();
        if (!trimmed) return;

        // Debounce rapid double reads of identical barcode within 1.2s
        if (isScanningRef.current && lastScanned === trimmed) return;

        isScanningRef.current = true;
        setLastScanned(trimmed);
        setScannedCount((prev) => prev + 1);
        sound.playBeep();

        onScan(trimmed);

        if (!continuous) {
            stopScanner();
            onClose();
        } else {
            // Cool down before reading next barcode
            setTimeout(() => {
                isScanningRef.current = false;
            }, 1200);
        }
    };

    const toggleTorch = async () => {
        if (!scannerRef.current || !cameraActive || !torchSupported) return;
        try {
            const nextState = !torchOn;
            await scannerRef.current.applyVideoConstraints({
                advanced: [{ torch: nextState }] as any,
            });
            setTorchOn(nextState);
        } catch {
            setTorchSupported(false);
        }
    };

    const switchCamera = () => {
        if (availableCameras.length <= 1) return;
        setCameraIndex((prev) => (prev + 1) % availableCameras.length);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const code = manualCode.trim();
        if (!code) return;
        handleScanSuccess(code);
        setManualCode('');
    };

    return (
        <Dialog
            isOpen={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    stopScanner();
                    onClose();
                }
            }}
            width={isMobile ? 'calc(100vw - 28px)' : 500}
            padding={isMobile ? 4 : 5}
            purpose="form"
        >
            <VStack gap={3} width="100%">
                <DialogHeader
                    title={title}
                    subtitle={subtitle}
                    onOpenChange={(open) => {
                        if (!open) {
                            stopScanner();
                            onClose();
                        }
                    }}
                    hasDivider
                />

                {/* Camera Viewport & Live Stream */}
                <div
                    style={{
                        position: 'relative',
                        backgroundColor: '#09090b',
                        borderRadius: 12,
                        width: '100%',
                        aspectRatio: isMobile ? '4 / 3' : '16 / 10',
                        maxHeight: isMobile ? 260 : 300,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                    }}
                >
                    <div id="pos-html5-qr-reader" style={{ width: '100%', height: '100%' }} />

                    {/* Laser Target Reticle Overlay */}
                    {cameraActive && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <div
                                style={{
                                    width: isMobile ? 230 : 260,
                                    height: isMobile ? 140 : 160,
                                    borderRadius: 16,
                                    border: '2px dashed rgba(255, 255, 255, 0.75)',
                                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                <div className="pos-scanner-laser" />
                            </div>
                        </div>
                    )}

                    {/* Camera Control Overlays */}
                    {cameraActive && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                display: 'flex',
                                gap: 6,
                                zIndex: 10,
                            }}
                        >
                            {torchSupported && (
                                <button
                                    type="button"
                                    onClick={toggleTorch}
                                    aria-label="Nyalakan senter"
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 999,
                                        backgroundColor: torchOn ? '#eab308' : 'rgba(0,0,0,0.65)',
                                        color: torchOn ? '#000' : '#fff',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        backdropFilter: 'blur(4px)',
                                    }}
                                >
                                    <Flashlight size={15} />
                                </button>
                            )}
                            {availableCameras.length > 1 && (
                                <button
                                    type="button"
                                    onClick={switchCamera}
                                    aria-label="Ganti kamera"
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 999,
                                        backgroundColor: 'rgba(0,0,0,0.65)',
                                        color: '#fff',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        backdropFilter: 'blur(4px)',
                                    }}
                                >
                                    <SwitchCamera size={15} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Error Banner when camera is unavailable */}
                    {errorMsg && (
                        <div
                            style={{
                                padding: 20,
                                textAlign: 'center',
                                color: '#ffffff',
                                maxWidth: 340,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 8,
                                zIndex: 10,
                            }}
                        >
                            <AlertCircle size={32} color="#ef4444" />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{errorMsg}</span>
                        </div>
                    )}

                    {/* Temporary toast on scan */}
                    {lastScanned && (
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 12,
                                padding: '6px 14px',
                                borderRadius: 999,
                                backgroundColor: '#16a34a',
                                color: '#ffffff',
                                fontSize: 12,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.4)',
                                zIndex: 10,
                                animation: 'posDotPop 240ms ease both',
                            }}
                        >
                            <Check size={14} />
                            <span>Terpindai: {lastScanned}</span>
                        </div>
                    )}
                </div>

                {/* Footer Controls & Manual Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', marginTop: 2 }}>
                    {allowContinuous && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                borderRadius: 10,
                                backgroundColor: '#f4f4f5',
                                width: '100%',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Barcode size={16} color="#52525b" />
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#18181b' }}>Mode Scan Beruntun</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {scannedCount > 0 && <Badge variant="success" label={`${scannedCount} item`} />}
                                <button
                                    type="button"
                                    onClick={() => setContinuous(!continuous)}
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 650,
                                        padding: '5px 12px',
                                        borderRadius: 6,
                                        border: 'none',
                                        backgroundColor: continuous ? '#18181b' : '#e4e4e7',
                                        color: continuous ? '#ffffff' : '#3f3f46',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {continuous ? 'Aktif' : 'Sekali Scan'}
                                </button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8, width: '100%' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <TextInput
                                label="Input Barcode Manual"
                                isLabelHidden
                                placeholder="Ketik barcode manual..."
                                value={manualCode}
                                onChange={(v) => setManualCode(v)}
                                startIcon={<Barcode size={15} />}
                            />
                        </div>
                        <Button type="submit" variant="primary" label="Input" isDisabled={!manualCode.trim()} />
                    </form>

                    <Button
                        variant="secondary"
                        label="Tutup Pemindai"
                        onClick={() => {
                            stopScanner();
                            onClose();
                        }}
                        width="100%"
                    />
                </div>
            </VStack>
        </Dialog>
    );
};

export default BarcodeScannerModal;
