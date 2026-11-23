import { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, KeyRound, Mail, Users } from 'lucide-react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { TextInput } from '@astryxdesign/core/TextInput';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import api from '../lib/axios';
import HasPermission from '../components/HasPermission';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';

interface Employee {
    id: number;
    name: string;
    username: string;
    email: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
    _count?: { sales: number; cashSessions: number };
}

const ROLE_VARIANT: Record<string, 'warning' | 'info' | 'success' | 'neutral'> = {
    OWNER: 'warning',
    ADMIN: 'info',
    CASHIER: 'success',
};

const Employees = () => {
    const toast = useToast();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', username: '', password: '', email: '', role: 'CASHIER' });
    const [showResetPass, setShowResetPass] = useState<number | null>(null);
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => { fetchEmployees(); }, []);

    const fetchEmployees = async () => {
        try {
            const r = await api.get('/users');
            setEmployees(Array.isArray(r.data) ? r.data : []);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Gagal memuat daftar karyawan');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editId) {
                await api.put(`/users/${editId}`, { name: form.name, email: form.email, role: form.role });
                toast.success('Data karyawan diperbarui');
            } else {
                await api.post('/users', form);
                toast.success('Karyawan berhasil ditambahkan');
            }
            setShowModal(false);
            resetForm();
            fetchEmployees();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menyimpan karyawan');
        }
    };

    const handleEdit = (emp: Employee) => {
        setEditId(emp.id);
        setForm({ name: emp.name, username: emp.username, password: '', email: emp.email || '', role: emp.role });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Nonaktifkan karyawan ini?')) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success('Karyawan dinonaktifkan');
            fetchEmployees();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menonaktifkan karyawan');
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || !showResetPass) return;
        try {
            await api.post(`/users/${showResetPass}/reset-password`, { newPassword });
            setShowResetPass(null);
            setNewPassword('');
            toast.success('Password berhasil direset');
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal mereset password');
        }
    };

    const resetForm = () => {
        setForm({ name: '', username: '', password: '', email: '', role: 'CASHIER' });
        setEditId(null);
    };

    return (
        <VStack gap={4} width="100%">
            <PageHeader
                title="Manajemen Karyawan"
                subtitle="Kelola akun kasir, peran staf, dan hak akses operasional toko"
                badge={<Badge variant="neutral" label={`${employees.length} Karyawan`} />}
                actions={
                    <HasPermission permission="user.create_cashier">
                        <Button
                            variant="primary"
                            label="Tambah Karyawan"
                            icon={<UserPlus size={16} />}
                            onClick={() => { resetForm(); setShowModal(true); }}
                        />
                    </HasPermission>
                }
            />

            {employees.length > 0 ? (
                <Grid columns={{ minWidth: 280, max: 3 }} gap={3}>
                    {employees.map((emp) => (
                        <Card key={emp.id} padding={4} elevation="none">
                            <VStack gap={3}>
                                <HStack justify="between" align="start" gap={2}>
                                    <HStack gap={2} align="center">
                                        <Avatar name={emp.name} size="md" />
                                        <VStack gap={0.5}>
                                            <Heading level={5} weight="semibold">{emp.name}</Heading>
                                            <Text size="xsm" color="secondary">@{emp.username}</Text>
                                        </VStack>
                                    </HStack>
                                    <HStack gap={1}>
                                        <HasPermission permission="user.reset_pin">
                                            <IconButton variant="ghost" size="sm" label="Reset Password" icon={<KeyRound size={15} />} onClick={() => setShowResetPass(emp.id)} />
                                        </HasPermission>
                                        <HasPermission permission="role.manage">
                                            <IconButton variant="ghost" size="sm" label="Edit" icon={<Pencil size={15} />} onClick={() => handleEdit(emp)} />
                                            <IconButton variant="ghost" size="sm" label="Nonaktifkan" icon={<Trash2 size={15} />} onClick={() => handleDelete(emp.id)} />
                                        </HasPermission>
                                    </HStack>
                                </HStack>

                                <HStack gap={2} align="center" wrap="wrap">
                                    <Badge variant={ROLE_VARIANT[emp.role] || 'neutral'} label={emp.role} />
                                    <Badge variant={emp.isActive ? 'success' : 'error'} label={emp.isActive ? 'Aktif' : 'Nonaktif'} />
                                </HStack>

                                {emp.email && (
                                    <HStack gap={1.5} align="center">
                                        <Mail size={13} />
                                        <Text size="xsm" color="secondary">{emp.email}</Text>
                                    </HStack>
                                )}

                                <Divider />

                                <HStack justify="between" align="center">
                                    <Text size="xsm" color="secondary">{emp._count?.sales ?? 0} penjualan</Text>
                                    <Text size="xsm" color="secondary">{emp._count?.cashSessions ?? 0} sesi kas</Text>
                                </HStack>
                            </VStack>
                        </Card>
                    ))}
                </Grid>
            ) : (
                <EmptyState icon={<Users size={28} />} title="Belum ada data karyawan" />
            )}

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Karyawan' : 'Tambah Karyawan'}>
                <form onSubmit={handleSubmit}>
                    <VStack gap={4}>
                        <TextInput label="Nama Lengkap" value={form.name} onChange={(v) => setForm({ ...form, name: v })} isRequired />
                        {!editId && (
                            <>
                                <TextInput label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} isRequired />
                                <TextInput label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} isRequired />
                            </>
                        )}
                        <TextInput label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                        <VStack gap={1.5}>
                            <Text size="sm" weight="medium">Role</Text>
                            <SegmentedControl
                                label="Role karyawan"
                                value={form.role}
                                onChange={(v) => setForm({ ...form, role: v })}
                                layout="fill"
                            >
                                <SegmentedControlItem value="CASHIER" label="CASHIER" />
                                <SegmentedControlItem value="ADMIN" label="ADMIN" />
                                <SegmentedControlItem value="OWNER" label="OWNER" />
                            </SegmentedControl>
                        </VStack>
                        <HStack justify="end" gap={2}>
                            <Button variant="secondary" label="Batal" onClick={() => setShowModal(false)} />
                            <Button type="submit" variant="primary" label={editId ? 'Update' : 'Simpan'} />
                        </HStack>
                    </VStack>
                </form>
            </Modal>

            <Modal isOpen={showResetPass !== null} onClose={() => setShowResetPass(null)} title="Reset Password" width={400}>
                <VStack gap={4}>
                    <TextInput
                        label="Password Baru"
                        type="password"
                        placeholder="Masukkan password baru"
                        value={newPassword}
                        onChange={(v) => setNewPassword(v)}
                        hasAutoFocus
                    />
                    <HStack justify="end" gap={2}>
                        <Button variant="secondary" label="Batal" onClick={() => setShowResetPass(null)} />
                        <Button variant="primary" label="Reset Password" isDisabled={!newPassword} onClick={handleResetPassword} />
                    </HStack>
                </VStack>
            </Modal>
        </VStack>
    );
};

export default Employees;
