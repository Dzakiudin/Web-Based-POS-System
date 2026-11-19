import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Flashlight, SwitchCamera, Check, Barcode, AlertCircle } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Badge } from '@astryxdesign/core/Badge';
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
    const dialogRef = useRef<HTMLDialogElement | null>(null);
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

    // Synchronize HTML5 native <dialog> with isOpen state to place in browser's top layer
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            if (!dialog.open) {
                try {
                    dialog.showModal();
                } catch {
                    // Fallback if already showing
                }
            }

            setErrorMsg('');
            setLastScanned('');
            setScannedCount(0);
            let mounted = true;

            const timer = setTimeout(() => {
                if (!mounted) return;
                startScanner();
            }, 150);

            return () => {
                mounted = false;
                clearTimeout(timer);
                stopScanner();
            };
        } else {
            stopScanner();
            if (dialog.open) {
                try {
                    dialog.close();
                } catch {
                    // Fallback if already closed
                }
            }
        }
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
                qrbox: { width: 280, height: 180 },
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
                setErrorMsg('Izin kamera ditolak. Berikan izin akses kamera di peramban Anda atau masukkan barcode secara manual di bawah.');
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

    if (!isOpen) return null;

    const modalContent = (
        <dialog
            ref={dialogRef}
            className="pos-scanner-dialog"
            onCancel={(e) => {
                e.preventDefault();
                onClose();
            }}
            style={{
                margin: 'auto',
                padding: 0,
                border: 'none',
                borderRadius: 20,
                background: 'transparent',
                maxWidth: 460,
                width: 'calc(100% - 24px)',
                overflow: 'visible',
                outline: 'none',
                boxShadow: 'none',
            }}
        >
            <div
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 20,
                    width: '100%',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'posPageEnter 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #e4e4e7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                backgroundColor: '#f4f4f5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#18181b',
                            }}
                        >
                            <Camera size={18} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#18181b' }}>{title}</h3>
                            <p style={{ margin: 0, fontSize: 12, color: '#71717a' }}>{subtitle}</p>
                        </div>
                    </div>
                    <IconButton variant="ghost" size="sm" label="Tutup scanner" icon={<X size={18} />} onClick={onClose} />
                </div>

                {/* Camera Viewport & Live Stream */}
                <div
                    style={{
                        position: 'relative',
                        backgroundColor: '#09090b',
                        minHeight: 280,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                    }}
                >
                    <div id="pos-html5-qr-reader" style={{ width: '100%' }} />

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
                                    width: 260,
                                    height: 160,
                                    borderRadius: 16,
                                    border: '2px dashed rgba(255, 255, 255, 0.65)',
                                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Animated Laser Scan Beam */}
                                <div className="pos-scanner-laser" />
                            </div>
                        </div>
                    )}

                    {/* Camera Control Overlays */}
                    {cameraActive && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                display: 'flex',
                                gap: 8,
                                zIndex: 10,
                            }}
                        >
                            {torchSupported && (
                                <button
                                    type="button"
                                    onClick={toggleTorch}
                                    aria-label="Nyalakan senter"
                                    style={{
                                        width: 36,
                                        height: 36,
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
                                    <Flashlight size={16} />
                                </button>
                            )}
                            {availableCameras.length > 1 && (
                                <button
                                    type="button"
                                    onClick={switchCamera}
                                    aria-label="Ganti kamera"
                                    style={{
                                        width: 36,
                                        height: 36,
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
                                    <SwitchCamera size={16} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Error Banner when camera is unavailable */}
                    {errorMsg && (
                        <div
                            style={{
                                padding: 24,
                                textAlign: 'center',
                                color: '#ffffff',
                                maxWidth: 360,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 12,
                            }}
                        >
                            <AlertCircle size={36} color="#ef4444" />
                            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#fca5a5' }}>{errorMsg}</p>
                            <Button variant="secondary" size="sm" label="Coba Akses Lagi" onClick={startScanner} />
                        </div>
                    )}

                    {/* Success Toast in continuous mode */}
                    {lastScanned && continuous && (
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
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {allowContinuous && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                borderRadius: 10,
                                backgroundColor: '#f4f4f5',
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
                                        padding: '4px 10px',
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

                    <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                            <TextInput
                                label="Input Barcode Manual"
                                isLabelHidden
                                placeholder="Ketik barcode jika kamera buram..."
                                value={manualCode}
                                onChange={(v) => setManualCode(v)}
                                startIcon={<Barcode size={15} />}
                            />
                        </div>
                        <Button type="submit" variant="primary" label="Input" isDisabled={!manualCode.trim()} />
                    </form>
                </div>
            </div>
        </dialog>,
        document.body
    );
};

export default BarcodeScannerModal;
