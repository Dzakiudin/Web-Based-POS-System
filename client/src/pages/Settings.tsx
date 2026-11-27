import React, { useState, useEffect, useRef } from 'react';
import {
    Store,
    QrCode,
    Landmark,
    Printer,
    Upload,
    Trash2,
    Plus,
    Save,
    ShieldAlert,
    ImageIcon,
    Pencil,
    Check,
    X,
} from 'lucide-react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Switch } from '@astryxdesign/core/Switch';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import PageHeader from '../components/PageHeader';
import SafeImage from '../components/SafeImage';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import {
    resolveUploadUrl,
    updateStoreSettingsApi,
    uploadSettingImageApi,
    deleteSettingImageApi,
    type StoreSettings,
    type PaymentAccount,
} from '../lib/storeSettings';
import { printThermalReceipt } from '../lib/thermalPrinter';

const Settings = () => {
    const toast = useToast();
    const { user } = useAuth();
    const { settings, setSettings, refreshSettings } = useStoreSettings();
    const isMobile = useMediaQuery('(max-width: 768px)');

    const [form, setForm] = useState<StoreSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingQris, setIsUploadingQris] = useState(false);

    // Add / Edit payment account inline form state
    const [newAccount, setNewAccount] = useState<PaymentAccount>({
        bank: '',
        accountNumber: '',
        accountName: '',
    });
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editAccountDraft, setEditAccountDraft] = useState<PaymentAccount>({
        bank: '',
        accountNumber: '',
        accountName: '',
    });

    const logoInputRef = useRef<HTMLInputElement | null>(null);
    const qrisInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        refreshSettings().then((fresh) => setForm(fresh));
    }, []);

    const handleSaveAll = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!form.appName.trim()) {
            toast.warning('Nama aplikasi tidak boleh kosong');
            return;
        }
        if (!form.storeName.trim()) {
            toast.warning('Nama toko (kop struk) tidak boleh kosong');
            return;
        }
        setIsSaving(true);
        try {
            const saved = await updateStoreSettingsApi(form);
            setSettings(saved);
            setForm(saved);
            toast.success('Seluruh pengaturan aplikasi berhasil disimpan & diterapkan!');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan pengaturan');
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (kind: 'logo' | 'qris', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
            toast.error('Format gambar harus PNG, JPG, atau WebP');
            return;
        }
        if (file.size > 4 * 1024 * 1024) {
            toast.error('Ukuran file gambar maksimal 4 MB');
            return;
        }

        const setLoading = kind === 'logo' ? setIsUploadingLogo : setIsUploadingQris;
        setLoading(true);
        try {
            const url = await uploadSettingImageApi(kind, file);
            const updated: StoreSettings = {
                ...form,
                ...(kind === 'logo' ? { logoUrl: url } : { qrisImageUrl: url }),
            };
            setForm(updated);
            setSettings(updated);
            toast.success(kind === 'qris' ? 'Foto QRIS berhasil diunggah!' : 'Logo aplikasi berhasil diperbarui!');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Gagal mengunggah gambar');
        } finally {
            setLoading(false);
        }
    };

    const handleImageDelete = async (kind: 'logo' | 'qris') => {
        const setLoading = kind === 'logo' ? setIsUploadingLogo : setIsUploadingQris;
        setLoading(true);
        try {
            await deleteSettingImageApi(kind);
            const updated: StoreSettings = {
                ...form,
                ...(kind === 'logo' ? { logoUrl: null } : { qrisImageUrl: null }),
            };
            setForm(updated);
            setSettings(updated);
            toast.success(kind === 'qris' ? 'Foto QRIS dihapus' : 'Logo dikembalikan ke ikon default');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Gagal menghapus gambar');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAccount = () => {
        if (!newAccount.bank.trim() || !newAccount.accountNumber.trim()) {
            toast.warning('Nama Bank/E-Wallet dan Nomor Rekening wajib diisi');
            return;
        }
        setForm((prev) => ({
            ...prev,
            paymentAccounts: [
                ...prev.paymentAccounts,
                {
                    bank: newAccount.bank.trim(),
                    accountNumber: newAccount.accountNumber.trim(),
                    accountName: newAccount.accountName.trim(),
                },
            ],
        }));
        setNewAccount({ bank: '', accountNumber: '', accountName: '' });
        toast.info('Rekening ditambahkan. Jangan lupa klik "Simpan Pengaturan" untuk menyimpan permanen.');
    };

    const handleStartEditAccount = (idx: number) => {
        setEditingIdx(idx);
        setEditAccountDraft({ ...form.paymentAccounts[idx] });
    };

    const handleSaveEditAccount = () => {
        if (editingIdx === null) return;
        if (!editAccountDraft.bank.trim() || !editAccountDraft.accountNumber.trim()) {
            toast.warning('Nama Bank/E-Wallet dan Nomor Rekening wajib diisi');
            return;
        }
        setForm((prev) => ({
            ...prev,
            paymentAccounts: prev.paymentAccounts.map((item, i) =>
                i === editingIdx
                    ? {
                          bank: editAccountDraft.bank.trim(),
                          accountNumber: editAccountDraft.accountNumber.trim(),
                          accountName: editAccountDraft.accountName.trim(),
                      }
                    : item
            ),
        }));
        setEditingIdx(null);
    };

    const handleDeleteAccount = (idx: number) => {
        setForm((prev) => ({
            ...prev,
            paymentAccounts: prev.paymentAccounts.filter((_, i) => i !== idx),
        }));
        if (editingIdx === idx) setEditingIdx(null);
    };

    const handleTestPrint = () => {
        const sub = 35000;
        const taxAmt = form.taxRate > 0 ? Math.round((sub * form.taxRate) / 100) : 0;
        const svcAmt = form.serviceChargeRate > 0 ? Math.round((sub * form.serviceChargeRate) / 100) : 0;
        const total = sub + taxAmt + svcAmt;
        printThermalReceipt(
            {
                receiptNumber: 'TEST-STRUK-001',
                date: new Date().toISOString(),
                user: { name: user?.name || 'Administrator' },
                customer: { name: 'Pelanggan Uji Coba' },
                method: 'CASH',
                totalPrice: sub,
                discountAmount: 0,
                taxRate: form.taxRate,
                taxAmount: taxAmt,
                serviceChargeRate: form.serviceChargeRate,
                serviceChargeAmount: svcAmt,
                finalPrice: total,
                paid: Math.ceil(total / 50000) * 50000,
                change: Math.ceil(total / 50000) * 50000 - total,
                items: [
                    { name: 'Kopi Susu Gula Aren', quantity: 1, price: 20000, subtotal: 20000 },
                    { name: 'Butter Croissant', quantity: 1, price: 15000, subtotal: 15000 },
                ],
            },
            form
        );
    };

    const logoPreviewSrc = resolveUploadUrl(form.logoUrl);
    const qrisPreviewSrc = resolveUploadUrl(form.qrisImageUrl);

    return (
        <VStack gap={4} width="100%">
            <PageHeader
                title="Pengaturan Aplikasi"
                subtitle="Kelola identitas aplikasi menyeluruh, logo, foto QRIS, rekening transfer, struk thermal, dan aturan kasir"
            />

            <form onSubmit={handleSaveAll} style={{ width: '100%' }}>
                <VStack gap={4} width="100%">
                    <Grid columns={isMobile ? 1 : 2} gap={4}>
                        {/* 1. IDENTITAS APLIKASI & LOGO */}
                        <Card padding={4} elevation="none">
                            <VStack gap={4}>
                                <HStack gap={2} align="center">
                                    <div
                                        style={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: 10,
                                            backgroundColor: '#18181b',
                                            color: '#ffffff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Store size={17} />
                                    </div>
                                    <VStack gap={0}>
                                        <Heading level={4} weight="semibold">Identitas Aplikasi & Toko</Heading>
                                        <Text size="xsm" color="secondary">
                                            Nama aplikasi otomatis mengubah judul di Header, Tab Browser, Login & Laporan
                                        </Text>
                                    </VStack>
                                </HStack>

                                <Divider />

                                {/* Upload Logo */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 14,
                                        padding: 12,
                                        borderRadius: 12,
                                        backgroundColor: '#fafafa',
                                        border: '1px dashed #d4d4d8',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 58,
                                            height: 58,
                                            borderRadius: 12,
                                            backgroundColor: logoPreviewSrc ? '#ffffff' : '#18181b',
                                            border: '1px solid #e4e4e7',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <SafeImage
                                            src={form.logoUrl}
                                            alt="Logo Aplikasi"
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                                            fallback={<Store size={24} color="#ffffff" />}
                                        />
                                    </div>
                                    <VStack gap={1.5} style={{ flex: 1, minWidth: 0 }}>
                                        <Text size="sm" weight="semibold">Logo Aplikasi / Toko</Text>
                                        <Text size="2xs" color="secondary">PNG, JPG, atau WebP (maks. 4 MB). Tampil di header & halaman login.</Text>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 2 }}>
                                            <input
                                                ref={logoInputRef}
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                style={{ display: 'none' }}
                                                onChange={(e) => handleImageUpload('logo', e)}
                                            />
                                            <Button
                                                variant="secondary"
                                                size="md"
                                                icon={<Upload size={14} />}
                                                label={logoPreviewSrc ? 'Ganti Logo' : 'Upload Logo'}
                                                isLoading={isUploadingLogo}
                                                onClick={() => logoInputRef.current?.click()}
                                            />
                                            {logoPreviewSrc && (
                                                <Button
                                                    variant="ghost"
                                                    size="md"
                                                    icon={<Trash2 size={14} color="#dc2626" />}
                                                    label="Hapus"
                                                    isDisabled={isUploadingLogo}
                                                    onClick={() => handleImageDelete('logo')}
                                                />
                                            )}
                                        </div>
                                    </VStack>
                                </div>

                                <TextInput
                                    label="Nama Aplikasi (Menyeluruh)"
                                    placeholder="Contoh: Kopi Senja POS"
                                    value={form.appName}
                                    onChange={(v) => setForm((prev) => ({ ...prev, appName: v }))}
                                    isRequired
                                />
                                <TextInput
                                    label="Nama Toko (Judul Kop Struk)"
                                    placeholder="Contoh: KOPI SENJA CABANG BANDUNG"
                                    value={form.storeName}
                                    onChange={(v) => setForm((prev) => ({ ...prev, storeName: v }))}
                                    isRequired
                                />
                                <TextInput
                                    label="Alamat Lengkap Toko"
                                    placeholder="Jl. Braga No. 45, Bandung"
                                    value={form.address}
                                    onChange={(v) => setForm((prev) => ({ ...prev, address: v }))}
                                />
                                <TextInput
                                    label="No. Telepon / WhatsApp Toko"
                                    placeholder="0812-3456-7890"
                                    value={form.phone}
                                    onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
                                />
                            </VStack>
                        </Card>

                        {/* 2. PEMBAYARAN QRIS (GAMBAR STATIS TOKO) */}
                        <Card padding={4} elevation="none">
                            <VStack gap={4} height="100%">
                                <HStack justify="between" align="center" gap={2}>
                                    <HStack gap={2} align="center">
                                        <div
                                            style={{
                                                width: 34,
                                                height: 34,
                                                borderRadius: 10,
                                                backgroundColor: '#fef2f2',
                                                border: '1px solid #fecaca',
                                                color: '#dc2626',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <QrCode size={17} />
                                        </div>
                                        <VStack gap={0}>
                                            <Heading level={4} weight="semibold">Foto QRIS Pembayaran</Heading>
                                            <Text size="xsm" color="secondary">
                                                Ditampilkan langsung ke pembeli saat kasir memilih metode QRIS
                                            </Text>
                                        </VStack>
                                    </HStack>
                                    <div style={{ flexShrink: 0 }}>
                                        <Badge
                                            variant={qrisPreviewSrc ? 'success' : 'warning'}
                                            label={qrisPreviewSrc ? 'Aktif' : 'Belum Diunggah'}
                                        />
                                    </div>
                                </HStack>

                                <Divider />

                                <div
                                    style={{
                                        flex: 1,
                                        minHeight: 240,
                                        borderRadius: 14,
                                        border: '1.5px dashed #d4d4d8',
                                        backgroundColor: '#fafafa',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 16,
                                        gap: 12,
                                        textAlign: 'center',
                                    }}
                                >
                                    {form.qrisImageUrl ? (
                                        <SafeImage
                                            src={form.qrisImageUrl}
                                            alt="QRIS Pembayaran Toko"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: 260,
                                                borderRadius: 10,
                                                border: '1px solid #e4e4e7',
                                                backgroundColor: '#ffffff',
                                                padding: 6,
                                                objectFit: 'contain',
                                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                            }}
                                        />
                                    ) : (
                                        <>
                                            <div
                                                style={{
                                                    width: 56,
                                                    height: 56,
                                                    borderRadius: 14,
                                                    backgroundColor: '#f4f4f5',
                                                    color: '#71717a',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <ImageIcon size={26} />
                                            </div>
                                            <VStack gap={0.5} align="center">
                                                <Text size="sm" weight="semibold">Belum ada foto QRIS toko</Text>
                                                <Text size="xsm" color="secondary">
                                                    Unggah gambar QRIS resmi Anda (PNG / JPG / WebP, maks. 4 MB)
                                                </Text>
                                            </VStack>
                                        </>
                                    )}

                                    <input
                                        ref={qrisInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleImageUpload('qris', e)}
                                    />
                                    <HStack gap={2} justify="center" wrap="wrap">
                                        <Button
                                            variant={qrisPreviewSrc ? 'secondary' : 'primary'}
                                            size="sm"
                                            icon={<Upload size={14} />}
                                            label={qrisPreviewSrc ? 'Ganti Foto QRIS' : 'Upload Foto QRIS'}
                                            isLoading={isUploadingQris}
                                            onClick={() => qrisInputRef.current?.click()}
                                        />
                                        {qrisPreviewSrc && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                icon={<Trash2 size={14} color="#dc2626" />}
                                                label="Hapus QRIS"
                                                isDisabled={isUploadingQris}
                                                onClick={() => handleImageDelete('qris')}
                                            />
                                        )}
                                    </HStack>
                                </div>
                            </VStack>
                        </Card>

                        {/* 3. REKENING & AKUN PEMBAYARAN (TRANSFER / E-WALLET) */}
                        <Card padding={4} elevation="none">
                            <VStack gap={3}>
                                <HStack justify="between" align="center" gap={2}>
                                    <HStack gap={2} align="center" style={{ minWidth: 0, flex: 1 }}>
                                        <div
                                            style={{
                                                width: 34,
                                                height: 34,
                                                borderRadius: 10,
                                                backgroundColor: '#eff6ff',
                                                border: '1px solid #bfdbfe',
                                                color: '#2563eb',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Landmark size={17} />
                                        </div>
                                        <VStack gap={0} style={{ minWidth: 0, flex: 1 }}>
                                            <Heading level={4} weight="semibold">Rekening & Akun Transfer</Heading>
                                            <Text size="xsm" color="secondary">
                                                Daftar bank & e-wallet yang tampil saat pembayaran Transfer di Kasir
                                            </Text>
                                        </VStack>
                                    </HStack>
                                    <div style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                                        <Badge variant="neutral" label={`${form.paymentAccounts.length} Akun`} />
                                    </div>
                                </HStack>

                                <Divider />

                                {/* Existing accounts list */}
                                <VStack gap={2}>
                                    {form.paymentAccounts.length > 0 ? (
                                        form.paymentAccounts.map((acc, idx) => (
                                            <div
                                                key={`${acc.bank}-${idx}`}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: 10,
                                                    backgroundColor: '#fafafa',
                                                    border: '1px solid #e4e4e7',
                                                }}
                                            >
                                                {editingIdx === idx ? (
                                                    <VStack gap={2}>
                                                        <TextInput
                                                            label="Bank / E-Wallet"
                                                            size="sm"
                                                            value={editAccountDraft.bank}
                                                            onChange={(v) => setEditAccountDraft((p) => ({ ...p, bank: v }))}
                                                        />
                                                        <TextInput
                                                            label="No. Rekening / HP"
                                                            size="sm"
                                                            value={editAccountDraft.accountNumber}
                                                            onChange={(v) => setEditAccountDraft((p) => ({ ...p, accountNumber: v }))}
                                                        />
                                                        <TextInput
                                                            label="Atas Nama"
                                                            size="sm"
                                                            value={editAccountDraft.accountName}
                                                            onChange={(v) => setEditAccountDraft((p) => ({ ...p, accountName: v }))}
                                                        />
                                                        <HStack justify="end" gap={1.5}>
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                icon={<X size={13} />}
                                                                label="Batal"
                                                                onClick={() => setEditingIdx(null)}
                                                            />
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                icon={<Check size={13} />}
                                                                label="Terapkan"
                                                                onClick={handleSaveEditAccount}
                                                            />
                                                        </HStack>
                                                    </VStack>
                                                ) : (
                                                    <HStack justify="between" align="center" gap={2}>
                                                        <VStack gap={0} style={{ minWidth: 0, flex: 1 }}>
                                                            <Text size="sm" weight="bold">{acc.bank}</Text>
                                                            <Text
                                                                size="xsm"
                                                                style={{
                                                                    fontFamily: "'JetBrains Mono', monospace",
                                                                    color: '#18181b',
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                {acc.accountNumber}
                                                            </Text>
                                                            {acc.accountName && (
                                                                <Text size="2xs" color="secondary">a.n. {acc.accountName}</Text>
                                                            )}
                                                        </VStack>
                                                        <HStack gap={1} style={{ flexShrink: 0 }}>
                                                            <IconButton
                                                                variant="ghost"
                                                                size="sm"
                                                                label="Edit rekening"
                                                                icon={<Pencil size={14} />}
                                                                onClick={() => handleStartEditAccount(idx)}
                                                            />
                                                            <IconButton
                                                                variant="ghost"
                                                                size="sm"
                                                                label="Hapus rekening"
                                                                icon={<Trash2 size={14} color="#dc2626" />}
                                                                onClick={() => handleDeleteAccount(idx)}
                                                            />
                                                        </HStack>
                                                    </HStack>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div
                                            style={{
                                                padding: '18px 12px',
                                                borderRadius: 10,
                                                border: '1px dashed #e4e4e7',
                                                textAlign: 'center',
                                            }}
                                        >
                                            <Text size="xsm" color="secondary">
                                                Belum ada rekening terdaftar. Tambahkan rekening bank / e-wallet di bawah.
                                            </Text>
                                        </div>
                                    )}
                                </VStack>

                                {/* Add new account form */}
                                <div
                                    style={{
                                        padding: 12,
                                        borderRadius: 12,
                                        backgroundColor: '#f4f4f5',
                                        border: '1px solid #e4e4e7',
                                    }}
                                >
                                    <VStack gap={2}>
                                        <Text size="xsm" weight="semibold">Tambah Rekening / E-Wallet Baru</Text>
                                        <Grid columns={isMobile ? 1 : 2} gap={2}>
                                            <TextInput
                                                label="Nama Bank / E-Wallet"
                                                size="sm"
                                                placeholder="Contoh: BCA / BRI / DANA"
                                                value={newAccount.bank}
                                                onChange={(v) => setNewAccount((p) => ({ ...p, bank: v }))}
                                            />
                                            <TextInput
                                                label="No. Rekening / No. HP"
                                                size="sm"
                                                placeholder="Contoh: 1234567890"
                                                value={newAccount.accountNumber}
                                                onChange={(v) => setNewAccount((p) => ({ ...p, accountNumber: v }))}
                                            />
                                        </Grid>
                                        <HStack gap={2} align="end">
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <TextInput
                                                    label="Atas Nama"
                                                    size="sm"
                                                    placeholder="Contoh: Budi Santoso"
                                                    value={newAccount.accountName}
                                                    onChange={(v) => setNewAccount((p) => ({ ...p, accountName: v }))}
                                                />
                                            </div>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                icon={<Plus size={14} />}
                                                label="Tambah"
                                                onClick={handleAddAccount}
                                            />
                                        </HStack>
                                    </VStack>
                                </div>
                            </VStack>
                        </Card>

                        {/* 4. STRUK THERMAL & ATURAN KASIR */}
                        <Card padding={4} elevation="none">
                            <VStack gap={4}>
                                <HStack gap={2} align="center">
                                    <div
                                        style={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: 10,
                                            backgroundColor: '#ecfdf5',
                                            border: '1px solid #a7f3d0',
                                            color: '#059669',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Printer size={17} />
                                    </div>
                                    <VStack gap={0}>
                                        <Heading level={4} weight="semibold">Struk Thermal & Aturan Kasir</Heading>
                                        <Text size="xsm" color="secondary">
                                            Ukuran kertas printer, catatan struk, wajib shift, dan tarif pajak/layanan
                                        </Text>
                                    </VStack>
                                </HStack>

                                <Divider />

                                <Selector
                                    label="Ukuran Kertas Printer Thermal"
                                    value={form.paperWidth}
                                    onChange={(v) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            paperWidth: v === '58mm' ? '58mm' : '80mm',
                                        }))
                                    }
                                    options={[
                                        { value: '80mm', label: '80mm — Printer Thermal Standar' },
                                        { value: '58mm', label: '58mm — Printer Thermal Mini / Bluetooth' },
                                    ]}
                                    width="100%"
                                />

                                <TextInput
                                    label="Pesan Footer Struk Baris 1"
                                    placeholder="Terima kasih atas kunjungan Anda!"
                                    value={form.footerLine1}
                                    onChange={(v) => setForm((prev) => ({ ...prev, footerLine1: v }))}
                                />
                                <TextInput
                                    label="Pesan Footer Struk Baris 2"
                                    placeholder="Barang yang dibeli tidak dapat ditukar"
                                    value={form.footerLine2}
                                    onChange={(v) => setForm((prev) => ({ ...prev, footerLine2: v }))}
                                />

                                <Divider />

                                {/* Aturan Operasional Kasir */}
                                <div
                                    style={{
                                        padding: 12,
                                        borderRadius: 12,
                                        backgroundColor: '#fafafa',
                                        border: '1px solid #e4e4e7',
                                    }}
                                >
                                    <HStack justify="between" align="center" gap={3}>
                                        <HStack gap={2} align="start" style={{ flex: 1, minWidth: 0 }}>
                                            <ShieldAlert size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                                            <VStack gap={0}>
                                                <Text size="sm" weight="semibold">Wajib Buka Shift Sebelum Transaksi</Text>
                                                <Text size="2xs" color="secondary">
                                                    Jika aktif, kasir wajib membuka shift kas terlebih dahulu sebelum dapat memproses pembayaran.
                                                </Text>
                                            </VStack>
                                        </HStack>
                                        <Switch
                                            label="Wajib buka shift"
                                            isLabelHidden
                                            value={form.requireOpenShift}
                                            onChange={(checked) =>
                                                setForm((prev) => ({ ...prev, requireOpenShift: checked }))
                                            }
                                        />
                                    </HStack>
                                </div>

                                <Grid columns={2} gap={3}>
                                    <NumberInput
                                        label="Pajak / PPN (%)"
                                        value={form.taxRate}
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        onChange={(v) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                taxRate: Math.max(0, Math.min(100, Number(v) || 0)),
                                            }))
                                        }
                                    />
                                    <NumberInput
                                        label="Biaya Layanan (%)"
                                        value={form.serviceChargeRate}
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        onChange={(v) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                serviceChargeRate: Math.max(0, Math.min(100, Number(v) || 0)),
                                            }))
                                        }
                                    />
                                </Grid>
                                <Text size="2xs" color="secondary">
                                    Isi <strong>0</strong> jika harga produk sudah termasuk pajak/nett (baris PPN & Layanan tidak akan ditampilkan di keranjang maupun struk).
                                </Text>

                                <HStack justify="between" align="center" gap={2} style={{ paddingTop: 4 }}>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon={<Printer size={14} />}
                                        label="Test Cetak Struk"
                                        onClick={handleTestPrint}
                                    />
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        icon={<Save size={15} />}
                                        label="Simpan Pengaturan"
                                        isLoading={isSaving}
                                    />
                                </HStack>
                            </VStack>
                        </Card>
                    </Grid>
                </VStack>
            </form>
        </VStack>
    );
};

export default Settings;
