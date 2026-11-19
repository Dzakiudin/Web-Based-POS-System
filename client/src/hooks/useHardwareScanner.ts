import { useEffect, useRef } from 'react';

interface UseHardwareScannerOptions {
    onScan: (barcode: string) => void;
    enabled?: boolean;
    minBarcodeLength?: number;
    maxIntervalMs?: number;
}

/**
 * Hook to detect physical USB or Bluetooth barcode scanners (HID keyboard emulation).
 * Hardware scanners send keyboard events with high frequency (< 50ms per key) followed by 'Enter'.
 */
export const useHardwareScanner = ({
    onScan,
    enabled = true,
    minBarcodeLength = 3,
    maxIntervalMs = 60,
}: UseHardwareScannerOptions) => {
    const bufferRef = useRef<string>('');
    const lastKeyTimeRef = useRef<number>(0);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore function keys, control, alt, shift, etc.
            if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
                return;
            }

            const activeEl = document.activeElement;
            const isTypingInInput =
                activeEl &&
                (activeEl.tagName === 'TEXTAREA' ||
                    (activeEl.tagName === 'INPUT' && (activeEl as HTMLInputElement).type !== 'search'));

            const now = Date.now();
            const timeDiff = now - lastKeyTimeRef.current;
            lastKeyTimeRef.current = now;

            if (e.key === 'Enter') {
                const buffer = bufferRef.current.trim();
                bufferRef.current = '';

                // If buffer is long enough and typed quickly (average < 60ms per char)
                if (buffer.length >= minBarcodeLength) {
                    // Prevent form submit if inside a form
                    e.preventDefault();
                    onScan(buffer);
                }
                return;
            }

            // If time since last key is too long, reset the buffer (human typing is slow)
            if (timeDiff > maxIntervalMs && bufferRef.current.length > 0) {
                bufferRef.current = '';
            }

            // Only accumulate printable single characters
            if (e.key.length === 1) {
                // If not typing in a regular text input or if scanner burst has started
                if (!isTypingInInput || bufferRef.current.length > 0) {
                    bufferRef.current += e.key;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [enabled, minBarcodeLength, maxIntervalMs, onScan]);
};

export default useHardwareScanner;
