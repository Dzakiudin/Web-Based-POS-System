import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Store, LogIn, Globe, QrCode, Server } from 'lucide-react';
import { Center } from '@astryxdesign/core/Center';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import api, { getServerBaseUrl } from '../lib/axios';
import Modal from '../components/Modal';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import axios from 'axios';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    // Server Configuration Modal State
    const [isServerModalOpen, setIsServerModalOpen] = useState(false);
    const [serverUrlInput, setServerUrlInput] = useState('');
    const [isTestingServer, setIsTestingServer] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [currentServerUrl, setCurrentServerUrl] = useState('');

    useEffect(() => {
        const activeUrl = getServerBaseUrl();
        setCurrentServerUrl(activeUrl);
        setServerUrlInput(activeUrl);
    }, []);

    const handleTestConnection = async (targetUrl?: string) => {
        const urlToTest = (targetUrl || serverUrlInput || '').trim().replace(/\/+$/, '');
        if (!urlToTest) {
            setTestResult({ success: false, message: 'URL server tidak boleh kosong' });
            return;
        }

        setIsTestingServer(true);
        setTestResult(null);

        try {
            const res = await axios.get(`${urlToTest}/api/health`, { timeout: 5000 });
            if (res.status === 200) {
                setTestResult({
                    success: true,
                    message: `Terhubung! ${res.data?.app || 'Server Aktif'}`
                });
            } else {
                setTestResult({ success: false, message: `Status respon: ${res.status}` });
            }
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.message || 'Tidak dapat terhubung ke server. Pastikan server/tunnel aktif.'
            });
        } finally {
            setIsTestingServer(false);
        }
    };

    const handleSaveServerUrl = () => {
        const cleanUrl = serverUrlInput.trim().replace(/\/+$/, '');
        if (cleanUrl) {
            localStorage.setItem('pos_server_url', cleanUrl);
            setCurrentServerUrl(cleanUrl);
        } else {
            localStorage.removeItem('pos_server_url');
            setCurrentServerUrl(getServerBaseUrl());
        }
        setIsServerModalOpen(false);
        setTestResult(null);
    };

    const handleResetServerUrl = () => {
        localStorage.removeItem('pos_server_url');
        const defaultUrl = 'http://localhost:5000';
        setServerUrlInput(defaultUrl);
        setCurrentServerUrl(defaultUrl);
        setTestResult(null);
    };

    const handleScanServerQR = (scannedText: string) => {
        const text = scannedText.trim();
        if (text.startsWith('http://') || text.startsWith('https://')) {
            setServerUrlInput(text);
            setIsScannerOpen(false);
            handleTestConnection(text);
        } else {
            alert(`Format QR tidak valid (harus diawali http/https): ${text}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', { username, password });
            login(response.data.token, response.data.user);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Username atau password salah');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Center minHeight="100vh" width="100%" padding={4} style={{ backgroundColor: 'var(--color-wash, #f8f8f8)' }}>
            <Card width="100%" maxWidth={420} padding={6} elevation="none">
                <VStack gap={5}>
                    <VStack gap={2} align="center">
                        <HStack gap={2} align="center">
                            <Store size={24} />
                            <Heading level={3} weight="bold">POS System</Heading>
                        </HStack>
                        <Text size="sm" color="secondary" justify="center">
                            Masuk ke akun Anda untuk mengelola kasir & inventaris.
                        </Text>
                    </VStack>

                    <Divider />

                    {error && (
                        <Banner status="error" title={error} container="section" />
                    )}

                    <form onSubmit={handleSubmit}>
                        <VStack gap={4}>
                            <TextInput
                                label="Username atau Email"
                                placeholder="Masukkan username"
                                value={username}
                                onChange={(val) => setUsername(val)}
                                isRequired
                                autoComplete="username"
                            />
                            <TextInput
                                type="password"
                                label="Password"
                                placeholder="Masukkan password"
                                value={password}
                                onChange={(val) => setPassword(val)}
                                isRequired
                                autoComplete="current-password"
                            />
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                label="Masuk"
                                icon={<LogIn size={18} />}
                                isLoading={isLoading}
                                width="100%"
                            />
                        </VStack>
                    </form>

                    <Divider />

                    {/* Server Connection Status & Config Button */}
                    <VStack gap={2} align="center" width="100%">
                        <HStack gap={2} align="center" justify="center" wrap="wrap">
                            <Badge
                                variant={currentServerUrl.includes('localhost') ? 'neutral' : 'info'}
                                label={currentServerUrl}
                            />
                        </HStack>
                        <Button
                            variant="secondary"
                            size="sm"
                            label="Atur Server / Cloud"
                            icon={<Globe size={14} />}
                            onClick={() => {
                                setServerUrlInput(currentServerUrl);
                                setTestResult(null);
                                setIsServerModalOpen(true);
                            }}
                        />
                    </VStack>

                    <Text size="xsm" color="secondary" justify="center">
                        © {new Date().getFullYear()} POS System · Powered by Rust & Astryx
                    </Text>
                </VStack>
            </Card>

            {/* Modal Pengaturan Server / Cloud */}
            <Modal
                isOpen={isServerModalOpen}
                onClose={() => setIsServerModalOpen(false)}
                title="Pengaturan Server Kasir"
            >
                <VStack gap={4} padding={1}>
                    <Text size="sm" color="secondary">
                        Tentukan alamat server backend. Anda dapat menghubungkan aplikasi HP Android atau PC ke alamat Cloud (Cloudflare Tunnel) atau IP lokal PC toko Anda.
                    </Text>

                    <TextInput
                        label="URL Server / Cloud"
                        placeholder="https://xxxx.trycloudflare.com atau http://192.168.1.100:5000"
                        value={serverUrlInput}
                        onChange={(val) => setServerUrlInput(val)}
                    />

                    {/* Tombol Aksi Cepat */}
                    <HStack gap={2} wrap="wrap">
                        <Button
                            variant="secondary"
                            size="sm"
                            label="Scan QR Server"
                            icon={<QrCode size={14} />}
                            onClick={() => setIsScannerOpen(true)}
                        />
                        <Button
                            variant="secondary"
                            size="sm"
                            label="Tes Koneksi"
                            icon={<Server size={14} />}
                            isLoading={isTestingServer}
                            onClick={() => handleTestConnection()}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            label="Reset Default"
                            onClick={handleResetServerUrl}
                        />
                    </HStack>

                    {/* Hasil Tes Koneksi */}
                    {testResult && (
                        <Banner
                            status={testResult.success ? 'success' : 'error'}
                            title={testResult.success ? 'Koneksi Berhasil' : 'Gagal Terhubung'}
                            description={testResult.message}
                            container="section"
                        />
                    )}

                    <Divider />

                    <HStack gap={2} justify="end">
                        <Button
                            variant="secondary"
                            label="Batal"
                            onClick={() => setIsServerModalOpen(false)}
                        />
                        <Button
                            variant="primary"
                            label="Simpan & Terapkan"
                            onClick={handleSaveServerUrl}
                        />
                    </HStack>
                </VStack>
            </Modal>

            {/* Modal Scanner QR Server URL */}
            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleScanServerQR}
                title="Scan QR Server URL"
                subtitle="Arahkan kamera ke QR code yang tampil di layar PC atau terminal"
            />
        </Center>
    );
};

export default Login;
