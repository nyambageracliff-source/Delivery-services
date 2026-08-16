import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { 
  User, Product, ProductVariant, Category, Supplier, Order, 
  PaymentTransaction, DeliveryZone, Review, Coupon, Driver, 
  AdminSettings, NotificationLog, AdminActivityLog, AnalyticsSummary 
} from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'haven_database.json');

export interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  orders: Order[];
  payments: PaymentTransaction[];
  deliveryZones: DeliveryZone[];
  reviews: Review[];
  wishlists: { id: string; customerId: string; productId: string; addedAt: string }[];
  coupons: Coupon[];
  drivers: Driver[];
  notifications: NotificationLog[];
  activityLogs: AdminActivityLog[];
  settings: AdminSettings;
}

export function getDefaultCategories(): Category[] {
  return [
    // 1. HOME & BEDDING
    {
      id: 'cat-orthopedic',
      name: 'Orthopedic Mattresses',
      slug: 'orthopedic-mattresses',
      department: 'home-bedding',
      description: 'High-support medical & chiropractic mattresses engineered for back pain relief, posture alignment and spinal health.',
      image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
      displayOrder: 1,
      active: true
    },
    {
      id: 'cat-high-density',
      name: 'High-Density Foam',
      slug: 'high-density-foam',
      department: 'home-bedding',
      description: 'Durable, high-resilience high-density foam mattresses that do not sag, perfect for long-lasting everyday comfort.',
      image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80',
      displayOrder: 2,
      active: true
    },
    {
      id: 'cat-pocket-spring',
      name: 'Pocket Spring & Hybrid',
      slug: 'pocket-spring-hybrid',
      department: 'home-bedding',
      description: 'Zero motion-transfer pocket spring coils paired with plush comfort layers for hotel-grade luxury sleep.',
      image: 'https://images.unsplash.com/photo-1540518614846-7ede433c4550?auto=format&fit=crop&w=800&q=80',
      displayOrder: 3,
      active: true
    },
    {
      id: 'cat-accessories',
      name: 'Bedding, Pillows & Duvets',
      slug: 'bedding-accessories',
      department: 'home-bedding',
      description: 'Waterproof bamboo mattress protectors, contour ergonomic memory pillows, 5-star hotel duvets, and Egyptian cotton sheets.',
      image: 'https://images.unsplash.com/photo-1582582621959-48d27397dc69?auto=format&fit=crop&w=800&q=80',
      displayOrder: 4,
      active: true
    },

    // 2. CLOTHING
    {
      id: 'cat-clothing-men',
      name: "Men's Apparel & Tops",
      slug: 'mens-clothing',
      department: 'clothing',
      description: 'Premium heavyweight cotton t-shirts, formal button-down shirts, hoodies, jackets, and sportswear.',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
      displayOrder: 5,
      active: true
    },
    {
      id: 'cat-clothing-women',
      name: "Women's Fashion & Dresses",
      slug: 'womens-clothing',
      department: 'clothing',
      description: 'Elegant maxi dresses, casual blouses, stylish jumpsuits, tailored trousers, and premium knitwear.',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
      displayOrder: 6,
      active: true
    },
    {
      id: 'cat-clothing-denim',
      name: 'Jeans & Trousers',
      slug: 'jeans-trousers',
      department: 'clothing',
      description: 'Classic stretch denim jeans, slim-fit chinos, tailored office trousers, and cargo pants.',
      image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',
      displayOrder: 7,
      active: true
    },

    // 3. SHOES
    {
      id: 'cat-shoes-sneakers',
      name: 'Sneakers & Sports Shoes',
      slug: 'sneakers-sports-shoes',
      department: 'shoes',
      description: 'Cushioned running trainers, casual lifestyle sneakers, and high-performance gym footwear.',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
      displayOrder: 8,
      active: true
    },
    {
      id: 'cat-shoes-formal',
      name: 'Formal & Casual Leather Shoes',
      slug: 'formal-shoes',
      department: 'shoes',
      description: 'Genuine leather oxford brogues, slip-on loafers, Chelsea boots, and stylish sandals.',
      image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80',
      displayOrder: 9,
      active: true
    },

    // 4. FASHION ACCESSORIES
    {
      id: 'cat-acc-watches',
      name: 'Watches & Smart Wearables',
      slug: 'watches-accessories',
      department: 'accessories',
      description: 'Stainless steel analog timepieces, minimalist luxury watches, and fitness tracking smartwatches.',
      image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
      displayOrder: 10,
      active: true
    },
    {
      id: 'cat-acc-bags',
      name: 'Bags, Wallets & Backpacks',
      slug: 'bags-wallets',
      department: 'accessories',
      description: 'Leather messenger bags, travel duffel bags, water-resistant laptop backpacks, and RFID wallets.',
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
      displayOrder: 11,
      active: true
    },

    // 5. ELECTRONICS
    {
      id: 'cat-elec-phones',
      name: 'Smartphones & Tablets',
      slug: 'smartphones-tablets',
      department: 'electronics',
      description: 'Unlocked flagship and budget Android smartphones, high-resolution tablets, and display accessories.',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
      displayOrder: 12,
      active: true
    },
    {
      id: 'cat-elec-audio',
      name: 'Audio, Earphones & Speakers',
      slug: 'audio-earphones-speakers',
      department: 'electronics',
      description: 'Active noise cancelling wireless earbuds, heavy bass Bluetooth speakers, and studio monitoring headphones.',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      displayOrder: 13,
      active: true
    },
    {
      id: 'cat-elec-power',
      name: 'Power Banks & Fast Chargers',
      slug: 'power-banks-chargers',
      department: 'electronics',
      description: 'High-capacity 20,000mAh PD power banks, 65W GaN fast chargers, and durable braided charging cables.',
      image: 'https://images.unsplash.com/photo-1609592807904-766289b4f61f?auto=format&fit=crop&w=800&q=80',
      displayOrder: 14,
      active: true
    },

    // 6. BEAUTY & PERSONAL CARE
    {
      id: 'cat-beauty-skincare',
      name: 'Skincare & Body Essentials',
      slug: 'skincare-body',
      department: 'beauty',
      description: 'Dermatologist-tested face moisturizers, Vitamin C serums, SPF 50 sunscreens, and organic body butters.',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
      displayOrder: 15,
      active: true
    },

    // 7. HOME & KITCHEN
    {
      id: 'cat-kitchen-cookware',
      name: 'Cookware & Kitchen Appliances',
      slug: 'cookware-kitchen-appliances',
      department: 'home-kitchen',
      description: 'Multi-layer granite non-stick cookware sets, digital air fryers, high-speed blenders, and food processors.',
      image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
      displayOrder: 16,
      active: true
    },
    {
      id: 'cat-bed-frames',
      name: 'Solid Wood & Platform Beds',
      slug: 'bed-frames',
      department: 'home-kitchen',
      description: 'Artisan handcrafted solid mahogany & teak platform beds, modern slat frames with maximum load capacity.',
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
      displayOrder: 17,
      active: true
    },

    // 8. PLUMBING & HARDWARE
    {
      id: 'cat-hard-fittings',
      name: 'Plumbing Fittings & Valves',
      slug: 'plumbing-fittings',
      department: 'hardware',
      description: 'Heavy duty PPR hot/cold pipes, brass gate valves, quick connectors, PVC drainage, and pressure regulators.',
      image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80',
      displayOrder: 18,
      active: true
    },
    {
      id: 'cat-hard-tools',
      name: 'Hardware, Tools & Taps',
      slug: 'hardware-tools-taps',
      department: 'hardware',
      description: 'Cordless brushless power drills, stainless steel kitchen & bath mixer taps, tool kits, and fasteners.',
      image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
      displayOrder: 19,
      active: true
    }
  ];
}

export function getDefaultProducts(): Product[] {
  return [
    // ==========================================
    // 1. MATTRESSES
    // ==========================================
    {
      id: 'prod-ortho-rest-5x6-8',
      name: 'Dr. Mattress Orthopedic Spine Align High Density Foam',
      slug: 'dr-mattress-orthopedic-spine-align-foam',
      brand: 'Dr. Mattress',
      department: 'mattresses',
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
      rating: 4.9,
      reviewCount: 28,
      isFeatured: true,
      isBestSeller: true,
      firmnessRating: 8.5,
      firmnessLabel: 'Firm',
      firmness: 'Extra Firm Orthopedic',
      firmnessScore: 9,
      mattressType: 'Orthopedic Foam',
      images: [
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1540518614846-7ede433c4ef9?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-1', sizeLabel: '3x6 (Single)', size: '3x6', thicknessInches: 6, thickness: 6, supplierPrice: 9500, price: 14500, sellingPrice: 14500, compareAtPrice: 17000, oldPrice: 17000, sku: 'DM-ORTHO-3X6-6', stockStatus: 'in_stock' },
        { id: 'v-2', sizeLabel: '4x6 (Double)', size: '4x6', thicknessInches: 8, thickness: 8, supplierPrice: 14500, price: 21500, sellingPrice: 21500, compareAtPrice: 25000, oldPrice: 25000, sku: 'DM-ORTHO-4X6-8', stockStatus: 'in_stock' },
        { id: 'v-3', sizeLabel: '5x6 (Queen)', size: '5x6', thicknessInches: 8, thickness: 8, supplierPrice: 17500, price: 26500, sellingPrice: 26500, compareAtPrice: 31000, oldPrice: 31000, sku: 'DM-ORTHO-5X6-8', stockStatus: 'in_stock' },
        { id: 'v-4', sizeLabel: '5x6 (Queen Extra Deep)', size: '5x6', thicknessInches: 10, thickness: 10, supplierPrice: 21000, price: 31500, sellingPrice: 31500, compareAtPrice: 36000, oldPrice: 36000, sku: 'DM-ORTHO-5X6-10', stockStatus: 'in_stock' },
        { id: 'v-5', sizeLabel: '6x6 (King)', size: '6x6', thicknessInches: 8, thickness: 8, supplierPrice: 20500, price: 30500, sellingPrice: 30500, compareAtPrice: 36000, oldPrice: 36000, sku: 'DM-ORTHO-6X6-8', stockStatus: 'in_stock' },
        { id: 'v-6', sizeLabel: '6x6 (King Extra Deep)', size: '6x6', thicknessInches: 10, thickness: 10, supplierPrice: 24500, price: 36500, sellingPrice: 36500, compareAtPrice: 42000, oldPrice: 42000, sku: 'DM-ORTHO-6X6-10', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-bobmil-hd-5x6-8',
      name: 'Bobmil Deluxe High Density Heavy Duty Mattress',
      slug: 'bobmil-deluxe-high-density-heavy-duty',
      brand: 'Bobmil',
      department: 'mattresses',
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
      rating: 4.8,
      reviewCount: 35,
      isFeatured: true,
      isBestSeller: true,
      firmnessRating: 7.0,
      firmnessLabel: 'Medium-Firm',
      firmness: 'Medium Firm',
      firmnessScore: 7,
      mattressType: 'High-Density Foam',
      images: [
        'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1540518614846-7ede433c4ef9?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-b1', sizeLabel: '3x6 (Single)', size: '3x6', thicknessInches: 6, thickness: 6, supplierPrice: 6500, price: 9800, sellingPrice: 9800, compareAtPrice: 12000, oldPrice: 12000, sku: 'BM-HD-3X6-6', stockStatus: 'in_stock' },
        { id: 'v-b2', sizeLabel: '4x6 (Double)', size: '4x6', thicknessInches: 8, thickness: 8, supplierPrice: 11000, price: 16500, sellingPrice: 16500, compareAtPrice: 19500, oldPrice: 19500, sku: 'BM-HD-4X6-8', stockStatus: 'in_stock' },
        { id: 'v-b3', sizeLabel: '5x6 (Queen)', size: '5x6', thicknessInches: 8, thickness: 8, supplierPrice: 13500, price: 20500, sellingPrice: 20500, compareAtPrice: 24500, oldPrice: 24500, sku: 'BM-HD-5X6-8', stockStatus: 'in_stock' },
        { id: 'v-b4', sizeLabel: '6x6 (King)', size: '6x6', thicknessInches: 8, thickness: 8, supplierPrice: 16000, price: 24500, sellingPrice: 24500, compareAtPrice: 29000, oldPrice: 29000, sku: 'BM-HD-6X6-8', stockStatus: 'in_stock' },
        { id: 'v-b5', sizeLabel: '6x6 (King 10-Inch Deep)', size: '6x6', thicknessInches: 10, thickness: 10, supplierPrice: 19500, price: 29500, sellingPrice: 29500, compareAtPrice: 35000, oldPrice: 35000, sku: 'BM-HD-6X6-10', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-silentnight-pocket-hybrid',
      name: 'Silentnight Royal Pocket Spring & Memory Hybrid',
      slug: 'silentnight-royal-pocket-spring-memory-hybrid',
      brand: 'Silentnight',
      department: 'mattresses',
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
      rating: 5.0,
      reviewCount: 42,
      isFeatured: true,
      isBestSeller: true,
      firmnessRating: 6.0,
      firmnessLabel: 'Medium-Plush',
      firmness: 'Medium',
      firmnessScore: 6,
      mattressType: 'Pocket Spring Hybrid',
      images: [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-s1', sizeLabel: '4x6 (Double 10-Inch)', size: '4x6', thicknessInches: 10, thickness: 10, supplierPrice: 24000, price: 35000, sellingPrice: 35000, compareAtPrice: 42000, oldPrice: 42000, sku: 'SN-HYB-4X6-10', stockStatus: 'in_stock' },
        { id: 'v-s2', sizeLabel: '5x6 (Queen 10-Inch)', size: '5x6', thicknessInches: 10, thickness: 10, supplierPrice: 29000, price: 42500, sellingPrice: 42500, compareAtPrice: 50000, oldPrice: 50000, sku: 'SN-HYB-5X6-10', stockStatus: 'in_stock' },
        { id: 'v-s3', sizeLabel: '5x6 (Queen 12-Inch Ultra Luxury)', size: '5x6', thicknessInches: 12, thickness: 12, supplierPrice: 34000, price: 49500, sellingPrice: 49500, compareAtPrice: 58000, oldPrice: 58000, sku: 'SN-HYB-5X6-12', stockStatus: 'in_stock' },
        { id: 'v-s4', sizeLabel: '6x6 (King 10-Inch)', size: '6x6', thicknessInches: 10, thickness: 10, supplierPrice: 34000, price: 48500, sellingPrice: 48500, compareAtPrice: 58000, oldPrice: 58000, sku: 'SN-HYB-6X6-10', stockStatus: 'in_stock' },
        { id: 'v-s5', sizeLabel: '6x6 (King 12-Inch Master Suite)', size: '6x6', thicknessInches: 12, thickness: 12, supplierPrice: 39500, price: 56500, sellingPrice: 56500, compareAtPrice: 68000, oldPrice: 68000, sku: 'SN-HYB-6X6-12', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-haveens-coolgel-memory',
      name: 'Haveens CloudRest Cooling Gel Memory Foam Mattress',
      slug: 'haveens-cloudrest-cooling-gel-memory-mattress',
      brand: 'Haveens Company',
      department: 'mattresses',
      categoryId: 'cat-memory-foam',
      supplierId: 'sup-haveens-workshop',
      primarySupplierId: 'sup-haveens-workshop',
      description: 'Engineered by Haveens Company for zero pressure points. Open-cell cooling gel transitions heat away while body contouring memory foam cradle hips and shoulders.',
      features: [
        '3-Layer Temperature Regulating Gel Foam',
        'Zero Pressure Point Lumbar Reliever',
        'Washable Bamboo Zippered Jacquard Cover',
        '10-Year Sag-Proof Craft Warranty'
      ],
      specifications: {
        'Mattress Type': 'Triple Layer Gel Memory Foam',
        'Feel / Firmness': 'Medium (5.5/10)',
        'Core Density': 'Ultra High Resilience Orthopedic Base',
        'Cover': 'Cooling Bamboo Knitted Cover (Removable & Washable)',
        'Country of Origin': 'Kenya'
      },
      warrantyYears: 10,
      trialNights: 60,
      rating: 4.9,
      reviewCount: 31,
      isFeatured: true,
      isBestSeller: true,
      firmnessRating: 5.5,
      firmnessLabel: 'Medium',
      firmness: 'Medium',
      firmnessScore: 6,
      mattressType: 'Gel Memory Foam',
      images: [
        'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-h1', sizeLabel: '4x6 (Double 8-Inch)', size: '4x6', thicknessInches: 8, thickness: 8, supplierPrice: 16000, price: 23500, sellingPrice: 23500, compareAtPrice: 28000, oldPrice: 28000, sku: 'HV-MEM-4X6-8', stockStatus: 'in_stock' },
        { id: 'v-h2', sizeLabel: '5x6 (Queen 8-Inch)', size: '5x6', thicknessInches: 8, thickness: 8, supplierPrice: 19500, price: 28500, sellingPrice: 28500, compareAtPrice: 34000, oldPrice: 34000, sku: 'HV-MEM-5X6-8', stockStatus: 'in_stock' },
        { id: 'v-h3', sizeLabel: '5x6 (Queen 10-Inch Deep)', size: '5x6', thicknessInches: 10, thickness: 10, supplierPrice: 23000, price: 34500, sellingPrice: 34500, compareAtPrice: 41000, oldPrice: 41000, sku: 'HV-MEM-5X6-10', stockStatus: 'in_stock' },
        { id: 'v-h4', sizeLabel: '6x6 (King 10-Inch Deep)', size: '6x6', thicknessInches: 10, thickness: 10, supplierPrice: 26500, price: 39500, sellingPrice: 39500, compareAtPrice: 47000, oldPrice: 47000, sku: 'HV-MEM-6X6-10', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-superfoam-premier-4x6',
      name: 'Superfoam Premier Standard Foam Mattress',
      slug: 'superfoam-premier-standard-foam',
      brand: 'Superfoam',
      department: 'mattresses',
      categoryId: 'cat-budget-foam',
      supplierId: 'sup-superfoam',
      primarySupplierId: 'sup-superfoam',
      description: 'Affordable, reliable everyday density mattress for master bedrooms, guest rooms, and rental apartments. Built with durable Kenyan foam.',
      features: [
        'Standard Medium Density Polyurethane Foam',
        'Durable Attractive Printed Fabric',
        'Great Value for Everyday Comfort',
        'Available in multiple thicknesses'
      ],
      specifications: {
        'Mattress Type': 'Standard Medium Density Foam',
        'Feel / Firmness': 'Medium (5.5/10)',
        'Core Material': 'Polyurethane Medium Density Foam',
        'Cover': 'Printed Poly-cotton Fabric',
        'Country of Origin': 'Kenya'
      },
      warrantyYears: 5,
      trialNights: 14,
      rating: 4.6,
      reviewCount: 19,
      isFeatured: false,
      isBestSeller: false,
      firmnessRating: 5.5,
      firmnessLabel: 'Medium',
      firmness: 'Medium Soft',
      firmnessScore: 5,
      mattressType: 'Medium Density Foam',
      images: [
        'https://images.unsplash.com/photo-1540518614846-7ede433c4ef9?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-sf1', sizeLabel: '3x6 (Single 6-Inch)', size: '3x6', thicknessInches: 6, thickness: 6, supplierPrice: 4800, price: 7200, sellingPrice: 7200, compareAtPrice: 8500, oldPrice: 8500, sku: 'SF-STD-3X6-6', stockStatus: 'in_stock' },
        { id: 'v-sf2', sizeLabel: '4x6 (Double 6-Inch)', size: '4x6', thicknessInches: 6, thickness: 6, supplierPrice: 6800, price: 10200, sellingPrice: 10200, compareAtPrice: 12500, oldPrice: 12500, sku: 'SF-STD-4X6-6', stockStatus: 'in_stock' },
        { id: 'v-sf3', sizeLabel: '4x6 (Double 8-Inch)', size: '4x6', thicknessInches: 8, thickness: 8, supplierPrice: 8500, price: 12800, sellingPrice: 12800, compareAtPrice: 15000, oldPrice: 15000, sku: 'SF-STD-4X6-8', stockStatus: 'in_stock' },
        { id: 'v-sf4', sizeLabel: '5x6 (Queen 8-Inch)', size: '5x6', thicknessInches: 8, thickness: 8, supplierPrice: 10500, price: 15800, sellingPrice: 15800, compareAtPrice: 19000, oldPrice: 19000, sku: 'SF-STD-5X6-8', stockStatus: 'in_stock' },
        { id: 'v-sf5', sizeLabel: '6x6 (King 8-Inch)', size: '6x6', thicknessInches: 8, thickness: 8, supplierPrice: 12800, price: 19200, sellingPrice: 19200, compareAtPrice: 23000, oldPrice: 23000, sku: 'SF-STD-6X6-8', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },

    // ==========================================
    // 2. BEDDING ACCESSORIES
    // ==========================================
    {
      id: 'prod-haveens-bamboo-protector',
      name: 'Haveens 100% Waterproof Bamboo Quilted Mattress Protector',
      slug: 'haveens-waterproof-bamboo-mattress-protector',
      brand: 'Haveens Company',
      department: 'accessories',
      categoryId: 'cat-accessories',
      supplierId: 'sup-haveens-textiles',
      primarySupplierId: 'sup-haveens-textiles',
      description: 'Ultra-breathable 3D jacquard organic bamboo surface with silent TPU waterproof membrane. Shields your mattress from spills, allergens, sweat, and stains without any plastic crinkly noise.',
      features: [
        '100% Waterproof Silent TPU Barrier',
        'Organic Breathable Bamboo Surface Cooling Layer',
        'Deep Fitted Elastic Skirt (Fits mattresses up to 14" thick)',
        'Machine Washable & Anti-Bacterial'
      ],
      specifications: {
        'Product Type': 'Quilted Fitted Mattress Protector',
        'Fabric': '40% Natural Bamboo Fibre, 60% Microfibre',
        'Waterproofing': '100% Medical-grade Polyurethane Membrane',
        'Fit': 'Elastic 360-degree Deep Skirt'
      },
      warrantyYears: 3,
      rating: 4.9,
      reviewCount: 47,
      isFeatured: true,
      isBestSeller: true,
      images: [
        'https://images.unsplash.com/photo-1582582621959-48d27397dc69?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-prot-3x6', sizeLabel: '3x6 (Single)', size: '3x6', thicknessInches: 0, supplierPrice: 1200, price: 2200, sellingPrice: 2200, compareAtPrice: 2800, oldPrice: 2800, sku: 'HV-PROT-3X6', stockStatus: 'in_stock' },
        { id: 'v-prot-4x6', sizeLabel: '4x6 (Double)', size: '4x6', thicknessInches: 0, supplierPrice: 1500, price: 2800, sellingPrice: 2800, compareAtPrice: 3500, oldPrice: 3500, sku: 'HV-PROT-4X6', stockStatus: 'in_stock' },
        { id: 'v-prot-5x6', sizeLabel: '5x6 (Queen Standard)', size: '5x6', thicknessInches: 0, supplierPrice: 1800, price: 3400, sellingPrice: 3400, compareAtPrice: 4200, oldPrice: 4200, sku: 'HV-PROT-5X6', stockStatus: 'in_stock' },
        { id: 'v-prot-6x6', sizeLabel: '6x6 (King Master)', size: '6x6', thicknessInches: 0, supplierPrice: 2100, price: 3900, sellingPrice: 3900, compareAtPrice: 4800, oldPrice: 4800, sku: 'HV-PROT-6X6', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-haveens-cervical-pillow',
      name: 'Haveens Orthopedic Cervical Contour Memory Foam Pillow',
      slug: 'haveens-orthopedic-cervical-contour-pillow',
      brand: 'Haveens Company',
      department: 'accessories',
      categoryId: 'cat-accessories',
      supplierId: 'sup-haveens-textiles',
      primarySupplierId: 'sup-haveens-textiles',
      description: 'Doctor-crafted ergonomic contour pillow that supports the natural curvature of the neck and cervical spine, eliminating morning stiffness, neck aches, and snoring.',
      features: [
        'Dual-Height Ergonomic Contour for Side & Back Sleepers',
        'Slow-Rebound High Density Memory Core',
        'Cooling Ice Silk Removable Cover',
        'Hypoallergenic & Odor-Free'
      ],
      specifications: {
        'Product Type': 'Orthopedic Cervical Contour Pillow',
        'Fill Material': '100% Pure Visco-Elastic Memory Foam',
        'Dimensions': '60 x 35 x 12/9 cm',
        'Cover': 'Washable Ice-Silk Knitted Cover'
      },
      warrantyYears: 5,
      rating: 4.8,
      reviewCount: 39,
      isFeatured: true,
      isBestSeller: true,
      images: [
        'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1582582621959-48d27397dc69?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-pil-single', sizeLabel: 'Standard (1 Pillow)', size: 'Standard', thicknessInches: 0, supplierPrice: 1800, price: 3200, sellingPrice: 3200, compareAtPrice: 4000, oldPrice: 4000, sku: 'HV-PIL-1', stockStatus: 'in_stock' },
        { id: 'v-pil-pair', sizeLabel: 'Twin Pack (2 Pillows)', size: 'Twin Pack', thicknessInches: 0, supplierPrice: 3200, price: 5800, sellingPrice: 5800, compareAtPrice: 7500, oldPrice: 7500, sku: 'HV-PIL-2', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-haveens-egyptian-sheets',
      name: 'Haveens 400TC 100% Egyptian Cotton 4-Piece Bed Sheet Set',
      slug: 'haveens-egyptian-cotton-4-piece-sheet-set',
      brand: 'Haveens Company',
      department: 'accessories',
      categoryId: 'cat-accessories',
      supplierId: 'sup-haveens-textiles',
      primarySupplierId: 'sup-haveens-textiles',
      description: 'Hotel-grade 400 thread count long-staple Egyptian cotton sheets. Silky sateen weave, crisp breathability, and deep pocket fitted elastic for snug mattress fit.',
      features: [
        '100% Long-Staple Pure Egyptian Cotton',
        'Lustrous Sateen Weave for Silky Soft Touch',
        'Includes 1 Fitted Sheet, 1 Flat Sheet & 2 Pillowcases',
        'Fade-Resistant & Machine Washable'
      ],
      specifications: {
        'Thread Count': '400 Thread Count Sateen',
        'Material': '100% Egyptian Long-Staple Cotton',
        'Set Includes': '1 Fitted Sheet, 1 Flat Sheet, 2 Pillowcases (50x75cm)',
        'Colors Available': 'Crisp Pearl White, Soft Slate Grey, Warm Sand'
      },
      warrantyYears: 2,
      rating: 4.9,
      reviewCount: 22,
      isFeatured: false,
      isBestSeller: true,
      images: [
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1582582621959-48d27397dc69?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-sheet-4x6', sizeLabel: '4x6 (Double Set - White)', size: '4x6', thicknessInches: 0, supplierPrice: 2600, price: 4200, sellingPrice: 4200, compareAtPrice: 5200, oldPrice: 5200, sku: 'HV-SHT-4X6-WH', stockStatus: 'in_stock' },
        { id: 'v-sheet-5x6', sizeLabel: '5x6 (Queen Set - Pearl White)', size: '5x6', thicknessInches: 0, supplierPrice: 3200, price: 5400, sellingPrice: 5400, compareAtPrice: 6500, oldPrice: 6500, sku: 'HV-SHT-5X6-WH', stockStatus: 'in_stock' },
        { id: 'v-sheet-5x6-gr', sizeLabel: '5x6 (Queen Set - Slate Grey)', size: '5x6', thicknessInches: 0, supplierPrice: 3200, price: 5400, sellingPrice: 5400, compareAtPrice: 6500, oldPrice: 6500, sku: 'HV-SHT-5X6-GR', stockStatus: 'in_stock' },
        { id: 'v-sheet-6x6', sizeLabel: '6x6 (King Set - Pearl White)', size: '6x6', thicknessInches: 0, supplierPrice: 3800, price: 6200, sellingPrice: 6200, compareAtPrice: 7500, oldPrice: 7500, sku: 'HV-SHT-6X6-WH', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-haveens-gel-topper',
      name: 'Haveens 2-Inch High Resilience Cooling Gel Mattress Topper',
      slug: 'haveens-2-inch-cooling-gel-mattress-topper',
      brand: 'Haveens Company',
      department: 'accessories',
      categoryId: 'cat-accessories',
      supplierId: 'sup-haveens-textiles',
      primarySupplierId: 'sup-haveens-textiles',
      description: 'Transform any stiff or aging mattress into a cloud of plush pressure-relieving comfort. Features ventilated cooling gel memory foam and corner anchor straps.',
      features: [
        '2-Inch Pure Contouring Gel Foam Layer',
        'Revitalizes Aging or Stiff Mattresses',
        '4 Heavy-Duty Elastic Corner Fit Straps',
        'Removable Breathable Cover'
      ],
      specifications: {
        'Thickness': '2 Inches (5 cm)',
        'Foam Core': 'Gel-Infused Visco-Elastic Memory Foam',
        'Cover': 'Anti-Slip Grip Bottom with Knitted Top',
        'Warranty': '3 Years'
      },
      warrantyYears: 3,
      rating: 4.8,
      reviewCount: 18,
      isFeatured: false,
      isBestSeller: false,
      images: [
        'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-top-4x6', sizeLabel: '4x6 (Double)', size: '4x6', thicknessInches: 2, thickness: 2, supplierPrice: 5500, price: 8500, sellingPrice: 8500, compareAtPrice: 10500, oldPrice: 10500, sku: 'HV-TOP-4X6-2', stockStatus: 'in_stock' },
        { id: 'v-top-5x6', sizeLabel: '5x6 (Queen)', size: '5x6', thicknessInches: 2, thickness: 2, supplierPrice: 7000, price: 11200, sellingPrice: 11200, compareAtPrice: 13500, oldPrice: 13500, sku: 'HV-TOP-5X6-2', stockStatus: 'in_stock' },
        { id: 'v-top-6x6', sizeLabel: '6x6 (King)', size: '6x6', thicknessInches: 2, thickness: 2, supplierPrice: 8500, price: 13500, sellingPrice: 13500, compareAtPrice: 16500, oldPrice: 16500, sku: 'HV-TOP-6X6-2', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },

    // ==========================================
    // 3. FURNITURE & BED FRAMES
    // ==========================================
    {
      id: 'prod-haveens-teak-platform-bed',
      name: 'Haveens Artisan Solid Hardwood Platform Bed Frame',
      slug: 'haveens-artisan-solid-hardwood-platform-bed-frame',
      brand: 'Haveens Company',
      department: 'furniture',
      categoryId: 'cat-bed-frames',
      supplierId: 'sup-haveens-workshop',
      primarySupplierId: 'sup-haveens-workshop',
      description: 'Mastercrafted from seasoned East African mahogany and teak hardwood. Reinforced centre beams and acoustic silent slat dampers support up to 600kg without squeaking.',
      features: [
        '100% Solid Kiln-Dried Mahogany / Teak Hardwood',
        'Heavy Duty Reinforced Structural Steel Slat Support',
        'Noise-Free Acoustic Squeak-Proof Joints',
        'Warm Natural Satin Varnish Finish'
      ],
      specifications: {
        'Wood Type': 'Kiln-Dried African Mahogany / Teak',
        'Headboard Height': '115 cm',
        'Underbed Clearance': '22 cm (Ample storage space)',
        'Assembly': 'Tool-Free Quick Bolt Assembly (Assembly included for delivery)',
        'Weight Capacity': '600 kg'
      },
      warrantyYears: 10,
      rating: 4.9,
      reviewCount: 16,
      isFeatured: true,
      isBestSeller: true,
      images: [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1540518614846-7ede433c4ef9?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-bed-4x6', sizeLabel: '4x6 Double (Mahogany Satin)', size: '4x6', thicknessInches: 0, supplierPrice: 18000, price: 28500, sellingPrice: 28500, compareAtPrice: 34000, oldPrice: 34000, sku: 'HV-WBD-4X6-MAH', stockStatus: 'in_stock' },
        { id: 'v-bed-5x6', sizeLabel: '5x6 Queen (Mahogany Satin)', size: '5x6', thicknessInches: 0, supplierPrice: 23000, price: 36000, sellingPrice: 36000, compareAtPrice: 43000, oldPrice: 43000, sku: 'HV-WBD-5X6-MAH', stockStatus: 'in_stock' },
        { id: 'v-bed-5x6-tk', sizeLabel: '5x6 Queen (Natural Golden Teak)', size: '5x6', thicknessInches: 0, supplierPrice: 25000, price: 39500, sellingPrice: 39500, compareAtPrice: 47000, oldPrice: 47000, sku: 'HV-WBD-5X6-TK', stockStatus: 'in_stock' },
        { id: 'v-bed-6x6', sizeLabel: '6x6 King Master Suite (Mahogany)', size: '6x6', thicknessInches: 0, supplierPrice: 28000, price: 44500, sellingPrice: 44500, compareAtPrice: 52000, oldPrice: 52000, sku: 'HV-WBD-6X6-MAH', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-haveens-chesterfield-bed',
      name: 'Haveens Royal Chesterfield Diamond Tufted Velvet Bed',
      slug: 'haveens-royal-chesterfield-tufted-velvet-bed',
      brand: 'Haveens Company',
      department: 'furniture',
      categoryId: 'cat-upholstered-beds',
      supplierId: 'sup-haveens-workshop',
      primarySupplierId: 'sup-haveens-workshop',
      description: 'Opulent statement bed upholstered in stain-resistant Dutch velvet. Deep hand-folded diamond button tufting and padded wingback headboard for luxurious lounging.',
      features: [
        'Deep Hand-Tufted Diamond Button Detailing',
        'Stain-Resistant Dutch Soft Velvet Upholstery',
        'High-Density Padded Lumbar Headboard',
        'Solid Hardwood Internal Frame Structure'
      ],
      specifications: {
        'Upholstery': 'Premium Water-Repellent Velvet',
        'Headboard Height': '135 cm (Grand Statement Profile)',
        'Color Choices': 'Royal Midnight Blue, Emerald Green, Warm Champagne, Charcoal Grey',
        'Slats': 'Heavy Duty Sprung Wooden Slats'
      },
      warrantyYears: 8,
      rating: 5.0,
      reviewCount: 24,
      isFeatured: true,
      isBestSeller: true,
      images: [
        'https://images.unsplash.com/photo-1540518614846-7ede433c4550?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-chst-5x6-bl', sizeLabel: '5x6 Queen (Royal Midnight Blue)', size: '5x6', thicknessInches: 0, supplierPrice: 28000, price: 42500, sellingPrice: 42500, compareAtPrice: 50000, oldPrice: 50000, sku: 'HV-CST-5X6-BL', stockStatus: 'in_stock' },
        { id: 'v-chst-5x6-em', sizeLabel: '5x6 Queen (Emerald Green)', size: '5x6', thicknessInches: 0, supplierPrice: 28000, price: 42500, sellingPrice: 42500, compareAtPrice: 50000, oldPrice: 50000, sku: 'HV-CST-5X6-EM', stockStatus: 'in_stock' },
        { id: 'v-chst-5x6-ch', sizeLabel: '5x6 Queen (Warm Champagne Velvet)', size: '5x6', thicknessInches: 0, supplierPrice: 28000, price: 42500, sellingPrice: 42500, compareAtPrice: 50000, oldPrice: 50000, sku: 'HV-CST-5X6-CH', stockStatus: 'in_stock' },
        { id: 'v-chst-6x6-bl', sizeLabel: '6x6 King (Royal Midnight Blue)', size: '6x6', thicknessInches: 0, supplierPrice: 33000, price: 49500, sellingPrice: 49500, compareAtPrice: 58000, oldPrice: 58000, sku: 'HV-CST-6X6-BL', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-haveens-hydraulic-storage-bed',
      name: 'Haveens Modern Hydraulic Gas-Lift Underbed Storage Frame',
      slug: 'haveens-modern-hydraulic-gas-lift-storage-bed',
      brand: 'Haveens Company',
      department: 'furniture',
      categoryId: 'cat-upholstered-beds',
      supplierId: 'sup-haveens-workshop',
      primarySupplierId: 'sup-haveens-workshop',
      description: 'Effortlessly maximize bedroom space. Heavy-duty dual hydraulic pistons smoothly lift the entire mattress platform with light fingertip pressure, revealing 800+ litres of dust-free underbed storage.',
      features: [
        'Heavy-Duty German Engineered Gas-Lift Pistons',
        '800+ Litres Dust-Sealed Underbed Storage Capacity',
        'Padded Linen Fabric Headboard with Clean Horizontal Lines',
        'Integrated Steel Base Frame with Non-Slip Fabric Floor'
      ],
      specifications: {
        'Lifting Mechanism': 'Dual Gas Piston Struts (1200N force)',
        'Storage Depth': '28 cm Internal Storage Compartment',
        'Upholstery': 'Textured Charcoal Grey Linen Fabric',
        'Frame': 'Cold-Rolled Structural Steel Tubing & Hardwood'
      },
      warrantyYears: 8,
      rating: 4.9,
      reviewCount: 14,
      isFeatured: false,
      isBestSeller: true,
      images: [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-hyd-5x6', sizeLabel: '5x6 Queen (Charcoal Grey Linen)', size: '5x6', thicknessInches: 0, supplierPrice: 32000, price: 48000, sellingPrice: 48000, compareAtPrice: 56000, oldPrice: 56000, sku: 'HV-HYD-5X6-GR', stockStatus: 'in_stock' },
        { id: 'v-hyd-6x6', sizeLabel: '6x6 King (Charcoal Grey Linen)', size: '6x6', thicknessInches: 0, supplierPrice: 37000, price: 55000, sellingPrice: 55000, compareAtPrice: 65000, oldPrice: 65000, sku: 'HV-HYD-6X6-GR', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-haveens-scandi-nightstand',
      name: 'Haveens 2-Drawer Scandinavian Hardwood Bedside Nightstand',
      slug: 'haveens-2-drawer-scandinavian-hardwood-nightstand',
      brand: 'Haveens Company',
      department: 'furniture',
      categoryId: 'cat-bedroom-furniture',
      supplierId: 'sup-haveens-workshop',
      primarySupplierId: 'sup-haveens-workshop',
      description: 'Minimalist Scandinavian bedside table with solid hardwood tapered legs, smooth soft-close drawer slides, and natural wood grain texture.',
      features: [
        'Solid African Hardwood & Moisture-Resistant MDF',
        'Smooth Ball-Bearing Soft-Close Drawer Rails',
        'Brushed Brass Accent Pull Handles',
        'Cable Management Pass-Through on Top Surface'
      ],
      specifications: {
        'Dimensions': '45 x 40 x 55 cm (W x D x H)',
        'Drawers': '2 Deep Soft-Close Drawers',
        'Finish': 'Natural Teak Wood / Warm Walnut Finish',
        'Legs': 'Solid Hardwood Flared Spindle Legs'
      },
      warrantyYears: 5,
      rating: 4.8,
      reviewCount: 29,
      isFeatured: false,
      isBestSeller: true,
      images: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-nst-single', sizeLabel: 'Single Nightstand (1 Unit)', size: 'Single Unit', thicknessInches: 0, supplierPrice: 4500, price: 7800, sellingPrice: 7800, compareAtPrice: 9500, oldPrice: 9500, sku: 'HV-NST-1', stockStatus: 'in_stock' },
        { id: 'v-nst-pair', sizeLabel: 'Pair (2 Matching Nightstands)', size: 'Set of 2', thicknessInches: 0, supplierPrice: 8500, price: 14500, sellingPrice: 14500, compareAtPrice: 18000, oldPrice: 18000, sku: 'HV-NST-2', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-haveens-sofabed-futon',
      name: 'Haveens Multi-Position Reclining Sofa Bed (Futon Couch)',
      slug: 'haveens-multi-position-reclining-sofa-bed',
      brand: 'Haveens Company',
      department: 'furniture',
      categoryId: 'cat-bedroom-furniture',
      supplierId: 'sup-haveens-workshop',
      primarySupplierId: 'sup-haveens-workshop',
      description: 'Contemporary click-clack 3-in-1 sofa bed. Easily transitions from an upright lounge couch to a 45° reading recliner, and lays completely flat into a plush double bed for overnight guests.',
      features: [
        'Smooth 3-Position Click-Clack Recline Mechanism',
        'High-Density Ortho Foam Cushioning with Sinuous Springs',
        'Durable Pet-Friendly Texturized Linen Fabric',
        'Includes 2 Matching Bolster Pillows'
      ],
      specifications: {
        'Sofa Dimensions': '185 x 85 x 82 cm',
        'Bed Dimensions': '185 x 115 x 42 cm (Full Double Size)',
        'Legs': 'Reinforced Matte Black Metal Spindle Legs',
        'Max Load': '350 kg'
      },
      warrantyYears: 5,
      rating: 4.8,
      reviewCount: 15,
      isFeatured: true,
      isBestSeller: false,
      images: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-sf-gry', sizeLabel: 'Smoke Grey Linen (With 2 Bolsters)', size: 'Standard Double', thicknessInches: 0, supplierPrice: 19000, price: 29500, sellingPrice: 29500, compareAtPrice: 35000, oldPrice: 35000, sku: 'HV-SFB-GRY', stockStatus: 'in_stock' },
        { id: 'v-sf-blu', sizeLabel: 'Deep Navy Blue Linen (With 2 Bolsters)', size: 'Standard Double', thicknessInches: 0, supplierPrice: 19000, price: 29500, sellingPrice: 29500, compareAtPrice: 35000, oldPrice: 35000, sku: 'HV-SFB-BLU', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

// Clean Baseline Initializer with Haveens Company Catalogue
export function getDefaultReviews(): Review[] {
  return [];
}

function getInitialSeedData(): DatabaseSchema {
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);

  const categories = getDefaultCategories();
  const products = getDefaultProducts();

  const suppliers: Supplier[] = [];

  const deliveryZones: DeliveryZone[] = [
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
  ];

  const users: DatabaseSchema['users'] = [
    {
      id: 'usr-admin-1',
      name: 'Cliff Nyambagera',
      email: 'admin@haveenscompany.co.ke',
      phone: '+254712345678',
      role: 'admin',
      passwordHash: adminPasswordHash,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-admin-2',
      name: 'Cliff Nyambagera',
      email: 'nyambageracliff@gmail.com',
      phone: '+254712345678',
      role: 'admin',
      passwordHash: adminPasswordHash,
      createdAt: new Date().toISOString()
    }
  ];

  const drivers: Driver[] = [];

  const coupons: Coupon[] = [];

  const settings: AdminSettings = {
    businessName: 'Haveens Company',
    tagline: 'Premium Mattresses, Bedding Accessories & Handcrafted Furniture Kenya',
    logoUrl: '',
    phone: '+254 742 967 083',
    phoneAlternative: '+254 116 822 231',
    email: 'hello@haveenscompany.co.ke',
    whatsapp: '+254116822231',
    physicalAddress: 'Haveens Hub, Nakuru 20100, Kenya',
    currency: 'KES',
    currencySymbol: 'KSh',
    pickupEnabled: true,
    pickupAddress: 'Haveens Hub, Nakuru 20100',
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
      senderId: 'HAVEENS'
    }
  };

  return {
    users,
    products,
    categories,
    suppliers,
    orders: [],
    payments: [],
    deliveryZones,
    reviews: [],
    wishlists: [],
    coupons,
    drivers,
    notifications: [],
    activityLogs: [],
    settings
  };
}

class DatabaseService {
  private data: DatabaseSchema;
  private isLoaded = false;

  constructor() {
    this.data = getInitialSeedData();
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        
        // Ensure products and categories exist and are updated
        if (!parsed.products || parsed.products.length === 0) {
          parsed.products = getDefaultProducts();
        }
        if (!parsed.categories || parsed.categories.length === 0) {
          parsed.categories = getDefaultCategories();
        }
        if (!parsed.reviews || parsed.reviews.length === 0) {
          parsed.reviews = getDefaultReviews();
        }
        if (parsed.settings) {
          parsed.settings.businessName = 'Haveens Company';
          parsed.settings.tagline = 'Premium Mattresses, Bedding Accessories & Handcrafted Furniture Kenya';
        }

        // Ensure nyambageracliff@gmail.com is explicitly configured with admin role
        if (Array.isArray(parsed.users)) {
          const cliffUser = parsed.users.find((u: any) => u.email?.toLowerCase() === 'nyambageracliff@gmail.com');
          if (cliffUser) {
            cliffUser.role = 'admin';
          } else {
            const adminPasswordHash = bcrypt.hashSync('admin123', 10);
            parsed.users.push({
              id: 'usr-admin-cliff',
              name: 'Cliff Nyambagera',
              email: 'nyambageracliff@gmail.com',
              phone: '+254712345678',
              role: 'admin',
              passwordHash: adminPasswordHash,
              createdAt: new Date().toISOString()
            });
          }
        }

        this.data = parsed;
        this.save();
      } else {
        this.save();
      }
      this.isLoaded = true;
    } catch (err) {
      console.error('Error loading database file, initializing clean database:', err);
      this.data = getInitialSeedData();
      this.save();
      this.isLoaded = true;
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Failed to save database file:', err);
    }
  }

  // Getters
  public getUsers() { return this.data.users; }
  public getProducts() { return this.data.products; }
  public getCategories() { return this.data.categories; }
  public getSuppliers() { return this.data.suppliers; }
  public getOrders() { return this.data.orders; }
  public getPayments() { return this.data.payments; }
  public getDeliveryZones() { return this.data.deliveryZones; }
  public getReviews() { return this.data.reviews; }
  public getWishlists() { return this.data.wishlists; }
  public getCoupons() { return this.data.coupons; }
  public getDrivers() { return this.data.drivers; }
  public getNotifications() { return this.data.notifications; }
  public getActivityLogs() { return this.data.activityLogs; }
  public getSettings() { return this.data.settings; }

  // Activity logger
  public logActivity(userId: string, userName: string, action: string, details: string) {
    const log: AdminActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      userName,
      action,
      details,
      createdAt: new Date().toISOString()
    };
    this.data.activityLogs.unshift(log);
    if (this.data.activityLogs.length > 500) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 500);
    }
    this.save();
    return log;
  }

  // Reset to seed data helper
  public resetToSeed() {
    this.data = getInitialSeedData();
    this.save();
    return true;
  }
}

export const db = new DatabaseService();
