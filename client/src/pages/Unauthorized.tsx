import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Button } from '@astryxdesign/core/Button';

const Unauthorized = () => {
    const navigate = useNavigate();

    return (
        <Center minHeight="60vh" width="100%" padding={4}>
            <EmptyState
                icon={<Lock size={32} />}
                title="Akses Ditolak"
                description="Anda tidak memiliki izin (permission) yang cukup untuk mengakses halaman ini. Silakan hubungi Owner atau Administrator Anda."
                actions={
                    <Button
                        variant="primary"
                        label="Kembali ke Beranda"
                        icon={<ArrowLeft size={16} />}
                        onClick={() => navigate('/')}
                    />
                }
            />
        </Center>
    );
};

export default Unauthorized;
