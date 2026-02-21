import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Fixing user role mappings in db...");
    const roles = {
        CASHIER: await prisma.role.findUnique({ where: { name: 'KASIR' } }),
        ADMIN: await prisma.role.findUnique({ where: { name: 'ADMIN' } }),
        OWNER: await prisma.role.findUnique({ where: { name: 'OWNER' } })
    };

    await prisma.user.updateMany({
        where: { username: 'admin' },
        data: { roleId: roles.ADMIN?.id || 1, legacyRole: 'ADMIN' }
    });

    await prisma.user.updateMany({
        where: { username: 'owner' },
        data: { roleId: roles.OWNER?.id || 1, legacyRole: 'OWNER' }
    });

    const users = await prisma.user.findMany({ include: { role: true } });
    console.log("Successfully fixed. Results:");
    console.log(users.map(u => ({ id: u.id, username: u.username, Role: u.role?.name })));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
