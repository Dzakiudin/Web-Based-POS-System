import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
    isRequired?: boolean;
    isLabelHidden?: boolean;
    description?: string;
    autoFocus?: boolean;
    disabled?: boolean;
    min?: number;
    max?: number;
    width?: string | number;
    size?: 'sm' | 'md' | 'lg';
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
    label,
    value,
    onChange,
    placeholder = '0',
    isRequired,
    isLabelHidden,
    description,
    autoFocus,
    disabled,
    min = 0,
    max = 999999999999,
    width = '100%',
    size = 'md',
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [displayVal, setDisplayVal] = useState<string>(() => {
        return value > 0 ? value.toLocaleString('id-ID') : '';
    });

    useEffect(() => {
        if (!isFocused) {
            setDisplayVal(value > 0 ? value.toLocaleString('id-ID') : '');
        }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '');
        if (!raw) {
            setDisplayVal('');
            onChange(0);
            return;
        }
        const num = Math.min(max, Math.max(min, Number(raw)));
        setDisplayVal(num.toLocaleString('id-ID'));
        onChange(num);
    };

    const height = size === 'sm' ? 32 : size === 'lg' ? 42 : 36;
    const fontSize = size === 'sm' ? 13 : size === 'lg' ? 15 : 14;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: width || '100%' }}>
            {!isLabelHidden && (
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {label} {isRequired && <span style={{ color: '#e11d48' }}>*</span>}
                </label>
            )}
            {description && (
                <span style={{ fontSize: 11, color: '#6b7280', marginTop: -2 }}>
                    {description}
                </span>
            )}
            <div
                className="pos-currency-input-wrapper"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: disabled ? '#f4f4f5' : '#ffffff',
                    border: isFocused ? '1.5px solid #18181b' : '1px solid #e4e4e7',
                    boxShadow: isFocused ? '0 0 0 3px rgba(24, 24, 27, 0.06)' : '0 1px 2px rgba(0, 0, 0, 0.03)',
                    borderRadius: 8,
                    height,
                    padding: '0 10px',
                    transition: 'border-color 150ms ease, box-shadow 150ms ease',
                    boxSizing: 'border-box',
                    cursor: disabled ? 'not-allowed' : 'text',
                }}
            >
                <span
                    style={{
                        fontSize,
                        fontWeight: 700,
                        color: isFocused ? '#18181b' : '#71717a',
                        userSelect: 'none',
                        marginRight: 6,
                        fontFamily: 'Inter, sans-serif',
                    }}
                >
                    Rp
                </span>
                <input
                    type="text"
                    inputMode="numeric"
                    autoFocus={autoFocus}
                    disabled={disabled}
                    placeholder={placeholder}
                    value={displayVal}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        fontSize,
                        fontWeight: 600,
                        fontFamily: 'Inter, sans-serif',
                        fontVariantNumeric: 'tabular-nums',
                        color: '#09090b',
                        backgroundColor: 'transparent',
                        padding: 0,
                    }}
                />
            </div>
        </div>
    );
};

export default CurrencyInput;
