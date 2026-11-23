import { Spinner } from '@astryxdesign/core/Spinner';

const LoadingSpinner = () => {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-wash, #f8f8f8)',
                zIndex: 50,
            }}
        >
            <Spinner size="lg" label="Memuat..." />
        </div>
    );
};

export default LoadingSpinner;
