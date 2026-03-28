import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Database for RBAC...');

    // 1. Create Permissions
    const permissionNames = [
        'transaction.create', 'transaction.view_own', 'receipt.print', 'receipt.send',
        'customer.create_basic', 'customer.select', 'cash.open_shift', 'cash.close_shift',
        'product.view', 'stock.view',
        'product.crud', 'category.manage', 'price.update', 'stock.in_out', 'stock.opname',
        'refund.process', 'void.transaction', 'discount.manage', 'report.view', 'report.export',
        'cash.reconcile', 'customer.manage', 'user.create_cashier', 'user.reset_pin', 'activity_log.view',
        'role.manage', 'permission.manage', 'multi_outlet.access', 'system.setting',
        'integration.manage', 'audit_log.full', 'backup.restore', 'billing.manage'
    ];

    const permissions: Record<string, any> = {};
    for (const name of permissionNames) {
        permissions[name] = await prisma.permission.upsert({
            where: { name },
            update: {},
            create: { name }
        });
    }

    // 2. Define Roles and their Permissions
    const cashierPerms = [
        'transaction.create', 'transaction.view_own', 'receipt.print', 'receipt.send',
        'customer.create_basic', 'customer.select', 'cash.open_shift', 'cash.close_shift',
        'product.view', 'stock.view'
    ];

    const adminPerms = [
        ...cashierPerms,
        'product.crud', 'category.manage', 'price.update', 'stock.in_out', 'stock.opname',
        'refund.process', 'void.transaction', 'discount.manage', 'report.view', 'report.export',
        'cash.reconcile', 'customer.manage', 'user.create_cashier', 'user.reset_pin', 'activity_log.view'
    ];

    const ownerPerms = [
        ...adminPerms,
        'role.manage', 'permission.manage', 'multi_outlet.access', 'system.setting',
        'integration.manage', 'audit_log.full', 'backup.restore', 'billing.manage'
    ];

    // 3. Create or Update Roles
    const roles = {
        CASHIER: await prisma.role.upsert({ where: { name: 'KASIR' }, update: {}, create: { name: 'KASIR', description: 'Kasir Toko (Default)' } }),
        ADMIN: await prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN', description: 'Admin Toko' } }),
        OWNER: await prisma.role.upsert({ where: { name: 'OWNER' }, update: {}, create: { name: 'OWNER', description: 'Pemilik Toko (Full Access)' } }),
    };

    // 4. Link Permissions to Roles
    const linkPermissions = async (roleId: number, permNames: string[]) => {
        await prisma.rolePermission.deleteMany({ where: { roleId } });
        const data = permNames.map(name => ({
            roleId,
            permissionId: permissions[name].id
        }));
        await prisma.rolePermission.createMany({ data });
    };

    await linkPermissions(roles.CASHIER.id, cashierPerms);
    await linkPermissions(roles.ADMIN.id, adminPerms);
    await linkPermissions(roles.OWNER.id, ownerPerms);

    // 5. Migrate Existing Users
    const users = await prisma.user.findMany();
    for (const user of users) {
        let roleId = roles.CASHIER.id;
        if (user.legacyRole === 'ADMIN') roleId = roles.ADMIN.id;
        else if (user.legacyRole === 'OWNER') roleId = roles.OWNER.id;

        await prisma.user.update({
            where: { id: user.id },
            data: { roleId }
        });
    }

    console.log('Database Seeding & Migration Completed Successfully.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
