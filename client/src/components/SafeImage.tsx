import React, { useEffect, useState } from 'react';
import { resolveUploadUrl } from '../lib/storeSettings';

// Global memory cache for resolved image blobs across re-renders
const blobCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string>>();

/**
 * Fetches an image URL using native fetch with 'ngrok-skip-browser-warning' header,
 * converting it to a local blob: URL that Android WebViews can render without interstitial errors.
 */
export const fetchImageAsBlobUrl = async (rawUrl: string): Promise<string> => {
    const fullUrl = resolveUploadUrl(rawUrl);
    if (!fullUrl) return '';

    // If it's already a blob: or data: URL, return as-is
    if (fullUrl.startsWith('data:') || fullUrl.startsWith('blob:')) {
        return fullUrl;
    }

    // Check existing in-memory cache
    if (blobCache.has(fullUrl)) {
        return blobCache.get(fullUrl)!;
    }

    // De-duplicate concurrent requests for the exact same image
    if (inFlightRequests.has(fullUrl)) {
        return inFlightRequests.get(fullUrl)!;
    }

    const fetchPromise = (async () => {
        try {
            const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
            const headers: Record<string, string> = {
                'ngrok-skip-browser-warning': 'true',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(fullUrl, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} when fetching image: ${fullUrl}`);
            }

            const blob = await response.blob();
            // Validate that we received an actual image and not an HTML error/interstitial page
            if (blob.type.includes('text/html')) {
                throw new Error(`Expected image, received HTML text for: ${fullUrl}`);
            }

            const objectUrl = URL.createObjectURL(blob);
            blobCache.set(fullUrl, objectUrl);
            return objectUrl;
        } catch (err) {
            console.warn('[SafeImage] Failed to convert image to blob, falling back to direct URL:', err);
            return fullUrl;
        } finally {
            inFlightRequests.delete(fullUrl);
        }
    })();

    inFlightRequests.set(fullUrl, fetchPromise);
    return fetchPromise;
};

/**
 * Custom React hook that resolves any upload/image URL to a safe blob URL for Android WebView.
 */
export const useSafeImageSrc = (rawUrl?: string | null): string | null => {
    const [src, setSrc] = useState<string | null>(() => {
        if (!rawUrl) return null;
        const full = resolveUploadUrl(rawUrl);
        if (!full) return null;
        if (full.startsWith('data:') || full.startsWith('blob:')) return full;
        return blobCache.get(full) || null;
    });

    useEffect(() => {
        if (!rawUrl || !rawUrl.trim()) {
            setSrc(null);
            return;
        }

        const fullUrl = resolveUploadUrl(rawUrl);
        if (!fullUrl) {
            setSrc(null);
            return;
        }

        if (fullUrl.startsWith('data:') || fullUrl.startsWith('blob:')) {
            setSrc(fullUrl);
            return;
        }

        if (blobCache.has(fullUrl)) {
            setSrc(blobCache.get(fullUrl)!);
            return;
        }

        let isMounted = true;
        fetchImageAsBlobUrl(fullUrl).then((resolved) => {
            if (isMounted) {
                setSrc(resolved);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [rawUrl]);

    return src;
};

export interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src?: string | null;
    fallback?: React.ReactNode;
}

/**
 * Safe drop-in replacement for <img> tags that guarantees images bypass
 * ngrok browser warning interstitials and CORS restrictions on mobile Android WebViews.
 */
export const SafeImage: React.FC<SafeImageProps> = ({
    src: rawSrc,
    alt,
    className,
    style,
    fallback,
    onError,
    ...props
}) => {
    const safeSrc = useSafeImageSrc(rawSrc);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [rawSrc]);

    if (!rawSrc || hasError) {
        if (fallback) return <>{fallback}</>;
        return null;
    }

    if (!safeSrc) {
        // Subtle placeholder while fetching binary blob
        return (
            <div
                className={`animate-pulse bg-zinc-100 ${className || ''}`}
                style={style}
                aria-label={alt || 'Memuat gambar...'}
            />
        );
    }

    return (
        <img
            src={safeSrc}
            alt={alt}
            className={className}
            style={style}
            onError={(e) => {
                setHasError(true);
                onError?.(e);
            }}
            {...props}
        />
    );
};

export default SafeImage;
