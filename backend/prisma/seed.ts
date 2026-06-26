import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('1234', 10);

  console.log('Clearing existing data...');
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.systemSetting.deleteMany({});

  console.log('Seeding users...');
  // Users
  await prisma.user.upsert({
    where: { phone: '1111' },
    update: {},
    create: {
      phone: '1111',
      password: hashedPassword,
      name: 'Admin Sahab',
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { phone: '2222' },
    update: {},
    create: {
      phone: '2222',
      password: hashedPassword,
      name: 'Mummy',
      role: 'MOTHER',
    },
  });

  await prisma.user.upsert({
    where: { phone: '3333' },
    update: {},
    create: {
      phone: '3333',
      password: hashedPassword,
      name: 'Raju Delivery',
      role: 'DELIVERY',
    },
  });

  await prisma.user.upsert({
    where: { phone: '4444' },
    update: {},
    create: {
      phone: '4444',
      password: hashedPassword,
      name: 'Customer',
      role: 'CUSTOMER',
    },
  });

  console.log('Seeding products...');
  // Products
  await prisma.product.createMany({
    data: [
      {
        name: 'Kurkure Masala Munch',
        wholesaleUnitQty: 15, // 1 pack = 15 units
        unit: 'pcs',
        price: 10,
        retailStock: 30,
        category: 'Snacks & Munchies',
        photoUrl: 'https://m.media-amazon.com/images/I/71YyP02n-7L._SL1500_.jpg',
      },
      {
        name: 'Lays Magic Masala',
        wholesaleUnitQty: 20, // 1 box = 20 units
        unit: 'pcs',
        price: 20,
        retailStock: 40,
        category: 'Snacks & Munchies',
        photoUrl: 'https://m.media-amazon.com/images/I/71K23X15CML._SL1500_.jpg',
      },
      {
        name: 'Sugar (Chini)',
        wholesaleUnitQty: 5, // 1 pack = 5 kg
        unit: 'kg',
        price: 45,
        retailStock: 50,
        category: 'Staples & Spices',
        photoUrl: 'https://5.imimg.com/data5/ANDROID/Default/2021/6/YI/SD/RX/131584252/product-jpeg-500x500.jpg',
      },
      {
        name: 'Amul Taaza Milk',
        wholesaleUnitQty: 12, // 1 crate = 12 ltr
        unit: 'ltr',
        price: 30,
        retailStock: 60,
        category: 'Dairy & Bread',
        photoUrl: 'https://www.dairycraft.com/cdn/shop/files/amul-taaza-toned-milk-500-ml-32007802110115_512x512.jpg',
      },
      {
        name: 'Britannia Bread',
        wholesaleUnitQty: 10, // 1 tray = 10 packs
        unit: 'pcs',
        price: 40,
        retailStock: 30,
        category: 'Dairy & Bread',
        photoUrl: 'https://m.media-amazon.com/images/I/71H2N2z49nL._SL1500_.jpg',
      },
      {
        name: 'Fresh Red Apples',
        wholesaleUnitQty: 5, // 1 carton = 5 kg
        unit: 'kg',
        price: 120,
        retailStock: 25,
        category: 'Fruits & Veggies',
        photoUrl: 'https://5.imimg.com/data5/ED/TK/MY-15949667/fresh-red-apple-500x500.jpg',
      },
    ],
  });

  console.log('Seeding system settings...');
  await prisma.systemSetting.upsert({
    where: { key: 'STORE_LAT' },
    update: {},
    create: { key: 'STORE_LAT', value: '28.6139' }
  });
  await prisma.systemSetting.upsert({
    where: { key: 'STORE_LNG' },
    update: {},
    create: { key: 'STORE_LNG', value: '77.2090' }
  });
  await prisma.systemSetting.upsert({
    where: { key: 'STORE_ADDRESS' },
    update: {},
    create: { key: 'STORE_ADDRESS', value: 'Connaught Place, New Delhi' }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
