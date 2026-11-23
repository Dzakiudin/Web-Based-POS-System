import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught UI error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/dashboard';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f4f4f5',
                        padding: 20,
                        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            maxWidth: 440,
                            backgroundColor: '#ffffff',
                            borderRadius: 16,
                            border: '1px solid #e4e4e7',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                            padding: '28px 24px',
                            textAlign: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: 14,
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 16,
                            }}
                        >
                            <AlertTriangle size={26} />
                        </div>
                        <h2
                            style={{
                                margin: '0 0 8px 0',
                                fontSize: 18,
                                fontWeight: 700,
                                color: '#09090b',
                            }}
                        >
                            Terjadi Gangguan Tampilan
                        </h2>
                        <p
                            style={{
                                margin: '0 0 20px 0',
                                fontSize: 13.5,
                                lineHeight: 1.5,
                                color: '#52525b',
                            }}
                        >
                            Aplikasi mengalami kesalahan tak terduga saat memuat halaman ini. Data transaksi Anda di server tetap aman.
                        </p>

                        {this.state.error?.message && (
                            <details
                                style={{
                                    textAlign: 'left',
                                    marginBottom: 20,
                                    padding: '10px 12px',
                                    backgroundColor: '#fafafa',
                                    border: '1px solid #e4e4e7',
                                    borderRadius: 10,
                                    fontSize: 12,
                                    color: '#71717a',
                                }}
                            >
                                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#3f3f46' }}>
                                    Detail Teknis Error
                                </summary>
                                <pre
                                    style={{
                                        margin: '8px 0 0 0',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: 11,
                                        color: '#b91c1c',
                                    }}
                                >
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={this.handleGoHome}
                                style={{
                                    flex: 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: '1px solid #e4e4e7',
                                    backgroundColor: '#ffffff',
                                    color: '#18181b',
                                    fontSize: 13.5,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                <Home size={15} />
                                <span>Dashboard</span>
                            </button>
                            <button
                                type="button"
                                onClick={this.handleReload}
                                style={{
                                    flex: 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: 'none',
                                    backgroundColor: '#18181b',
                                    color: '#ffffff',
                                    fontSize: 13.5,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                <RefreshCw size={15} />
                                <span>Muat Ulang</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
