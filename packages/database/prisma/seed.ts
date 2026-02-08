import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Rolleri oluştur
    const adminRole = await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: { name: 'Admin', canSeeRestricted: true },
    });

    const workerRole = await prisma.role.upsert({
        where: { name: 'Worker' },
        update: {},
        create: { name: 'Worker', canSeeRestricted: false },
    });

    console.log('Roles created');

    // 2. Para birimlerini oluştur
    await prisma.currency.upsert({
        where: { code: 'TRY' },
        update: {},
        create: { code: 'TRY', symbol: '₺', rateToTry: 1 },
    });

    await prisma.currency.upsert({
        where: { code: 'USD' },
        update: {},
        create: { code: 'USD', symbol: '$', rateToTry: 32.5 },
    });

    await prisma.currency.upsert({
        where: { code: 'EUR' },
        update: {},
        create: { code: 'EUR', symbol: '€', rateToTry: 35.2 },
    });

    console.log('Currencies created');

    // 3. Admin kullanıcısı oluştur (password hashed with bcrypt)
    const hashedPassword = await bcrypt.hash('123456', 10);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@toptanci.com' },
        update: { passwordHash: hashedPassword },
        create: {
            email: 'admin@toptanci.com',
            name: 'Süper Admin',
            passwordHash: hashedPassword,
            roleId: adminRole.id,
        },
    });

    console.log('Admin user created');

    // 4. Örnek Ürünler
    const danaKarkas = await prisma.product.create({
        data: {
            name: 'Dana Karkas',
            category: 'Dana',
            unit: 'KG',
            avgUnitWeight: 250,
            inventory: { create: { quantity: 0, pieceCount: 0 } },
        },
    });

    const danaBut = await prisma.product.create({
        data: {
            name: 'Dana But',
            category: 'Dana',
            subCategory: 'But',
            unit: 'KG',
            inventory: { create: { quantity: 100, pieceCount: 5 } },
        },
    });

    console.log('Products created');

    // 5. Örnek Müşteri
    await prisma.customer.create({
        data: {
            businessName: 'Lezzet Kasabı',
            contactName: 'Ahmet Kasap',
            phone: '5551112233',
            balanceTry: 0,
        },
    });

    // 6. Örnek Tedarikçi
    await prisma.vendor.create({
        data: {
            name: 'Anadolu Besi Çiftliği',
            phone: '5559998877',
            totalBalance: 0,
        },
    });

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
