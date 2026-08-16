import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'haven_database.json');

console.log('--- HAVEN MATTRESSES MANUAL SEED SCRIPT ---');
console.log('Seeding starter mattress products and clean baseline data...');

const adminHash = bcrypt.hashSync('admin123', 10);
const driverHash = bcrypt.hashSync('driver123', 10);

const seedDatabase = {
  users: [
    {
      id: 'usr-admin-1',
      name: 'Cliff Nyambagera',
      email: 'admin@havenmattresses.co.ke',
      phone: '+254712345678',
      role: 'admin',
      passwordHash: adminHash,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-admin-2',
      name: 'Cliff Nyambagera (Personal)',
      email: 'nyambageracliff@gmail.com',
      phone: '+254712345678',
      role: 'admin',
      passwordHash: adminHash,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-staff-1',
      name: 'Sarah Wanjiru',
      email: 'staff@havenmattresses.co.ke',
      phone: '+254722334455',
      role: 'staff',
      passwordHash: adminHash,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-driver-1',
      name: 'David Ochieng',
      email: 'driver@havenmattresses.co.ke',
      phone: '+254733445566',
      role: 'driver',
      passwordHash: driverHash,
      createdAt: new Date().toISOString()
    }
  ],
  categories: [
    {
      id: 'cat-orthopedic',
      name: 'Orthopedic Mattresses',
      slug: 'orthopedic-mattresses',
      description: 'High-support medical & chiropractic mattresses engineered for back pain relief, posture alignment and spinal health.',
      image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
      displayOrder: 1
    },
    {
      id: 'cat-high-density',
      name: 'High-Density Foam',
      slug: 'high-density-foam',
      description: 'Durable, high-resilience high-density foam mattresses that do not sag, perfect for long-lasting everyday comfort.',
      image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80',
      displayOrder: 2
    },
    {
      id: 'cat-pocket-spring',
      name: 'Pocket Spring & Hybrid',
      slug: 'pocket-spring-hybrid',
      description: 'Zero motion-transfer pocket spring coils paired with plush comfort layers for hotel-grade luxury sleep.',
      image: 'https://images.unsplash.com/photo-1540518614846-7ede433c4550?auto=format&fit=crop&w=800&q=80',
      displayOrder: 3
    },
    {
      id: 'cat-memory-foam',
      name: 'Memory Foam',
      slug: 'memory-foam',
      description: 'Cooling gel and contouring visco-elastic memory foam that relieves pressure points and molds to your body shape.',
      image: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=80',
      displayOrder: 4
    },
    {
      id: 'cat-budget-foam',
      name: 'Budget & Everyday Foam',
      slug: 'budget-mattresses',
      description: 'Affordable, quality quilted and medium-density mattresses for guest rooms, rentals, and budget-conscious buyers.',
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
      displayOrder: 5
    },
    {
      id: 'cat-kids',
      name: 'Kids & Crib Mattresses',
      slug: 'kids-mattresses',
      description: 'Hypoallergenic, waterproof-ready and non-toxic mattresses crafted specifically for growing children.',
      image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
      displayOrder: 6
    },
    {
      id: 'cat-bedding',
      name: 'Protectors, Pillows & Bedding',
      slug: 'bedding-accessories',
      description: 'Waterproof bamboo mattress protectors, contour ergonomic memory pillows, and heavy-duty divan bases.',
      image: 'https://images.unsplash.com/photo-1582582621959-48d27397dc69?auto=format&fit=crop&w=800&q=80',
      displayOrder: 7
    }
  ],
  suppliers: [
    {
      id: 'sup-bobmil',
      name: 'Bobmil Foam Industries Ltd',
      company: 'Bobmil Group Kenya',
      phone: '+254 722 000 111',
      email: 'orders@bobmilgroup.com',
      location: 'Enterprise Road, Industrial Area, Nairobi',
      leadTimeDays: 1,
      notes: 'Premier high-density foam supplier. Immediate dispatch within 4 hours of purchase order.',
      active: true
    },
    {
      id: 'sup-dr-mattress',
      name: 'Dr. Mattress Factory Kenya',
      company: 'Dr. Mattress EA Ltd',
      phone: '+254 733 222 333',
      email: 'b2b@drmattress.co.ke',
      location: 'Mombasa Road, Athi River Industrial Park',
      leadTimeDays: 2,
      notes: 'Manufacturer of certified orthopedic and medical grade posture-spring mattresses.',
      active: true
    },
    {
      id: 'sup-silentnight',
      name: 'Silentnight Beds Kenya',
      company: 'Silentnight East Africa Ltd',
      phone: '+254 711 444 555',
      email: 'fulfillment@silentnight.co.ke',
      location: 'Baba Dogo Road, Ruaraka, Nairobi',
      leadTimeDays: 1,
      notes: 'Luxury pocket spring, 5-star hotel specifications, and premium natural latex hybrids.',
      active: true
    },
    {
      id: 'sup-superfoam',
      name: 'Superfoam Kenya Ltd',
      company: 'Superfoam Manufacturing',
      phone: '+254 700 888 999',
      email: 'wholesale@superfoam.co.ke',
      location: 'Ruiru Kamiti Road, Kiambu',
      leadTimeDays: 1,
      notes: 'Reliable supplier for medium density, quilted student & budget foam series.',
      active: true
    }
  ],
  products: [
    {
      id: 'prod-dr-ortho-5x6',
      name: 'Dr. Mattress Orthopedic Spine Align High Density Foam',
      slug: 'dr-mattress-orthopedic-spine-align-foam',
      brand: 'Dr. Mattress',
      categoryId: 'cat-orthopedic',
      supplierId: 'sup-dr-mattress',
      primarySupplierId: 'sup-dr-mattress',
      description: 'High-density orthopedic medical foam mattress designed for spinal alignment, backache relief, and lumbar support. Built with resilient Kenyan foam core.',
      features: [
        'Doctor Recommended Orthopedic High-Density Core',
        'Quilted Damask Jacquard Fabric Cover',
        'Zero Motion Transfer for Undisturbed Sleep',
        'Hypoallergenic & Dust-Mite Resistant'
      ],
      specifications: {
        'Mattress Type': 'Orthopedic High-Density Foam',
        'Feel / Firmness': 'Extra Firm (8.5/10)',
        'Core Material': 'High Resilient Rebonded Medical Foam',
        'Cover': 'Heavyweight Quilted Jacquard Fabric',
        'Country of Origin': 'Kenya'
      },
      warrantyYears: 10,
      trialNights: 30,
      rating: 0,
      reviewCount: 0,
      isFeatured: true,
      isBestSeller: true,
      firmnessRating: 8.5,
      firmnessLabel: 'Firm',
      mattressType: 'Orthopedic Foam',
      images: [
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1540518614846-7ede433c4ef9?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-1', size: '3x6', thickness: 6, supplierPrice: 9500, sellingPrice: 14500, compareAtPrice: 17000, sku: 'DM-ORTHO-3X6-6', stockStatus: 'in_stock' },
        { id: 'v-2', size: '4x6', thickness: 8, supplierPrice: 14500, sellingPrice: 21500, compareAtPrice: 25000, sku: 'DM-ORTHO-4X6-8', stockStatus: 'in_stock' },
        { id: 'v-3', size: '5x6', thickness: 8, supplierPrice: 17500, sellingPrice: 26500, compareAtPrice: 31000, sku: 'DM-ORTHO-5X6-8', stockStatus: 'in_stock' },
        { id: 'v-4', size: '5x6', thickness: 10, supplierPrice: 21000, sellingPrice: 31500, compareAtPrice: 36000, sku: 'DM-ORTHO-5X6-10', stockStatus: 'in_stock' },
        { id: 'v-5', size: '6x6', thickness: 8, supplierPrice: 20500, sellingPrice: 30500, compareAtPrice: 36000, sku: 'DM-ORTHO-6X6-8', stockStatus: 'in_stock' },
        { id: 'v-6', size: '6x6', thickness: 10, supplierPrice: 24500, sellingPrice: 36500, compareAtPrice: 42000, sku: 'DM-ORTHO-6X6-10', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-bobmil-hd-deluxe',
      name: 'Bobmil Deluxe High Density Heavy Duty Mattress',
      slug: 'bobmil-deluxe-high-density-heavy-duty',
      brand: 'Bobmil',
      categoryId: 'cat-high-density',
      supplierId: 'sup-bobmil',
      primarySupplierId: 'sup-bobmil',
      description: 'Kenyan household favorite heavy-duty high density mattress by Bobmil Industries. Long-lasting, sag-resistant, and covered in luxury breathable floral fabric.',
      features: [
        'Virgin Polyurethane High Density Foam',
        'Anti-Sagging Heavy Duty Durability',
        'Breathable Luxury Fabric Cover',
        'KEBS Certified Quality Standard'
      ],
      specifications: {
        'Mattress Type': 'High-Density Foam',
        'Feel / Firmness': 'Medium Firm (7/10)',
        'Core Material': 'High Density Polyurethane Core',
        'Cover': 'Embossed Floral Cotton Fabric',
        'Country of Origin': 'Kenya'
      },
      warrantyYears: 7,
      trialNights: 14,
      rating: 0,
      reviewCount: 0,
      isFeatured: true,
      isBestSeller: true,
      firmnessRating: 7.0,
      firmnessLabel: 'Medium-Firm',
      mattressType: 'High-Density Foam',
      images: [
        'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1540518614846-7ede433c4ef9?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-b1', size: '3x6', thickness: 6, supplierPrice: 6500, sellingPrice: 9800, compareAtPrice: 12000, sku: 'BM-HD-3X6-6', stockStatus: 'in_stock' },
        { id: 'v-b2', size: '4x6', thickness: 8, supplierPrice: 11000, sellingPrice: 16500, compareAtPrice: 19500, sku: 'BM-HD-4X6-8', stockStatus: 'in_stock' },
        { id: 'v-b3', size: '5x6', thickness: 8, supplierPrice: 13500, sellingPrice: 20500, compareAtPrice: 24500, sku: 'BM-HD-5X6-8', stockStatus: 'in_stock' },
        { id: 'v-b4', size: '6x6', thickness: 8, supplierPrice: 16000, sellingPrice: 24500, compareAtPrice: 29000, sku: 'BM-HD-6X6-8', stockStatus: 'in_stock' },
        { id: 'v-b5', size: '6x6', thickness: 10, supplierPrice: 19500, sellingPrice: 29500, compareAtPrice: 35000, sku: 'BM-HD-6X6-10', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-silentnight-hybrid',
      name: 'Silentnight Royal Pocket Spring & Memory Hybrid',
      slug: 'silentnight-royal-pocket-spring-memory-hybrid',
      brand: 'Silentnight',
      categoryId: 'cat-pocket-spring',
      supplierId: 'sup-silentnight',
      primarySupplierId: 'sup-silentnight',
      description: 'Luxury hotel-grade pocket spring mattress with cooling gel-infused memory foam topper. Individual wrapped coils provide independent contouring support.',
      features: [
        'Individually Encased Barrel Pocket Springs',
        'Cooling Gel Memory Foam Pressure Relief Layer',
        'Reinforced Edge Support Perimeter',
        'Euro-Top Plush Quilting'
      ],
      specifications: {
        'Mattress Type': 'Pocket Spring & Memory Foam Hybrid',
        'Feel / Firmness': 'Medium Plush (6/10)',
        'Spring Count': '850+ Independent Pocket Coils',
        'Comfort Layer': '2-inch Cooling Gel Memory Foam',
        'Country of Origin': 'Kenya'
      },
      warrantyYears: 10,
      trialNights: 45,
      rating: 0,
      reviewCount: 0,
      isFeatured: true,
      isBestSeller: true,
      firmnessRating: 6.0,
      firmnessLabel: 'Medium-Plush',
      mattressType: 'Pocket Spring Hybrid',
      images: [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-s1', size: '4x6', thickness: 10, supplierPrice: 24000, sellingPrice: 35000, compareAtPrice: 42000, sku: 'SN-HYB-4X6-10', stockStatus: 'in_stock' },
        { id: 'v-s2', size: '5x6', thickness: 10, supplierPrice: 29000, sellingPrice: 42500, compareAtPrice: 50000, sku: 'SN-HYB-5X6-10', stockStatus: 'in_stock' },
        { id: 'v-s3', size: '5x6', thickness: 12, supplierPrice: 34000, sellingPrice: 49500, compareAtPrice: 58000, sku: 'SN-HYB-5X6-12', stockStatus: 'in_stock' },
        { id: 'v-s4', size: '6x6', thickness: 10, supplierPrice: 34000, sellingPrice: 48500, compareAtPrice: 58000, sku: 'SN-HYB-6X6-10', stockStatus: 'in_stock' },
        { id: 'v-s5', size: '6x6', thickness: 12, supplierPrice: 39500, sellingPrice: 56500, compareAtPrice: 68000, sku: 'SN-HYB-6X6-12', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  deliveryZones: [
    {
      id: 'zone-nairobi',
      county: 'Nairobi',
      towns: ['Westlands', 'Kilimani', 'Kileleshwa', 'Lavington', 'Karen', 'Roysambu', 'Kasarani', 'CBD', 'South B / C', 'Langata', 'Embakasi', 'Donholm', 'Parklands'],
      baseFee: 1000,
      estimatedDays: 'Same Day / Next Day (24 hrs)',
      freeDeliveryThreshold: 35000,
      active: true
    },
    {
      id: 'zone-kiambu',
      county: 'Kiambu',
      towns: ['Ruiru', 'Thika', 'Kiambu Town', 'Ruaka', 'Kikuyu', 'Limuru', 'Juja', 'Kahawa Sukari', 'Banana'],
      baseFee: 1500,
      estimatedDays: '1 - 2 Business Days',
      freeDeliveryThreshold: 45000,
      active: true
    },
    {
      id: 'zone-machakos',
      county: 'Machakos',
      towns: ['Athi River', 'Syokimau', 'Mlolongo', 'Machakos Town', 'Tala', 'Kangundo'],
      baseFee: 1800,
      estimatedDays: '1 - 2 Business Days',
      freeDeliveryThreshold: 50000,
      active: true
    },
    {
      id: 'zone-kajiado',
      county: 'Kajiado',
      towns: ['Kitengela', 'Ongata Rongai', 'Ngong', 'Kiserian', 'Kajiado Town'],
      baseFee: 1800,
      estimatedDays: '1 - 2 Business Days',
      freeDeliveryThreshold: 50000,
      active: true
    },
    {
      id: 'zone-nakuru',
      county: 'Nakuru',
      towns: ['Nakuru City', 'Naivasha', 'Gilgil', 'Molo', 'Njoro'],
      baseFee: 2500,
      estimatedDays: '2 - 3 Business Days',
      freeDeliveryThreshold: 65000,
      active: true
    },
    {
      id: 'zone-mombasa',
      county: 'Mombasa & Coast',
      towns: ['Mombasa CBD', 'Nyali', 'Bamburi', 'Mtwapa', 'Diani', 'Kilifi'],
      baseFee: 3500,
      estimatedDays: '2 - 4 Business Days',
      freeDeliveryThreshold: 80000,
      active: true
    },
    {
      id: 'zone-kisumu',
      county: 'Kisumu & Western',
      towns: ['Kisumu City', 'Kakamega', 'Eldoret', 'Kitale', 'Bungoma', 'Kisii'],
      baseFee: 3500,
      estimatedDays: '2 - 4 Business Days',
      freeDeliveryThreshold: 80000,
      active: true
    }
  ],
  orders: [],
  payments: [],
  reviews: [],
  wishlists: [],
  coupons: [
    {
      id: 'cpn-welcome',
      code: 'WELCOME10',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 15000,
      maxDiscount: 5000,
      startDate: '2026-01-01',
      expiryDate: '2026-12-31',
      usageLimit: 500,
      usedCount: 0,
      active: true,
      description: '10% off your first luxury mattress order (Min spend KSh 15,000)'
    },
    {
      id: 'cpn-ship',
      code: 'FREESHIP',
      discountType: 'fixed',
      discountValue: 1000,
      minOrderAmount: 20000,
      startDate: '2026-01-01',
      expiryDate: '2026-12-31',
      usageLimit: 200,
      usedCount: 0,
      active: true,
      description: 'KSh 1,000 shipping discount for Kenyan orders'
    }
  ],
  drivers: [
    {
      id: 'drv-1',
      userId: 'usr-driver-1',
      name: 'David Ochieng',
      phone: '+254733445566',
      vehicleType: 'Pickup Truck',
      vehiclePlate: 'KDG 482M',
      activeDeliveriesCount: 0,
      active: true
    }
  ],
  notifications: [],
  activityLogs: [],
  settings: {
    businessName: 'Haven Mattresses Kenya',
    tagline: 'Premium Sleep Craft, Direct From Master Manufacturers',
    logoUrl: '',
    phone: '+254 700 123 456',
    phoneAlternative: '+254 733 987 654',
    email: 'hello@havenmattresses.co.ke',
    whatsapp: '+254700123456',
    physicalAddress: 'Haven Hub, Ground Floor, Plaza 2000, Mombasa Road, Nairobi, Kenya',
    currency: 'KES',
    currencySymbol: 'KSh',
    pickupEnabled: true,
    pickupAddress: 'Haven Hub, Mombasa Road (Near Panari Hotel), Nairobi',
    taxPercentage: 0,
    freeDeliveryDefaultThreshold: 35000,
    allowGuestCheckout: true,
    mpesa: {
      environment: 'sandbox',
      shortcode: '174379',
      tillNumber: '889900',
      paybillNumber: '522522',
      passkeyConfigured: true,
      consumerKeyConfigured: true
    },
    notifications: {
      smsEnabled: true,
      whatsappEnabled: true,
      emailEnabled: true,
      senderId: 'HAVENMATT'
    }
  }
};

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

fs.writeFileSync(DB_FILE, JSON.stringify(seedDatabase, null, 2), 'utf-8');
console.log('Database successfully seeded to data/haven_database.json');
