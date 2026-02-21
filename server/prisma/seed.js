const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
    // Seed Admin User
    const adminHash = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            name: 'Administrator',
            username: 'admin',
            password: adminHash,
            role: 'ADMIN',
        },
    });
    console.log('Admin seeded: admin / admin123');

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
