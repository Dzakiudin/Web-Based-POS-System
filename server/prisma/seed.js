const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
    // Seed Admin User
    const adminHash = await bcrypt.hash('admin123', 10);
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            name: 'Administrator',
            username: 'admin',
            password: adminHash,
            roleId: adminRole?.id,
        },
    });
    console.log('Admin seeded: admin / admin123');

    // Seed Additional User (email: 1@gmail.com)
    const userHash = await bcrypt.hash('123456', 10);
    const cashierRole = await prisma.role.findUnique({ where: { name: 'KASIR' } });
    await prisma.user.upsert({
        where: { username: 'user1' },
        update: {},
        create: {
            name: 'User 1',
            username: 'user1',
            email: '1@gmail.com',
            password: userHash,
            roleId: cashierRole?.id,
        },
    });
    console.log('User seeded: user1 / 123456 (email: 1@gmail.com)');

    // Seed Default Categories
    const categories = ['Makanan', 'Minuman', 'Snack', 'Lainnya'];
    for (const name of categories) {
        await prisma.category.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }
    console.log('Categories seeded:', categories.join(', '));

    await prisma.$disconnect();
    console.log('Seed completed!');
}

seed().catch((e) => {
    console.error(e);
    process.exit(1);
});
