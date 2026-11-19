import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Store, LogIn } from 'lucide-react';
import { Center } from '@astryxdesign/core/Center';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import api from '../lib/axios';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

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

                    <Text size="xsm" color="secondary" justify="center">
                        © {new Date().getFullYear()} POS System · Powered by Rust & Astryx
                    </Text>
                </VStack>
            </Card>
        </Center>
    );
};

export default Login;
