const mongoose = require('mongoose');
const env = require('../config/env');
const connectDB = require('../config/db');
const User = require('../models/User');
const Medicine = require('../models/Medicine');

/**
 * Idempotent seeder script to initialize the first admin account.
 * Reads configuration from ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD environment variables.
 * Never outputs sensitive password values to logs.
 */
const seedAdmin = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await connectDB();

    const normalizedEmail = env.ADMIN_EMAIL.toLowerCase().trim();

    // Check if admin account already exists
    const existingAdmin = await User.findOne({ email: normalizedEmail });

    let admin = existingAdmin;
    if (existingAdmin) {
      console.log(`ℹ️  Admin user [${normalizedEmail}] already exists. Seeding skipped.`);
    } else {
      if (!env.ADMIN_PASSWORD) {
        console.error('❌ Seeding failed: ADMIN_PASSWORD environment variable is required to create a new admin user.');
        await mongoose.connection.close();
        process.exit(1);
      }
      admin = await User.create({
        name: env.ADMIN_NAME.trim(),
        email: normalizedEmail,
        password: env.ADMIN_PASSWORD,
        role: 'admin',
        isActive: true,
      });

      console.log('✅ Admin user seeded successfully:');
      console.log(`   - Name: ${admin.name}`);
      console.log(`   - Email: ${admin.email}`);
      console.log(`   - Role: ${admin.role}`);
      console.log(`   - ID: ${admin.id}`);
    }

    // 2. Check and seed initial medicines
    const medicineCount = await Medicine.countDocuments();
    if (medicineCount === 0) {
      const defaultMedicines = [
        {
          name: 'Paracetamol',
          price: 50,
          stock: 100,
          category: 'Tablet',
          expiry: new Date('2026-07-01'),
          createdBy: admin._id,
          updatedBy: admin._id,
        },
        {
          name: 'Ibuprofen',
          price: 60,
          stock: 0,
          category: 'Tablet',
          expiry: new Date('2026-09-01'),
          createdBy: admin._id,
          updatedBy: admin._id,
        },
        {
          name: 'Combiflam',
          price: 80,
          stock: 10,
          category: 'Tablet',
          expiry: new Date('2027-05-01'),
          createdBy: admin._id,
          updatedBy: admin._id,
        },
        {
          name: 'Crocin',
          price: 70,
          stock: 90,
          category: 'Syrup',
          expiry: new Date('2027-04-01'),
          createdBy: admin._id,
          updatedBy: admin._id,
        },
        {
          name: 'Benadryl',
          price: 80,
          stock: 6,
          category: 'Syrup',
          expiry: new Date('2027-05-01'),
          createdBy: admin._id,
          updatedBy: admin._id,
        },
        {
          name: 'Tetanus',
          price: 90,
          stock: 0,
          category: 'Injection',
          expiry: new Date('2027-06-01'),
          createdBy: admin._id,
          updatedBy: admin._id,
        },
      ];

      await Medicine.insertMany(defaultMedicines);
      console.log(`✅ Seeded ${defaultMedicines.length} default medicines.`);
    } else {
      console.log(`ℹ️  Medicines collection already has ${medicineCount} records. Seeding skipped.`);
    }

    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Seeding failed: ${error.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedAdmin();
