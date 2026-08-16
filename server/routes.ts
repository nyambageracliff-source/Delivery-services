import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { 
  requireAuth, requireAdminOrStaff, requireAdminOnly, 
  requireDriver, generateToken, sanitizeUser, AuthRequest 
} from './auth.js';
import { 
  initiateMpesaSTKPush, verifyAndConfirmMpesaPayment, 
  rejectMpesaPayment, generateMpesaReceipt 
} from './mpesa.js';
import { dispatchNotification, notifyOrderStatusChange } from './notifications.js';
import { 
  Order, OrderItem, Product, ProductVariant, User, 
  OrderStatus, PaymentStatus, Review, Coupon, AnalyticsSummary 
} from '../src/types.js';
import { 
  testSupabaseConnection, syncLocalDataToSupabase, isSupabaseConfigured,
  pullDataFromSupabase, querySupabaseTable, upsertUserToSupabase, supabaseMutations
} from './supabase.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Helper to sanitize products for public viewing (strip supplier prices)
function sanitizeProductForPublic(product: Product): Product {
  const sanitizedVariants = product.variants.map(v => {
    const { supplierPrice, ...publicVariant } = v;
    return publicVariant as ProductVariant;
  });
  const { primarySupplierId, ...publicProduct } = product;
  return {
    ...publicProduct,
    variants: sanitizedVariants
  } as Product;
}

// Generate unique order number (e.g. ORD-2026-000104)
function generateNextOrderNumber(): string {
  const currentOrders = db.getOrders();
  const count = currentOrders.length + 104;
  const year = new Date().getFullYear();
  const padded = String(count).padStart(6, '0');
  return `ORD-${year}-${padded}`;
}

// ==========================================
// 1. AUTHENTICATION & PROFILE ROUTES
// ==========================================

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, role, businessName, vehicleType, vehiclePlate, address } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required.' });
    }

    const existing = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const userRole = (role === 'buyer' || role === 'driver' || role === 'admin' || role === 'staff') ? role : 'customer';

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: any = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      role: userRole,
      businessName: businessName?.trim() || undefined,
      vehicleType: vehicleType?.trim() || undefined,
      vehiclePlate: vehiclePlate?.trim() || undefined,
      passwordHash,
      createdAt: new Date().toISOString(),
      addresses: address ? [{
        id: `addr-${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        ...address,
        isDefault: true
      }] : []
    };

    db.getUsers().push(newUser);

    // If driver registered, automatically add to drivers fleet
    if (userRole === 'driver') {
      const existingDriver = db.getDrivers().find(d => d.phone === phone.trim());
      if (!existingDriver) {
        db.getDrivers().push({
          id: `drv-${Date.now()}`,
          name: name.trim(),
          phone: phone.trim(),
          email: email.toLowerCase().trim(),
          vehicleType: vehicleType?.trim() || 'Delivery Van',
          vehiclePlate: vehiclePlate?.trim() || 'KDM 450X',
          status: 'active',
          currentLocation: 'Nakuru CBD Central Hub',
          assignedOrdersCount: 0,
          deliveredOrdersCount: 0,
          rating: 5.0,
          createdAt: new Date().toISOString()
        });
      }
    }

    db.save();

    const sanitized = sanitizeUser(newUser);
    const token = generateToken(sanitized);

    db.logActivity(newUser.id, newUser.name, 'REGISTER', `New ${userRole} registered: ${newUser.email}`);

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: sanitized
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const sanitized = sanitizeUser(user);
    const token = generateToken(sanitized);

    return res.json({
      message: 'Login successful.',
      token,
      user: sanitized
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

router.get('/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  return res.json({ user: req.user });
});

router.put('/auth/profile', requireAuth, (req: AuthRequest, res: Response) => {
  const user = db.getUsers().find(u => u.id === req.user?.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, phone, addresses } = req.body;
  if (name) user.name = name.trim();
  if (phone) user.phone = phone.trim();
  if (addresses && Array.isArray(addresses)) user.addresses = addresses;

  db.save();
  return res.json({ message: 'Profile updated successfully.', user: sanitizeUser(user) });
});

// ==========================================
// 2. PRODUCT ROUTES
// ==========================================

router.get('/products', (req: Request, res: Response) => {
  let products = [...db.getProducts()];

  // Filter out archived products for non-admin requests
  const showArchived = req.query.includeArchived === 'true';
  if (!showArchived) {
    products = products.filter(p => !p.isArchived);
  }

  // Search query (name, brand, category, description)
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase().trim() : '';
  if (search) {
    products = products.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.brand.toLowerCase().includes(search) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(search)) ||
      p.description.toLowerCase().includes(search) ||
      p.features.some(f => f.toLowerCase().includes(search))
    );
  }

  // Category filter
  if (req.query.category) {
    products = products.filter(p => p.categoryId === req.query.category || p.slug === req.query.category);
  }

  // Department filter ('mattresses' | 'accessories' | 'furniture')
  if (req.query.department && req.query.department !== 'all') {
    products = products.filter(p => p.department === req.query.department);
  }

  // Brand filter
  if (req.query.brand) {
    const brands = Array.isArray(req.query.brand) ? req.query.brand : [req.query.brand];
    products = products.filter(p => brands.includes(p.brand));
  }

  // Firmness filter
  if (req.query.firmness) {
    const firmnesses = Array.isArray(req.query.firmness) ? req.query.firmness : [req.query.firmness];
    products = products.filter(p => firmnesses.includes(p.firmness));
  }

  // Mattress Size filter (checks if product has a variant in that size)
  if (req.query.size) {
    const size = String(req.query.size);
    products = products.filter(p => p.variants.some(v => v.sizeLabel.includes(size)));
  }

  // Thickness filter
  if (req.query.thickness) {
    const thick = Number(req.query.thickness);
    if (!isNaN(thick)) {
      products = products.filter(p => p.availableThicknesses.includes(thick));
    }
  }

  // Price range filter (based on lowest variant price)
  if (req.query.minPrice) {
    const min = Number(req.query.minPrice);
    if (!isNaN(min)) products = products.filter(p => p.basePrice >= min);
  }
  if (req.query.maxPrice) {
    const max = Number(req.query.maxPrice);
    if (!isNaN(max)) products = products.filter(p => p.basePrice <= max);
  }

  // Flags filter
  if (req.query.featured === 'true') products = products.filter(p => p.isFeatured);
  if (req.query.bestSeller === 'true') products = products.filter(p => p.isBestSeller);
  if (req.query.newArrival === 'true') products = products.filter(p => p.isNewArrival);
  if (req.query.specialOffer === 'true') products = products.filter(p => p.isSpecialOffer);

  // Sorting
  const sort = req.query.sort as string;
  if (sort === 'price_asc') {
    products.sort((a, b) => a.basePrice - b.basePrice);
  } else if (sort === 'price_desc') {
    products.sort((a, b) => b.basePrice - a.basePrice);
  } else if (sort === 'rating') {
    products.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'newest') {
    products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Check if admin user is requesting (to keep or strip supplier prices)
  const authHeader = req.headers.authorization;
  let isAdmin = false;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded: any = jwtVerify(token);
      if (decoded && (decoded.role === 'admin' || decoded.role === 'staff')) {
        isAdmin = true;
      }
    } catch (_) {}
  }

  if (isAdmin) {
    return res.json({ count: products.length, products });
  }

  return res.json({
    count: products.length,
    products: products.map(sanitizeProductForPublic)
  });
});

function jwtVerify(token: string) {
  try {
    const jwt = require('jsonwebtoken');
    return jwt.verify(token, process.env.JWT_SECRET || 'haven_mattress_super_secret_jwt_key_2026');
  } catch {
    return null;
  }
}

router.get('/products/:idOrSlug', (req: Request, res: Response) => {
  const { idOrSlug } = req.params;
  const product = db.getProducts().find(p => p.id === idOrSlug || p.slug === idOrSlug);
  if (!product) {
    return res.status(404).json({ error: 'Mattress product not found.' });
  }

  // Get approved reviews for this product
  const reviews = db.getReviews().filter(r => r.productId === product.id && r.status === 'approved');

  // Check if requester is admin
  const authHeader = req.headers.authorization;
  let isAdmin = false;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const decoded: any = jwtVerify(authHeader.split(' ')[1]);
    if (decoded && (decoded.role === 'admin' || decoded.role === 'staff')) {
      isAdmin = true;
    }
  }

  return res.json({
    product: isAdmin ? product : sanitizeProductForPublic(product),
    reviews
  });
});

router.post('/products', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const data = req.body;
  if (!data.name || !data.brand || !data.categoryId || !data.variants || data.variants.length === 0) {
    return res.status(400).json({ error: 'Product name, brand, category, and at least one size variant are required.' });
  }

  const category = db.getCategories().find(c => c.id === data.categoryId);
  const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // Calculate base display price from smallest variant
  const sortedVariants = [...data.variants].sort((a: any, b: any) => a.price - b.price);
  const basePrice = sortedVariants[0].price;
  const baseOldPrice = sortedVariants[0].oldPrice;

  const newProduct: Product = {
    id,
    name: data.name.trim(),
    slug,
    brand: data.brand.trim(),
    categoryId: data.categoryId,
    categoryName: category?.name || 'Mattresses',
    description: data.description || '',
    shortDescription: data.shortDescription || '',
    features: data.features || [],
    materials: data.materials || [],
    warrantyYears: Number(data.warrantyYears) || 5,
    firmness: data.firmness || 'Medium Firm',
    firmnessScore: Number(data.firmnessScore) || 7,
    availableThicknesses: data.availableThicknesses || [8],
    images: data.images && data.images.length > 0 ? data.images : ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80'],
    isFeatured: Boolean(data.isFeatured),
    isBestSeller: Boolean(data.isBestSeller),
    isNewArrival: Boolean(data.isNewArrival),
    isSpecialOffer: Boolean(data.isSpecialOffer),
    isArchived: false,
    rating: 0,
    reviewCount: 0,
    basePrice,
    baseOldPrice,
    primarySupplierId: data.primarySupplierId || 'sup-1',
    deliveryInfo: data.deliveryInfo || 'Fast countrywide dispatch.',
    variants: data.variants.map((v: any, idx: number) => ({
      id: v.id || `var-${Date.now()}-${idx}`,
      productId: id,
      sizeLabel: v.sizeLabel,
      dimensions: v.dimensions || '',
      thicknessInches: Number(v.thicknessInches) || 8,
      price: Number(v.price),
      oldPrice: v.oldPrice ? Number(v.oldPrice) : undefined,
      supplierPrice: Number(v.supplierPrice) || Number(v.price) * 0.7,
      sku: v.sku || `SKU-${Date.now().toString().slice(-4)}-${idx}`,
      stockStatus: v.stockStatus || 'in_stock'
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.getProducts().unshift(newProduct);
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.insertProduct(newProduct as any).catch(err => console.warn('Supabase insertProduct warning:', err));

  db.logActivity(req.user!.id, req.user!.name, 'CREATE_PRODUCT', `Created new product: ${newProduct.name}`);

  return res.status(201).json({ message: 'Product created successfully.', product: newProduct });
});

router.put('/products/:id', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const product = db.getProducts().find(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const data = req.body;
  if (data.name) product.name = data.name.trim();
  if (data.brand) product.brand = data.brand.trim();
  if (data.categoryId) {
    product.categoryId = data.categoryId;
    const cat = db.getCategories().find(c => c.id === data.categoryId);
    if (cat) product.categoryName = cat.name;
  }
  if (data.description !== undefined) product.description = data.description;
  if (data.shortDescription !== undefined) product.shortDescription = data.shortDescription;
  if (data.features) product.features = data.features;
  if (data.materials) product.materials = data.materials;
  if (data.warrantyYears !== undefined) product.warrantyYears = Number(data.warrantyYears);
  if (data.firmness) product.firmness = data.firmness;
  if (data.firmnessScore !== undefined) product.firmnessScore = Number(data.firmnessScore);
  if (data.availableThicknesses) product.availableThicknesses = data.availableThicknesses;
  if (data.images && data.images.length > 0) product.images = data.images;
  if (data.isFeatured !== undefined) product.isFeatured = Boolean(data.isFeatured);
  if (data.isBestSeller !== undefined) product.isBestSeller = Boolean(data.isBestSeller);
  if (data.isNewArrival !== undefined) product.isNewArrival = Boolean(data.isNewArrival);
  if (data.isSpecialOffer !== undefined) product.isSpecialOffer = Boolean(data.isSpecialOffer);
  if (data.primarySupplierId !== undefined) product.primarySupplierId = data.primarySupplierId;
  if (data.deliveryInfo !== undefined) product.deliveryInfo = data.deliveryInfo;

  if (data.variants && Array.isArray(data.variants) && data.variants.length > 0) {
    product.variants = data.variants.map((v: any, idx: number) => ({
      id: v.id || `var-${Date.now()}-${idx}`,
      productId: product.id,
      sizeLabel: v.sizeLabel,
      dimensions: v.dimensions || '',
      thicknessInches: Number(v.thicknessInches) || 8,
      price: Number(v.price),
      oldPrice: v.oldPrice ? Number(v.oldPrice) : undefined,
      supplierPrice: Number(v.supplierPrice) || (v.price * 0.7),
      sku: v.sku || `SKU-${product.id.slice(-4)}-${idx}`,
      stockStatus: v.stockStatus || 'in_stock'
    }));

    const sortedVariants = [...product.variants].sort((a, b) => a.price - b.price);
    product.basePrice = sortedVariants[0].price;
    product.baseOldPrice = sortedVariants[0].oldPrice;
  }

  product.updatedAt = new Date().toISOString();
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.updateProduct(product.id, product as any).catch(err => console.warn('Supabase updateProduct warning:', err));

  db.logActivity(req.user!.id, req.user!.name, 'UPDATE_PRODUCT', `Updated product: ${product.name}`);

  return res.json({ message: 'Product updated successfully.', product });
});

router.delete('/products/:id', requireAdminOnly, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const index = db.getProducts().findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Product not found' });

  const deleted = db.getProducts().splice(index, 1)[0];
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.deleteProduct(id).catch(err => console.warn('Supabase deleteProduct warning:', err));

  db.logActivity(req.user!.id, req.user!.name, 'DELETE_PRODUCT', `Deleted product: ${deleted.name}`);

  return res.json({ message: 'Product deleted permanently.' });
});

router.patch('/products/:id/archive', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const product = db.getProducts().find(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  product.isArchived = !product.isArchived;
  product.updatedAt = new Date().toISOString();
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.updateProduct(product.id, product as any).catch(err => console.warn('Supabase archiveProduct warning:', err));

  db.logActivity(req.user!.id, req.user!.name, 'ARCHIVE_PRODUCT', `${product.isArchived ? 'Archived' : 'Restored'} product: ${product.name}`);

  return res.json({ message: `Product ${product.isArchived ? 'archived' : 'restored'} successfully.`, product });
});

// ==========================================
// 3. CATEGORIES & SUPPLIERS ROUTES
// ==========================================

router.get('/categories', (req: Request, res: Response) => {
  const categories = db.getCategories().map(cat => {
    const productCount = db.getProducts().filter(p => p.categoryId === cat.id && !p.isArchived).length;
    return { ...cat, productCount };
  });
  return res.json({ categories });
});

router.post('/categories', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const { name, description, image } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required.' });

  const id = `cat-${Date.now()}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const newCat = {
    id,
    name: name.trim(),
    slug,
    description: description || '',
    image: image || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
    displayOrder: db.getCategories().length + 1
  };

  db.getCategories().push(newCat);
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.insertCategory(newCat).catch(err => console.warn('Supabase insertCategory warning:', err));

  return res.status(201).json({ message: 'Category created.', category: newCat });
});

router.put('/categories/:id', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const category = db.getCategories().find(c => c.id === id);
  if (!category) return res.status(404).json({ error: 'Category not found' });

  const { name, description, image } = req.body;
  if (name) category.name = name.trim();
  if (description !== undefined) category.description = description;
  if (image) category.image = image;

  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.insertCategory(category).catch(err => console.warn('Supabase updateCategory warning:', err));

  return res.json({ message: 'Category updated.', category });
});

router.delete('/categories/:id', requireAdminOnly, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const index = db.getCategories().findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ error: 'Category not found' });

  db.getCategories().splice(index, 1);
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.deleteCategory(id).catch(err => console.warn('Supabase deleteCategory warning:', err));

  return res.json({ message: 'Category deleted.' });
});

router.get('/suppliers', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const suppliers = db.getSuppliers().map(s => {
    const productsSuppliedCount = db.getProducts().filter(p => p.primarySupplierId === s.id).length;
    return { ...s, productsSuppliedCount };
  });
  return res.json({ suppliers });
});

router.post('/suppliers', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const { name, company, phone, email, location, leadTimeDays, notes } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Supplier name and phone are required.' });

  const newSupplier = {
    id: `sup-${Date.now()}`,
    name: name.trim(),
    company: company || name.trim(),
    phone: phone.trim(),
    email: email || '',
    location: location || 'Nairobi, Kenya',
    leadTimeDays: Number(leadTimeDays) || 1,
    notes: notes || '',
    active: true
  };

  db.getSuppliers().push(newSupplier);
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.insertSupplier(newSupplier as any).catch(err => console.warn('Supabase insertSupplier warning:', err));

  return res.status(201).json({ message: 'Supplier created.', supplier: newSupplier });
});

router.put('/suppliers/:id', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const supplier = db.getSuppliers().find(s => s.id === req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  Object.assign(supplier, req.body);
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.updateSupplier(supplier.id, supplier as any).catch(err => console.warn('Supabase updateSupplier warning:', err));

  return res.json({ message: 'Supplier updated.', supplier });
});

router.delete('/suppliers/:id', requireAdminOnly, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const index = db.getSuppliers().findIndex(s => s.id === id);
  if (index === -1) return res.status(404).json({ error: 'Supplier not found' });

  db.getSuppliers().splice(index, 1);
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.deleteSupplier(id).catch(err => console.warn('Supabase deleteSupplier warning:', err));

  return res.json({ message: 'Supplier deleted.' });
});

// ==========================================
// 4. DELIVERY ZONES & COUPONS & DRIVERS
// ==========================================

router.get('/delivery-zones', (req: Request, res: Response) => {
  return res.json({ zones: db.getDeliveryZones().filter(z => z.active) });
});

router.post('/delivery-zones', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const { county, towns, baseFee, estimatedDays, freeDeliveryThreshold } = req.body;
  if (!county || baseFee === undefined) return res.status(400).json({ error: 'County and base fee required' });

  const zone = {
    id: `zone-${Date.now()}`,
    county: county.trim(),
    towns: Array.isArray(towns) ? towns : [towns],
    baseFee: Number(baseFee),
    estimatedDays: estimatedDays || '1-2 Days',
    freeDeliveryThreshold: freeDeliveryThreshold ? Number(freeDeliveryThreshold) : undefined,
    active: true
  };

  db.getDeliveryZones().push(zone);
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.insertDeliveryZone(zone as any).catch(err => console.warn('Supabase insertDeliveryZone warning:', err));

  return res.status(201).json({ message: 'Delivery zone added.', zone });
});

router.put('/delivery-zones/:id', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const zone = db.getDeliveryZones().find(z => z.id === req.params.id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  Object.assign(zone, req.body);
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.insertDeliveryZone(zone as any).catch(err => console.warn('Supabase updateDeliveryZone warning:', err));

  return res.json({ message: 'Delivery zone updated.', zone });
});

router.delete('/delivery-zones/:id', requireAdminOnly, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const index = db.getDeliveryZones().findIndex(z => z.id === id);
  if (index === -1) return res.status(404).json({ error: 'Zone not found' });

  db.getDeliveryZones().splice(index, 1);
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.deleteDeliveryZone(id).catch(err => console.warn('Supabase deleteDeliveryZone warning:', err));

  return res.json({ message: 'Delivery zone deleted.' });
});

// Drivers Management
router.get(['/drivers', '/admin/drivers'], requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  return res.json({ drivers: db.getDrivers() });
});

router.post(['/drivers', '/admin/drivers'], requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const { name, phone, vehicleType, vehiclePlate, notes } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Driver name and phone are required.' });

  const driver = {
    id: `drv-${Date.now()}`,
    name: name.trim(),
    phone: phone.trim(),
    vehicleType: vehicleType || 'Delivery Van',
    vehiclePlate: vehiclePlate || 'KDG 000X',
    notes: notes || '',
    active: true,
    rating: 0,
    deliveriesCount: 0
  };

  db.getDrivers().push(driver);
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.insertDriver(driver as any).catch(err => console.warn('Supabase insertDriver warning:', err));

  return res.status(201).json({ message: 'Driver created.', driver });
});

router.put(['/drivers/:id', '/admin/drivers/:id'], requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const driver = db.getDrivers().find(d => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  Object.assign(driver, req.body);
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.updateDriver(driver.id, driver as any).catch(err => console.warn('Supabase updateDriver warning:', err));

  return res.json({ message: 'Driver updated.', driver });
});

router.delete(['/drivers/:id', '/admin/drivers/:id'], requireAdminOnly, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const index = db.getDrivers().findIndex(d => d.id === id);
  if (index === -1) return res.status(404).json({ error: 'Driver not found' });

  const deletedDriver = db.getDrivers().splice(index, 1)[0];
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.deleteDriver(id).catch(err => console.warn('Supabase deleteDriver warning:', err));

  if (req.user) {
    db.logActivity(req.user.id, req.user.name, 'DELETE_DRIVER', `Deleted driver: ${deletedDriver.name} (${deletedDriver.phone})`);
  }
  return res.json({ message: 'Driver deleted.' });
});

router.post('/coupons/validate', (req: Request, res: Response) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'Coupon code required.' });

  const coupon = db.getCoupons().find(c => c.code.toUpperCase() === code.toUpperCase().trim() && c.active);
  if (!coupon) {
    return res.status(404).json({ error: 'Invalid or expired coupon code.' });
  }

  const now = new Date();
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    return res.status(400).json({ error: 'Coupon is not active yet.' });
  }
  if (coupon.expiryDate && new Date(coupon.expiryDate) < now) {
    return res.status(400).json({ error: 'Coupon has expired.' });
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json({ error: 'Coupon usage limit has been reached.' });
  }

  const orderSubtotal = Number(subtotal) || 0;
  if (orderSubtotal < coupon.minOrderAmount) {
    return res.status(400).json({ 
      error: `Minimum order amount for this coupon is KSh ${coupon.minOrderAmount.toLocaleString()}` 
    });
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = Math.round((orderSubtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  } else {
    discountAmount = coupon.discountValue;
  }

  return res.json({
    valid: true,
    code: coupon.code,
    discountAmount,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    description: coupon.description
  });
});

router.get('/coupons', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  return res.json({ coupons: db.getCoupons() });
});

router.post('/coupons', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const { code, discountType, discountValue, minOrderAmount, maxDiscount, expiryDate, usageLimit, description } = req.body;
  if (!code || !discountType || discountValue === undefined) {
    return res.status(400).json({ error: 'Coupon code, type, and value required' });
  }

  const newCoupon: Coupon = {
    id: `cpn-${Date.now()}`,
    code: code.toUpperCase().trim(),
    discountType,
    discountValue: Number(discountValue),
    minOrderAmount: Number(minOrderAmount) || 0,
    maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: expiryDate || '2026-12-31',
    usageLimit: usageLimit ? Number(usageLimit) : undefined,
    usedCount: 0,
    active: true,
    description
  };

  db.getCoupons().push(newCoupon);
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.insertCoupon(newCoupon as any).catch(err => console.warn('Supabase insertCoupon warning:', err));

  return res.status(201).json({ message: 'Coupon created.', coupon: newCoupon });
});

router.delete('/coupons/:id', requireAdminOnly, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const index = db.getCoupons().findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ error: 'Coupon not found' });

  db.getCoupons().splice(index, 1);
  db.save();

  // Asynchronously mirror mutation to Supabase
  supabaseMutations.deleteCoupon(id).catch(err => console.warn('Supabase deleteCoupon warning:', err));
  return res.json({ message: 'Coupon deleted.' });
});

// ==========================================
// 5. ORDERS & CHECKOUT SYSTEM
// ==========================================

router.post('/orders', async (req: Request, res: Response) => {
  try {
    const rawBody = req.body || {};
    
    // Extract customer contact details flexibly
    const customerName = (rawBody.customerName || rawBody.name || rawBody.fullName || '').toString().trim();
    const phone = (rawBody.phone || rawBody.customerPhone || rawBody.phoneNumber || rawBody.mpesaPhone || '').toString().trim();
    const email = (rawBody.email || rawBody.customerEmail || '').toString().trim();
    const deliveryType = (rawBody.deliveryType || rawBody.deliveryMethod || 'delivery').toString().trim();
    
    // Extract address details flexibly (supports string or object)
    let county = (rawBody.county || (typeof rawBody.deliveryAddress === 'object' ? rawBody.deliveryAddress?.county : '') || 'Nairobi').toString().trim();
    let town = (rawBody.town || rawBody.townCity || (typeof rawBody.deliveryAddress === 'object' ? (rawBody.deliveryAddress?.townCity || rawBody.deliveryAddress?.town) : '') || 'Nairobi').toString().trim();
    let area = (rawBody.area || rawBody.deliveryArea || (typeof rawBody.deliveryAddress === 'object' ? (rawBody.deliveryAddress?.deliveryArea || rawBody.deliveryAddress?.area) : '') || '').toString().trim();
    let landmark = (rawBody.landmark || (typeof rawBody.deliveryAddress === 'object' ? rawBody.deliveryAddress?.landmark : '') || '').toString().trim();
    let deliveryNotes = (rawBody.deliveryNotes || (typeof rawBody.deliveryAddress === 'object' ? rawBody.deliveryAddress?.deliveryNotes : '') || '').toString().trim();

    let deliveryAddress = (typeof rawBody.deliveryAddress === 'string' ? rawBody.deliveryAddress : '') 
      || (typeof rawBody.deliveryAddress === 'object' ? (rawBody.deliveryAddress?.deliveryArea || rawBody.deliveryAddress?.townCity || '') : '')
      || area || town || 'Customer Address';

    const couponCode = (rawBody.couponCode || '').toString().trim();
    const rawItems = Array.isArray(rawBody.items) ? rawBody.items : [];

    if (!customerName) {
      return res.status(400).json({ error: 'Please provide your full name / M-PESA registered name.' });
    }

    if (!phone) {
      return res.status(400).json({ error: 'Please provide a valid Safaricom phone number for M-PESA payment.' });
    }

    if (rawItems.length === 0) {
      return res.status(400).json({ error: 'Please choose at least 1 item in your shopping cart.' });
    }

    // Authenticate optional user
    let customerId: string | undefined = undefined;
    let isGuest = true;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded: any = jwtVerify(authHeader.split(' ')[1]);
      if (decoded && decoded.id) {
        customerId = decoded.id;
        isGuest = false;
      }
    }

    // Verify products and compute exact line totals and supplier costs
    let subtotal = 0;
    let totalSupplierCost = 0;
    const verifiedItems: OrderItem[] = [];
    let primarySupplierId = 'sup-dr-mattress';

    const allProducts = db.getProducts();

    for (const item of rawItems) {
      const productId = item.productId || item.id;
      let product = allProducts.find(p => p.id === productId || p.slug === productId);
      
      // Fallback: match by product name if ID mismatched
      if (!product && item.productName) {
        product = allProducts.find(p => p.name?.toLowerCase() === item.productName.toLowerCase());
      }
      
      // If still not found, construct a safe fallback from catalog
      if (!product) {
        product = allProducts[0];
      }

      if (!product) continue;

      const variant: any = (product.variants && product.variants.length > 0)
        ? (product.variants.find(v => v.id === item.variantId) || product.variants[0])
        : { id: 'v-default', sizeLabel: item.sizeLabel || 'Standard', thicknessInches: item.thicknessInches || 8, price: Number(item.unitPrice || item.price || 10000), supplierPrice: Number(item.supplierPrice || 7000) };

      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Number(variant.price || variant.sellingPrice || item.unitPrice || item.price || 5000);
      const supplierPrice = Number(variant.supplierPrice || Math.round(unitPrice * 0.7));
      const lineTotal = unitPrice * qty;
      const lineSupplierCost = supplierPrice * qty;
      const lineProfit = lineTotal - lineSupplierCost;

      subtotal += lineTotal;
      totalSupplierCost += lineSupplierCost;
      if (product.primarySupplierId) primarySupplierId = product.primarySupplierId;

      verifiedItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        productName: item.productName || product.name,
        productImage: item.image || item.productImage || product.images[0] || '',
        brand: item.brand || product.brand || 'Haveens Company',
        variantId: variant.id || 'v-1',
        sizeLabel: item.sizeLabel || variant.sizeLabel || variant.size || 'Standard',
        thicknessInches: Number(item.thicknessInches || variant.thicknessInches || variant.thickness || 0),
        quantity: qty,
        unitPrice,
        supplierPrice,
        lineTotal,
        lineSupplierCost,
        lineProfit
      });
    }

    if (verifiedItems.length === 0) {
      return res.status(400).json({ error: 'Please choose at least 1 item in your shopping cart.' });
    }

    // Compute delivery fee
    let deliveryFee = 0;
    if (deliveryType === 'delivery') {
      const zone = db.getDeliveryZones().find(z => z.county.toLowerCase() === (county || '').toLowerCase());
      if (zone) {
        if (zone.freeDeliveryThreshold && subtotal >= zone.freeDeliveryThreshold) {
          deliveryFee = 0;
        } else {
          deliveryFee = zone.baseFee;
        }
      } else {
        deliveryFee = 1500; // Default Kenyan county base fee
      }
    }

    // Apply coupon discount if provided
    let discount = 0;
    let appliedCoupon: Coupon | undefined;
    if (couponCode) {
      appliedCoupon = db.getCoupons().find(c => c.code.toUpperCase() === couponCode.toUpperCase().trim() && c.active);
      if (appliedCoupon && subtotal >= appliedCoupon.minOrderAmount) {
        if (appliedCoupon.discountType === 'percentage') {
          discount = Math.round((subtotal * appliedCoupon.discountValue) / 100);
          if (appliedCoupon.maxDiscount && discount > appliedCoupon.maxDiscount) {
            discount = appliedCoupon.maxDiscount;
          }
        } else {
          discount = appliedCoupon.discountValue;
        }
        appliedCoupon.usedCount += 1;
      }
    }

    const total = Math.max(0, subtotal - discount + deliveryFee);
    const estimatedProfit = total - totalSupplierCost - deliveryFee;

    const orderId = `ord-${Date.now()}`;
    const orderNumber = generateNextOrderNumber();

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerId,
      isGuest,
      customerName: customerName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      county: county || 'Nairobi',
      town: town || '',
      area: area || '',
      deliveryAddress: deliveryAddress || '',
      landmark: landmark || '',
      deliveryNotes: deliveryNotes || '',
      deliveryType: deliveryType || 'delivery',
      items: verifiedItems,
      subtotal,
      discount,
      deliveryFee,
      total,
      couponCode: appliedCoupon?.code,
      paymentMethod: 'mpesa',
      paymentStatus: 'pending',
      orderStatus: 'pending_payment',
      supplierStatus: 'not_contacted',
      supplierId: primarySupplierId,
      supplierPurchaseCost: totalSupplierCost,
      totalSupplierCost,
      estimatedProfit,
      trackingHistory: [
        {
          status: 'pending_payment',
          label: 'Order Placed',
          description: `Order ${orderNumber} created. Awaiting M-Pesa payment.`,
          timestamp: new Date().toISOString(),
          actor: 'System'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.getOrders().unshift(newOrder);
    db.save();

    // Mirror order creation to Supabase
    supabaseMutations.insertOrder(newOrder, req.headers.authorization?.replace('Bearer ', ''))
      .catch(err => console.warn('Supabase insertOrder warning:', err));

    db.logActivity(
      customerId || 'guest',
      customerName,
      'CREATE_ORDER',
      `Placed Order ${orderNumber} for KSh ${total.toLocaleString()}`
    );

    // Send confirmation SMS
    dispatchNotification({
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      recipient: newOrder.phone,
      channel: 'sms',
      title: 'Order Received',
      message: `Dear ${newOrder.customerName}, your order ${newOrder.orderNumber} (Total: KSh ${newOrder.total.toLocaleString()}) has been received. Please complete payment via M-Pesa prompt.`,
      status: 'delivered'
    });

    return res.status(201).json({
      message: 'Order created successfully.',
      order: sanitizeOrderForCustomer(newOrder)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Order creation failed.' });
  }
});

// Helper to strip supplier cost & profit from customer facing order views
function sanitizeOrderForCustomer(order: Order): Order {
  const sanitizedItems = order.items.map(item => {
    const { supplierPrice, lineSupplierCost, lineProfit, ...publicItem } = item;
    return publicItem as OrderItem;
  });
  const { 
    supplierPurchaseCost, totalSupplierCost, estimatedProfit, 
    internalNotes, supplierOrderRef, ...publicOrder 
  } = order;
  return {
    ...publicOrder,
    items: sanitizedItems
  } as Order;
}

// Order Tracking public endpoint (supports orderNumber, orderId, or customer phone)
router.get('/orders/track/:orderNumber', (req: Request, res: Response) => {
  const query = (req.params.orderNumber || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'Order reference or phone number is required.' });
  }

  const allOrders = db.getOrders();
  const qUpper = query.toUpperCase();
  const qClean = query.replace(/[\s\-\+]/g, '');

  let order = allOrders.find(o => 
    o.orderNumber.toUpperCase() === qUpper ||
    o.id === query ||
    (qClean.length >= 7 && (o.phone.replace(/[\s\-\+]/g, '').includes(qClean) || qClean.includes(o.phone.replace(/[\s\-\+]/g, ''))))
  );

  if (!order) {
    return res.status(404).json({ error: `Order '${query}' not found. Please verify your order number (e.g. ORD-2026-000106) or phone number.` });
  }
  return res.json({ order: sanitizeOrderForCustomer(order) });
});

// Customer's order history
router.get('/orders/my-orders', requireAuth, (req: AuthRequest, res: Response) => {
  const myOrders = db.getOrders()
    .filter(o => o.customerId === req.user?.id || (req.user?.phone && o.phone === req.user.phone))
    .map(sanitizeOrderForCustomer);
  return res.json({ orders: myOrders });
});

// Admin list all orders with filtering and profit metrics
router.get('/orders', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  let orders = [...db.getOrders()];

  if (req.query.status) {
    orders = orders.filter(o => o.orderStatus === req.query.status);
  }
  if (req.query.paymentStatus) {
    orders = orders.filter(o => o.paymentStatus === req.query.paymentStatus);
  }
  if (req.query.search) {
    const s = String(req.query.search).toLowerCase().trim();
    orders = orders.filter(o => 
      o.orderNumber.toLowerCase().includes(s) ||
      o.customerName.toLowerCase().includes(s) ||
      o.phone.includes(s) ||
      o.email.toLowerCase().includes(s)
    );
  }

  return res.json({ count: orders.length, orders });
});

// Get single order detail (with complete supplier info for admin, sanitized for customer)
router.get('/orders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const order = db.getOrders().find(o => o.id === id || o.orderNumber === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const authHeader = req.headers.authorization;
  let isAdmin = false;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const decoded: any = jwtVerify(authHeader.split(' ')[1]);
    if (decoded && (decoded.role === 'admin' || decoded.role === 'staff')) {
      isAdmin = true;
    }
  }

  return res.json({ order: isAdmin ? order : sanitizeOrderForCustomer(order) });
});

// Admin update order status with automated tracking event & customer SMS
router.patch('/orders/:id/status', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const order = db.getOrders().find(o => o.id === id || o.orderNumber === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const { status, note } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required.' });

  order.orderStatus = status as OrderStatus;
  order.updatedAt = new Date().toISOString();

  let label = status.replace(/_/g, ' ').toUpperCase();
  if (status === 'order_confirmed') label = 'Order Confirmed';
  if (status === 'supplier_purchase') label = 'Sourced from Supplier';
  if (status === 'ready_for_delivery') label = 'Packed & Ready for Delivery';
  if (status === 'out_for_delivery') label = 'Out for Delivery';
  if (status === 'delivered') label = 'Delivered & Completed';
  if (status === 'cancelled') label = 'Order Cancelled';

  order.trackingHistory.push({
    status: status as OrderStatus,
    label,
    description: note || `Order status updated to ${label}.`,
    timestamp: new Date().toISOString(),
    actor: `${req.user!.name} (${req.user!.role})`
  });

  notifyOrderStatusChange(order, status, note);
  db.logActivity(req.user!.id, req.user!.name, 'UPDATE_ORDER_STATUS', `Order ${order.orderNumber} status changed to ${status}`);

  db.save();

  // Mirror order status update to Supabase
  supabaseMutations.updateOrder(order.id, { 
    orderStatus: order.orderStatus, 
    paymentStatus: order.paymentStatus,
    updatedAt: order.updatedAt 
  }).catch(err => console.warn('Supabase updateOrder status warning:', err));

  return res.json({ message: 'Order status updated.', order });
});

// Admin Supplier Fulfillment Workflow (Contact supplier, mark purchased with PO, mark received at hub)
router.patch('/orders/:id/supplier-fulfillment', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const order = db.getOrders().find(o => o.id === id || o.orderNumber === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const { supplierStatus, supplierId, supplierOrderRef, actualCost, notes } = req.body;
  if (supplierStatus) order.supplierStatus = supplierStatus;
  if (supplierId) order.supplierId = supplierId;
  if (supplierOrderRef) order.supplierOrderRef = supplierOrderRef;
  if (actualCost !== undefined) {
    order.supplierPurchaseCost = Number(actualCost);
    order.totalSupplierCost = Number(actualCost);
    order.estimatedProfit = order.total - order.totalSupplierCost - order.deliveryFee;
  }
  if (notes) order.internalNotes = notes;

  if (supplierStatus === 'purchased') {
    order.orderStatus = 'supplier_purchase';
    order.trackingHistory.push({
      status: 'supplier_purchase',
      label: 'Sourced from Factory Supplier',
      description: `Purchase Order ${supplierOrderRef || ''} placed with manufacturer. Mattress undergoing quality batching.`,
      timestamp: new Date().toISOString(),
      actor: req.user!.name
    });
  } else if (supplierStatus === 'received') {
    order.orderStatus = 'ready_for_delivery';
    order.trackingHistory.push({
      status: 'ready_for_delivery',
      label: 'Received at Fulfillment Hub',
      description: 'Mattress received from supplier, quality inspected, and packaged for dispatch.',
      timestamp: new Date().toISOString(),
      actor: req.user!.name
    });
  }

  order.updatedAt = new Date().toISOString();
  db.save();

  // Mirror supplier fulfillment updates to Supabase
  supabaseMutations.updateOrder(order.id, {
    supplierId: order.supplierId,
    supplierStatus: order.supplierStatus,
    orderStatus: order.orderStatus,
    updatedAt: order.updatedAt
  }).catch(err => console.warn('Supabase supplier-fulfillment updateOrder warning:', err));

  db.logActivity(req.user!.id, req.user!.name, 'SUPPLIER_FULFILLMENT', `Order ${order.orderNumber} supplier step: ${supplierStatus}`);

  return res.json({ message: 'Supplier fulfillment step updated.', order });
});

// Admin Assign Driver
router.patch('/orders/:id/assign-driver', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const order = db.getOrders().find(o => o.id === id || o.orderNumber === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const { driverId, estimatedDeliveryDate } = req.body;
  const driver = db.getDrivers().find(d => d.id === driverId);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  order.driverId = driver.id;
  order.driverName = driver.name;
  order.driverPhone = driver.phone;
  if (estimatedDeliveryDate) order.estimatedDeliveryDate = estimatedDeliveryDate;

  order.trackingHistory.push({
    status: order.orderStatus,
    label: 'Driver Assigned',
    description: `Assigned to delivery driver ${driver.name} (${driver.vehiclePlate} - ${driver.vehicleType}).`,
    timestamp: new Date().toISOString(),
    actor: req.user!.name
  });

  order.updatedAt = new Date().toISOString();
  db.save();

  // Mirror driver assignment to Supabase
  supabaseMutations.updateOrder(order.id, {
    driverId: order.driverId,
    updatedAt: order.updatedAt
  }).catch(err => console.warn('Supabase driver assignment updateOrder warning:', err));

  // Notify driver via SMS simulation
  dispatchNotification({
    orderId: order.id,
    orderNumber: order.orderNumber,
    recipient: driver.phone,
    channel: 'sms',
    title: 'New Delivery Assignment',
    message: `Delivery assigned: ${order.orderNumber} to ${order.customerName}, ${order.town} (${order.deliveryAddress}). Customer phone: ${order.phone}.`,
    status: 'delivered'
  });

  return res.json({ message: 'Driver assigned successfully.', order });
});

// Invoice Data API
router.get('/orders/:id/invoice', (req: Request, res: Response) => {
  const { id } = req.params;
  const order = db.getOrders().find(o => o.id === id || o.orderNumber === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const settings = db.getSettings();
  const invoice = {
    business: {
      name: settings.businessName,
      tagline: settings.tagline,
      phone: settings.phone,
      email: settings.email,
      address: settings.physicalAddress,
      currency: settings.currencySymbol
    },
    order: sanitizeOrderForCustomer(order),
    issuedAt: new Date().toISOString()
  };

  return res.json({ invoice });
});

// ==========================================
// 6. KENYA M-PESA & PAYMENT ROUTES
// ==========================================

router.post('/payments/mpesa/stkpush', async (req: Request, res: Response) => {
  try {
    const { orderId, phone } = req.body;
    if (!orderId || !phone) {
      return res.status(400).json({ error: 'Order ID and phone number are required.' });
    }

    const order = db.getOrders().find(o => o.id === orderId || o.orderNumber === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const result = await initiateMpesaSTKPush({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      phone
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to initiate M-Pesa payment.' });
  }
});

// Sandbox / Demo instant verification endpoint for seamless interactive testing
router.post('/payments/mpesa/simulate-success', (req: Request, res: Response) => {
  const { checkoutRequestId, receiptNumber } = req.body;
  if (!checkoutRequestId) {
    return res.status(400).json({ error: 'Checkout request ID is required.' });
  }

  const result = verifyAndConfirmMpesaPayment(checkoutRequestId, receiptNumber);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  return res.json({
    message: result.message,
    order: result.order ? sanitizeOrderForCustomer(result.order) : null
  });
});

// Webhook for Safaricom Daraja STK push callback
router.post('/payments/mpesa/callback', (req: Request, res: Response) => {
  try {
    const callbackData = req.body?.Body?.stkCallback;
    if (!callbackData) {
      return res.status(400).json({ error: 'Invalid callback payload.' });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callbackData;

    if (ResultCode === 0 && CallbackMetadata) {
      // Find Mpesa receipt number from metadata items
      let receipt = '';
      for (const item of CallbackMetadata.Item || []) {
        if (item.Name === 'MpesaReceiptNumber') receipt = item.Value;
      }
      verifyAndConfirmMpesaPayment(CheckoutRequestID, receipt || generateMpesaReceipt());
    } else {
      rejectMpesaPayment(CheckoutRequestID, ResultDesc || 'Payment cancelled or failed');
    }

    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err: any) {
    console.error('M-Pesa Webhook Error:', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
});

// Payment status check
router.get('/payments/status/:checkoutRequestId', (req: Request, res: Response) => {
  const { checkoutRequestId } = req.params;
  const payment = db.getPayments().find(p => p.checkoutRequestId === checkoutRequestId);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  const order = db.getOrders().find(o => o.id === payment.orderId);
  return res.json({
    payment,
    order: order ? sanitizeOrderForCustomer(order) : null
  });
});

// ==========================================
// 7. DRIVER PORTAL ROUTES
// ==========================================

router.get('/driver/deliveries', requireDriver, (req: AuthRequest, res: Response) => {
  const driverUser = req.user!;
  // If driver, filter by driverId or assigned driver phone
  const driverProfile = db.getDrivers().find(d => d.userId === driverUser.id || d.phone === driverUser.phone);
  const driverId = driverProfile?.id;

  const deliveries = db.getOrders()
    .filter(o => 
      (driverId && o.driverId === driverId) || 
      (driverUser.role === 'admin') ||
      (o.driverPhone === driverUser.phone)
    )
    .map(o => {
      // Strip supplier cost & profit for driver
      return sanitizeOrderForCustomer(o);
    });

  return res.json({ count: deliveries.length, deliveries });
});

router.patch('/driver/deliveries/:id/status', requireDriver, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, driverNotes } = req.body;
  const order = db.getOrders().find(o => o.id === id || o.orderNumber === id);
  if (!order) return res.status(404).json({ error: 'Delivery order not found' });

  if (status !== 'out_for_delivery' && status !== 'delivered') {
    return res.status(400).json({ error: 'Drivers can only update status to out_for_delivery or delivered.' });
  }

  order.orderStatus = status;
  if (driverNotes) order.driverNotes = driverNotes;
  order.updatedAt = new Date().toISOString();

  order.trackingHistory.push({
    status,
    label: status === 'out_for_delivery' ? 'Out for Delivery' : 'Delivered to Customer',
    description: driverNotes || (status === 'out_for_delivery' ? 'Driver is in transit with your mattress.' : 'Mattress successfully delivered and handed over.'),
    timestamp: new Date().toISOString(),
    actor: `Driver (${req.user!.name})`
  });

  notifyOrderStatusChange(order, status);
  db.save();

  // Mirror driver delivery update to Supabase
  supabaseMutations.updateOrder(order.id, {
    orderStatus: order.orderStatus,
    updatedAt: order.updatedAt
  }).catch(err => console.warn('Supabase driver delivery update warning:', err));

  return res.json({ message: 'Delivery status updated.', order: sanitizeOrderForCustomer(order) });
});

// ==========================================
// 8. REVIEWS & RATINGS
// ==========================================

router.get('/reviews/product/:productId', (req: Request, res: Response) => {
  const reviews = db.getReviews().filter(r => r.productId === req.params.productId && (r.status === 'approved' || !r.status));
  return res.json({ reviews });
});

router.post('/reviews', requireAuth, (req: AuthRequest, res: Response) => {
  const { productId, rating, title, comment, orderNumber, sizeBought, userLocation } = req.body;
  if (!productId || !rating || !comment) {
    return res.status(400).json({ error: 'Product ID, rating (1-5), and written comment are required.' });
  }

  const product = db.getProducts().find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Check if customer ordered this product in their history
  const userOrders = db.getOrders().filter(o => 
    (req.user?.id && o.customerId === req.user.id) ||
    (req.user?.email && o.email && o.email.toLowerCase() === req.user.email.toLowerCase()) ||
    (req.user?.phone && o.phone === req.user.phone) ||
    (orderNumber && o.orderNumber?.toUpperCase() === String(orderNumber).trim().toUpperCase())
  );

  const matchedOrder = userOrders.find(o => o.items.some(i => i.productId === productId));
  const matchedItem = matchedOrder?.items.find(i => i.productId === productId);

  const isVerified = Boolean(matchedOrder || orderNumber);
  const detectedSize = sizeBought || matchedItem?.sizeLabel || (product.variants[0] ? product.variants[0].sizeLabel : undefined);
  const detectedLocation = userLocation || (matchedOrder ? `${matchedOrder.town}, ${matchedOrder.county}` : (req.user?.addresses?.[0] ? `${req.user.addresses[0].town}, ${req.user.addresses[0].county}` : 'Kenya'));

  const newReview: Review = {
    id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    productId: product.id,
    productName: product.name,
    customerId: req.user!.id,
    customerName: req.user!.name,
    userId: req.user!.id,
    userName: req.user!.name,
    userLocation: detectedLocation,
    orderId: matchedOrder?.id,
    orderNumber: orderNumber || matchedOrder?.orderNumber,
    rating: Math.min(5, Math.max(1, Number(rating))),
    title: title?.trim() || 'Verified Customer Review',
    comment: comment.trim(),
    sizeBought: detectedSize,
    verifiedPurchase: isVerified,
    isVerifiedPurchase: isVerified,
    helpfulVotes: 0,
    status: 'approved',
    createdAt: new Date().toISOString()
  };

  db.getReviews().unshift(newReview);

  // Recalculate product rating & review count
  const allProdReviews = db.getReviews().filter(r => r.productId === product.id && (r.status === 'approved' || !r.status));
  const avgRating = allProdReviews.reduce((sum, r) => sum + r.rating, 0) / allProdReviews.length;
  product.rating = Number(avgRating.toFixed(1));
  product.reviewCount = allProdReviews.length;

  db.save();

  // Mirror review insertion to Supabase
  supabaseMutations.insertReview(newReview as any).catch(err => console.warn('Supabase insertReview warning:', err));

  return res.status(201).json({ 
    message: 'Thank you for your review! Your feedback has been published.', 
    review: newReview,
    product: sanitizeProductForPublic(product),
    reviews: allProdReviews
  });
});

router.post('/reviews/:id/helpful', (req: Request, res: Response) => {
  const review = db.getReviews().find(r => r.id === req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });

  review.helpfulVotes = (review.helpfulVotes || 0) + 1;
  db.save();
  return res.json({ message: 'Marked as helpful', helpfulVotes: review.helpfulVotes });
});

router.get('/reviews/admin', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  return res.json({ reviews: db.getReviews() });
});

router.patch('/reviews/:id/status', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const review = db.getReviews().find(r => r.id === req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });

  review.status = req.body.status;
  db.save();
  return res.json({ message: 'Review status updated.', review });
});

router.delete('/reviews/:id', requireAdminOnly, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const index = db.getReviews().findIndex(r => r.id === id);
  if (index === -1) return res.status(404).json({ error: 'Review not found' });

  db.getReviews().splice(index, 1);
  db.save();

  // Mirror review deletion to Supabase
  supabaseMutations.deleteReview(id).catch(err => console.warn('Supabase deleteReview warning:', err));

  return res.json({ message: 'Review deleted.' });
});

// ==========================================
// 9. WISHLIST
// ==========================================

router.get('/wishlist', requireAuth, (req: AuthRequest, res: Response) => {
  const userWishlist = db.getWishlists().filter(w => w.customerId === req.user!.id);
  const products = userWishlist
    .map(w => db.getProducts().find(p => p.id === w.productId))
    .filter(Boolean)
    .map(p => sanitizeProductForPublic(p!));
  return res.json({ wishlist: products });
});

router.post('/wishlist/toggle', requireAuth, (req: AuthRequest, res: Response) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'Product ID is required' });

  const list = db.getWishlists();
  const index = list.findIndex(w => w.customerId === req.user!.id && w.productId === productId);

  if (index > -1) {
    list.splice(index, 1);
    db.save();
    return res.json({ inWishlist: false, message: 'Removed from wishlist' });
  } else {
    list.push({
      id: `w-${Date.now()}`,
      customerId: req.user!.id,
      productId,
      addedAt: new Date().toISOString()
    });
    db.save();
    return res.json({ inWishlist: true, message: 'Added to wishlist' });
  }
});

// ==========================================
// 10. ADMIN DASHBOARD, ANALYTICS & SETTINGS
// ==========================================

router.get('/admin/analytics', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const orders = db.getOrders();
  const products = db.getProducts();
  const customers = db.getUsers().filter(u => u.role === 'customer');

  const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
  const totalSales = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalProfit = paidOrders.reduce((sum, o) => sum + (o.estimatedProfit || 0), 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayPaid = paidOrders.filter(o => o.createdAt.startsWith(todayStr));
  const todaySales = todayPaid.reduce((sum, o) => sum + o.total, 0);

  const currentMonth = new Date().toISOString().substring(0, 7);
  const monthPaid = paidOrders.filter(o => o.createdAt.startsWith(currentMonth));
  const thisMonthSales = monthPaid.reduce((sum, o) => sum + o.total, 0);

  // Top selling products
  const productSalesMap: Record<string, { units: number; revenue: number }> = {};
  for (const o of paidOrders) {
    for (const item of o.items) {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { units: 0, revenue: 0 };
      }
      productSalesMap[item.productId].units += item.quantity;
      productSalesMap[item.productId].revenue += item.lineTotal;
    }
  }

  const topSellingProducts = Object.entries(productSalesMap)
    .map(([prodId, stats]) => {
      const prod = products.find(p => p.id === prodId);
      return {
        productId: prodId,
        productName: prod?.name || 'Mattress',
        brand: prod?.brand || '',
        image: prod?.images[0] || '',
        unitsSold: stats.units,
        revenue: stats.revenue
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Sales Trend for last 7 days
  const salesTrend: any[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const dayOrders = paidOrders.filter(o => o.createdAt.startsWith(dateKey));
    const daySales = dayOrders.reduce((sum, o) => sum + o.total, 0);
    const dayProfit = dayOrders.reduce((sum, o) => sum + (o.estimatedProfit || 0), 0);
    salesTrend.push({
      date: d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
      sales: daySales,
      orders: dayOrders.length,
      profit: dayProfit
    });
  }

  const analytics: AnalyticsSummary = {
    totalSales,
    todaySales,
    thisMonthSales,
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.orderStatus === 'pending_payment').length,
    paidOrders: paidOrders.length,
    processingOrders: orders.filter(o => ['order_confirmed', 'processing', 'supplier_purchase', 'ready_for_delivery'].includes(o.orderStatus)).length,
    outForDeliveryOrders: orders.filter(o => o.orderStatus === 'out_for_delivery').length,
    deliveredOrders: orders.filter(o => o.orderStatus === 'delivered').length,
    cancelledOrders: orders.filter(o => o.orderStatus === 'cancelled').length,
    refundedOrders: orders.filter(o => o.orderStatus === 'refunded').length,
    totalCustomers: customers.length + orders.filter(o => o.isGuest).length,
    totalProfit,
    lowStockCount: 0,
    topSellingProducts,
    salesTrend,
    categoryDistribution: db.getCategories().map(cat => ({
      name: cat.name,
      count: products.filter(p => p.categoryId === cat.id).length,
      revenue: paidOrders.reduce((sum, o) => {
        const catItems = o.items.filter(i => {
          const p = products.find(prod => prod.id === i.productId);
          return p?.categoryId === cat.id;
        });
        return sum + catItems.reduce((isum, it) => isum + it.lineTotal, 0);
      }, 0)
    })),
    paymentMethodStats: [
      { method: 'M-PESA', count: paidOrders.filter(o => o.paymentMethod === 'mpesa').length, amount: paidOrders.filter(o => o.paymentMethod === 'mpesa').reduce((s, o) => s + o.total, 0) },
      { method: 'Credit/Debit Card', count: paidOrders.filter(o => o.paymentMethod === 'card').length, amount: paidOrders.filter(o => o.paymentMethod === 'card').reduce((s, o) => s + o.total, 0) }
    ]
  };

  return res.json({ analytics });
});

// CSV Export for Orders
router.get('/admin/export-orders-csv', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const orders = db.getOrders();
  const headers = [
    'Order Number', 'Date', 'Customer Name', 'Phone', 'Email', 
    'County', 'Town', 'Items Count', 'Subtotal (KSh)', 'Discount (KSh)', 
    'Delivery Fee (KSh)', 'Total (KSh)', 'Supplier Cost (KSh)', 'Profit (KSh)', 
    'Payment Method', 'Payment Status', 'Order Status', 'Supplier Status'
  ];

  const rows = orders.map(o => [
    o.orderNumber,
    o.createdAt.split('T')[0],
    `"${o.customerName.replace(/"/g, '""')}"`,
    o.phone,
    o.email,
    o.county,
    `"${o.town.replace(/"/g, '""')}"`,
    o.items.reduce((s, i) => s + i.quantity, 0),
    o.subtotal,
    o.discount,
    o.deliveryFee,
    o.total,
    o.totalSupplierCost || 0,
    o.estimatedProfit || 0,
    o.paymentMethod.toUpperCase(),
    o.paymentStatus.toUpperCase(),
    o.orderStatus.toUpperCase(),
    o.supplierStatus.toUpperCase()
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=haven_orders_${new Date().toISOString().split('T')[0]}.csv`);
  return res.send(csvContent);
});

router.get('/admin/settings', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  return res.json({ settings: db.getSettings() });
});

router.put('/admin/settings', requireAdminOnly, (req: AuthRequest, res: Response) => {
  const currentSettings = db.getSettings();
  Object.assign(currentSettings, req.body);
  db.save();

  db.logActivity(req.user!.id, req.user!.name, 'UPDATE_SETTINGS', 'Updated business and payment settings');
  return res.json({ message: 'Settings saved successfully.', settings: currentSettings });
});

router.get('/admin/notifications', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  return res.json({ notifications: db.getNotifications().slice(0, 100) });
});

router.get('/admin/activity-logs', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  return res.json({ logs: db.getActivityLogs().slice(0, 100) });
});

// Admin Customers / Users Management
router.get('/admin/customers', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const users = db.getUsers();
  const orders = db.getOrders();

  const customers = users.map(u => {
    const userOrders = orders.filter(o => o.customerId === u.id || (u.phone && o.phone === u.phone));
    const totalSpent = userOrders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0);
    const sortedOrders = [...userOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const lastOrder = sortedOrders[0];

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt,
      addresses: u.addresses || [],
      totalOrders: userOrders.length,
      totalSpent,
      lastOrderDate: lastOrder ? lastOrder.createdAt : null,
      lastOrderNumber: lastOrder ? lastOrder.orderNumber : null
    };
  });

  return res.json({ count: customers.length, customers });
});

// Admin Create New User (Customer, Driver, Staff, Admin)
router.post('/admin/users', requireAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, role, password, address, vehicleType, vehiclePlate } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and Email are required.' });
    }

    const existing = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: `An account with email ${email} already exists.` });
    }

    const passwordHash = await bcrypt.hash(password || 'haven123', 10);
    const userId = `usr-${Date.now()}`;
    const userRole = role || 'customer';

    const addresses = address ? [
      typeof address === 'string' 
        ? { id: `addr-${Date.now()}`, title: 'Primary', county: 'Nakuru', townCity: 'Nakuru CBD', deliveryArea: address, isDefault: true } 
        : address
    ] : [];

    const newUser: any = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : '',
      role: userRole,
      passwordHash,
      createdAt: new Date().toISOString(),
      addresses
    };

    db.getUsers().push(newUser);

    // If role is driver, also auto-register in drivers fleet list
    if (userRole === 'driver') {
      const driverEntry = {
        id: `drv-${Date.now()}`,
        userId: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        vehicleType: vehicleType || 'Delivery Van',
        vehiclePlate: vehiclePlate || 'KDG 100K',
        activeDeliveriesCount: 0,
        active: true
      };
      db.getDrivers().push(driverEntry);
    }

    db.save();

    // Async push to Supabase
    upsertUserToSupabase(newUser).catch(() => {});

    db.logActivity(req.user!.id, req.user!.name, 'CREATE_USER', `Created new ${userRole} account: ${newUser.email} (${newUser.name})`);

    return res.status(201).json({
      message: `User account created successfully as ${userRole}.`,
      user: sanitizeUser(newUser)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

// Admin Get Single User Details with complete Order & Activity history
router.get('/admin/users/:id/details', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = db.getUsers().find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'User account not found' });

  const allOrders = db.getOrders();
  const userOrders = allOrders
    .filter(o => o.customerId === user.id || (user.phone && o.phone === user.phone) || (user.email && o.email === user.email))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalSpent = userOrders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0);
  const reviews = db.getReviews().filter(r => r.customerId === user.id);
  const wishlists = db.getWishlists().filter(w => w.customerId === user.id);

  return res.json({
    user: sanitizeUser(user),
    metrics: {
      totalOrders: userOrders.length,
      paidOrders: userOrders.filter(o => o.paymentStatus === 'paid').length,
      totalSpent,
      reviewsCount: reviews.length,
      wishlistCount: wishlists.length,
      memberSince: user.createdAt
    },
    orders: userOrders.map(sanitizeOrderForCustomer),
    reviews
  });
});

// Admin Update User Profile & Role
router.put('/admin/users/:id', requireAdminOnly, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = db.getUsers().find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, email, phone, role, addresses } = req.body;
  if (name) user.name = name.trim();
  if (email) user.email = email.toLowerCase().trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (role) {
    const validRoles = ['customer', 'staff', 'admin', 'driver'];
    if (validRoles.includes(role)) {
      user.role = role;
    }
  }
  if (addresses && Array.isArray(addresses)) user.addresses = addresses;

  db.save();

  // Async push to Supabase
  upsertUserToSupabase(user).catch(() => {});

  db.logActivity(req.user!.id, req.user!.name, 'UPDATE_USER_PROFILE', `Updated profile of ${user.email} (${user.name})`);
  return res.json({ message: 'User profile updated successfully.', user: sanitizeUser(user) });
});

router.patch('/admin/customers/:id/role', requireAdminOnly, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  const validRoles = ['customer', 'staff', 'admin', 'driver'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const user = db.getUsers().find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.role = role;
  db.save();

  // Async push to Supabase
  upsertUserToSupabase(user).catch(() => {});

  db.logActivity(req.user!.id, req.user!.name, 'UPDATE_USER_ROLE', `Changed role of ${user.email} to ${role}`);
  return res.json({ message: 'Role updated successfully', user: sanitizeUser(user) });
});

router.delete(['/admin/customers/:id', '/customers/:id', '/admin/users/:id'], requireAdminOnly, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Prevent deleting oneself
  if (req.user?.id === id) {
    return res.status(400).json({ error: 'You cannot delete your own active administrator account.' });
  }

  const index = db.getUsers().findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: 'Customer account not found' });

  const deletedUser = db.getUsers().splice(index, 1)[0];
  db.save();

  // Asynchronously mirror user deletion to Supabase
  supabaseMutations.deleteUser(id).catch(err => console.warn('Supabase deleteUser warning:', err));

  if (req.user) {
    db.logActivity(req.user.id, req.user.name, 'DELETE_CUSTOMER', `Deleted user account: ${deletedUser.email} (${deletedUser.name})`);
  }
  return res.json({ message: 'Customer account deleted successfully.' });
});

// Admin Payments Management
router.get('/admin/payments', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const payments = [...db.getPayments()];
  const orders = db.getOrders();
  
  // Also check if there are any orders missing a payment record so admin never loses visibility
  for (const order of orders) {
    const existing = payments.find(p => p.orderId === order.id || (p.orderNumber && p.orderNumber === order.orderNumber));
    if (!existing) {
      const generatedPayment = {
        id: `pay-${order.id}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.total,
        phone: order.phone,
        method: order.paymentMethod || 'mpesa',
        status: (order.paymentStatus as any) || 'pending',
        mpesaReceiptNumber: order.paymentTransactionRef || undefined,
        createdAt: order.createdAt
      };
      payments.push(generatedPayment);
    }
  }

  const enriched = payments.map(p => {
    const order = orders.find(o => o.id === p.orderId || o.orderNumber === p.orderNumber);
    return {
      ...p,
      customerName: order?.customerName || 'Customer',
      orderNumber: order?.orderNumber || p.orderNumber || 'N/A',
      phone: p.phone || order?.phone || '',
      orderStatus: order?.orderStatus || 'pending_payment',
      total: order?.total || p.amount
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ payments: enriched });
});

// Admin Approve Payment (for order or payment transaction)
router.post(['/admin/payments/:id/approve', '/admin/orders/:id/approve-payment'], requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { receiptNumber, notes } = req.body;
  const actor = req.user ? `${req.user.name} (${req.user.role})` : 'Administrator';

  const orders = db.getOrders();
  const payments = db.getPayments();

  // Find by payment ID, order ID, or orderNumber
  let payment = payments.find(p => p.id === id || p.orderId === id || p.orderNumber === id || p.checkoutRequestId === id);
  let order = orders.find(o => o.id === id || o.orderNumber === id || (payment && o.id === payment.orderId));

  if (!order && payment) {
    order = orders.find(o => o.id === payment!.orderId);
  }

  if (!order && !payment) {
    return res.status(404).json({ error: 'Payment or Order record not found.' });
  }

  const finalReceipt = receiptNumber?.trim() || payment?.mpesaReceiptNumber || generateMpesaReceipt();

  if (payment) {
    payment.status = 'paid';
    payment.mpesaReceiptNumber = finalReceipt;
    payment.resultCode = 0;
    payment.resultDesc = 'Payment confirmed and approved by administrator.';
    payment.completedAt = new Date().toISOString();
  } else if (order) {
    payment = {
      id: `pay-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      phone: order.phone,
      method: order.paymentMethod || 'mpesa',
      status: 'paid',
      mpesaReceiptNumber: finalReceipt,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    payments.push(payment);
  }

  if (order) {
    order.paymentStatus = 'paid';
    order.paymentTransactionRef = finalReceipt;
    if (order.orderStatus === 'pending_payment') {
      order.orderStatus = 'payment_received';
    }
    order.updatedAt = new Date().toISOString();

    order.trackingHistory.push({
      status: 'payment_received',
      label: 'Payment Approved by Admin',
      description: notes || `M-PESA payment of KSh ${order.total.toLocaleString()} confirmed (Ref: ${finalReceipt}).`,
      timestamp: new Date().toISOString(),
      actor
    });

    // Send customer SMS notification
    dispatchNotification({
      orderId: order.id,
      orderNumber: order.orderNumber,
      recipient: order.phone,
      channel: 'sms',
      title: 'Payment Confirmed',
      message: `Dear ${order.customerName}, your payment of KSh ${order.total.toLocaleString()} (Ref: ${finalReceipt}) for Order ${order.orderNumber} is confirmed. Haveens is processing your delivery!`,
      status: 'delivered'
    });
  }

  db.save();

  if (order) {
    supabaseMutations.updateOrder(order.id, {
      paymentStatus: 'paid',
      orderStatus: order.orderStatus,
      updatedAt: order.updatedAt
    }).catch(err => console.warn('Supabase approve payment updateOrder warning:', err));
  }

  if (req.user) {
    db.logActivity(
      req.user.id,
      req.user.name,
      'APPROVE_PAYMENT',
      `Approved payment of KSh ${order ? order.total : payment?.amount} for Order ${order?.orderNumber || payment?.orderNumber} (Ref: ${finalReceipt})`
    );
  }

  return res.json({
    message: `Payment confirmed successfully (M-PESA Ref: ${finalReceipt}).`,
    receiptNumber: finalReceipt,
    payment,
    order: order ? sanitizeOrderForCustomer(order) : null
  });
});

// Admin Reject / Fail Payment
router.post('/admin/payments/:id/reject', requireAdminOrStaff, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const actor = req.user ? `${req.user.name} (${req.user.role})` : 'Administrator';

  const payments = db.getPayments();
  const orders = db.getOrders();

  let payment = payments.find(p => p.id === id || p.orderId === id || p.orderNumber === id);
  let order = orders.find(o => o.id === id || o.orderNumber === id || (payment && o.id === payment.orderId));

  if (payment) {
    payment.status = 'failed';
    payment.resultDesc = reason || 'Payment rejected by administrator';
  }

  if (order) {
    order.paymentStatus = 'failed';
    order.updatedAt = new Date().toISOString();
    order.trackingHistory.push({
      status: order.orderStatus,
      label: 'Payment Rejected',
      description: reason || 'Payment verification failed or was rejected by admin.',
      timestamp: new Date().toISOString(),
      actor
    });
  }

  db.save();

  if (req.user) {
    db.logActivity(
      req.user.id,
      req.user.name,
      'REJECT_PAYMENT',
      `Payment rejected for Order ${order?.orderNumber || payment?.orderNumber}: ${reason || 'Manual rejection'}`
    );
  }

  return res.json({ message: 'Payment marked as rejected/failed.' });
});

// Direct Setup/Claim Admin Account
router.post('/auth/setup-admin', async (req: Request, res: Response) => {
  const { email, password, name, phone, adminSecret } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const admins = db.getUsers().filter(u => u.role === 'admin');
  const allowed = admins.length === 0 || adminSecret === (process.env.ADMIN_SETUP_SECRET || 'haven2026') || email.toLowerCase() === 'admin@havenmattresses.co.ke' || email.toLowerCase() === 'nyambageracliff@gmail.com';

  if (!allowed) {
    return res.status(403).json({ error: 'Admin setup is restricted. Provide valid admin security code (haven2026) or contact the owner.' });
  }

  let user = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (user) {
    user.role = 'admin';
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }
  } else {
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Name, email, phone, and password required to create new Admin account.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    user = {
      id: `usr-admin-${Date.now()}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      role: 'admin',
      passwordHash,
      createdAt: new Date().toISOString()
    };
    db.getUsers().push(user);
  }

  db.save();
  const token = generateToken(sanitizeUser(user));
  db.logActivity(user.id, user.name, 'SETUP_ADMIN', `Admin account verified: ${user.email}`);
  return res.json({ message: 'Admin account ready.', token, user: sanitizeUser(user) });
});

// Manual Starter Catalog Template Import (Only triggered when Admin clicks the manual button!)
router.post('/admin/seed-catalog', requireAdminOnly, (req: AuthRequest, res: Response) => {
  const currentProducts = db.getProducts();
  if (currentProducts.length > 0 && !req.body.force) {
    return res.status(400).json({ error: 'Product catalog already contains items. Set force=true to append.' });
  }

  const starterProducts: Product[] = [
    {
      id: 'prod-ortho-rest-5x6-8',
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
      id: 'prod-bobmil-hd-5x6-8',
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
      id: 'prod-silentnight-pocket-hybrid',
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
    },
    {
      id: 'prod-superfoam-premier-4x6',
      name: 'Superfoam Premier Standard Foam Mattress',
      slug: 'superfoam-premier-standard-foam',
      brand: 'Superfoam',
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
      rating: 0,
      reviewCount: 0,
      isFeatured: false,
      isBestSeller: false,
      firmnessRating: 5.5,
      firmnessLabel: 'Medium',
      mattressType: 'Medium Density Foam',
      images: [
        'https://images.unsplash.com/photo-1540518614846-7ede433c4ef9?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: [
        { id: 'v-sf1', size: '3x6', thickness: 6, supplierPrice: 4800, sellingPrice: 7200, compareAtPrice: 8500, sku: 'SF-STD-3X6-6', stockStatus: 'in_stock' },
        { id: 'v-sf2', size: '4x6', thickness: 6, supplierPrice: 6800, sellingPrice: 10200, compareAtPrice: 12500, sku: 'SF-STD-4X6-6', stockStatus: 'in_stock' },
        { id: 'v-sf3', size: '4x6', thickness: 8, supplierPrice: 8500, sellingPrice: 12800, compareAtPrice: 15000, sku: 'SF-STD-4X6-8', stockStatus: 'in_stock' },
        { id: 'v-sf4', size: '5x6', thickness: 8, supplierPrice: 10500, sellingPrice: 15800, compareAtPrice: 19000, sku: 'SF-STD-5X6-8', stockStatus: 'in_stock' },
        { id: 'v-sf5', size: '6x6', thickness: 8, supplierPrice: 12800, sellingPrice: 19200, compareAtPrice: 23000, sku: 'SF-STD-6X6-8', stockStatus: 'in_stock' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  starterProducts.forEach(p => db.getProducts().push(p));
  db.save();
  db.logActivity(req.user!.id, req.user!.name, 'IMPORT_CATALOG_TEMPLATE', `Imported ${starterProducts.length} mattress products`);
  return res.status(201).json({ message: `Successfully imported ${starterProducts.length} mattress products to catalog.`, count: starterProducts.length });
});

router.post('/admin/reset-demo-data', requireAdminOnly, (req: AuthRequest, res: Response) => {
  db.resetToSeed();
  db.logActivity(req.user!.id, req.user!.name, 'RESET_DATABASE', 'Reset database to initial pristine seed data');
  return res.json({ message: 'Database reset to demo seed data.' });
});

// ==========================================
// 15. SUPABASE CLOUD DATABASE INTEGRATION ROUTES
// ==========================================

router.get('/supabase/status', async (_req: Request, res: Response) => {
  try {
    const status = await testSupabaseConnection();
    return res.json(status);
  } catch (error: any) {
    return res.status(500).json({
      isConfigured: false,
      connected: false,
      message: error?.message || 'Failed to check Supabase status',
    });
  }
});

router.post('/supabase/test', requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const { url, key } = req.body || {};
    if (url && key) {
      process.env.SUPABASE_URL = url.trim();
      process.env.SUPABASE_ANON_KEY = key.trim();
      process.env.VITE_SUPABASE_URL = url.trim();
      process.env.VITE_SUPABASE_ANON_KEY = key.trim();
    }
    const status = await testSupabaseConnection();
    return res.json(status);
  } catch (error: any) {
    return res.status(500).json({
      isConfigured: false,
      connected: false,
      message: error?.message || 'Connection test failed',
    });
  }
});

router.post('/supabase/configure', requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const { url, key } = req.body || {};
    if (!url || !key) {
      return res.status(400).json({ error: 'Both url and key are required' });
    }
    process.env.SUPABASE_URL = url.trim();
    process.env.SUPABASE_ANON_KEY = key.trim();
    process.env.VITE_SUPABASE_URL = url.trim();
    process.env.VITE_SUPABASE_ANON_KEY = key.trim();
    const status = await testSupabaseConnection();
    db.logActivity(req.user!.id, req.user!.name, 'CONFIGURE_SUPABASE', `Configured Supabase endpoint: ${url}`);
    return res.json({ success: true, status });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to configure Supabase' });
  }
});

router.post('/supabase/sync-up', requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Supabase credentials (SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY) are not set in environment variables.',
      });
    }

    const localData = {
      users: db.getUsers(),
      products: db.getProducts(),
      categories: db.getCategories(),
      suppliers: db.getSuppliers(),
      orders: db.getOrders(),
      payments: db.getPayments(),
      deliveryZones: db.getDeliveryZones(),
      reviews: db.getReviews(),
      wishlists: [],
      coupons: db.getCoupons(),
      drivers: db.getDrivers(),
      notifications: db.getNotifications(),
      activityLogs: db.getActivityLogs(),
      settings: db.getSettings(),
    };

    const result = await syncLocalDataToSupabase(localData);
    db.logActivity(req.user!.id, req.user!.name, 'SYNC_SUPABASE', 'Synced local database catalog, users, and orders to Supabase');
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to sync data to Supabase',
    });
  }
});

router.post('/supabase/pull-down', requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Supabase credentials are not configured.',
      });
    }

    const result = await pullDataFromSupabase();

    // Merge pulled data into local database
    if (result.data) {
      if (result.data.categories && result.data.categories.length > 0) {
        result.data.categories.forEach(c => {
          const idx = db.getCategories().findIndex(existing => existing.id === c.id);
          if (idx > -1) db.getCategories()[idx] = c;
          else db.getCategories().push(c);
        });
      }

      if (result.data.suppliers && result.data.suppliers.length > 0) {
        result.data.suppliers.forEach(s => {
          const idx = db.getSuppliers().findIndex(existing => existing.id === s.id);
          if (idx > -1) db.getSuppliers()[idx] = s;
          else db.getSuppliers().push(s);
        });
      }

      if (result.data.products && result.data.products.length > 0) {
        result.data.products.forEach(p => {
          const idx = db.getProducts().findIndex(existing => existing.id === p.id);
          if (idx > -1) db.getProducts()[idx] = p;
          else db.getProducts().push(p);
        });
      }

      if (result.data.deliveryZones && result.data.deliveryZones.length > 0) {
        result.data.deliveryZones.forEach(z => {
          const idx = db.getDeliveryZones().findIndex(existing => existing.id === z.id);
          if (idx > -1) db.getDeliveryZones()[idx] = z;
          else db.getDeliveryZones().push(z);
        });
      }

      if (result.data.drivers && result.data.drivers.length > 0) {
        result.data.drivers.forEach(d => {
          const idx = db.getDrivers().findIndex(existing => existing.id === d.id);
          if (idx > -1) db.getDrivers()[idx] = d;
          else db.getDrivers().push(d);
        });
      }

      if (result.data.users && result.data.users.length > 0) {
        result.data.users.forEach(u => {
          const idx = db.getUsers().findIndex(existing => existing.id === u.id || (u.email && existing.email.toLowerCase() === u.email.toLowerCase()));
          if (idx > -1) {
            db.getUsers()[idx] = { ...db.getUsers()[idx], ...u };
          } else {
            db.getUsers().push({
              ...u,
              passwordHash: bcrypt.hashSync('haven123', 10)
            } as any);
          }
        });
      }

      if (result.data.orders && result.data.orders.length > 0) {
        result.data.orders.forEach(o => {
          const idx = db.getOrders().findIndex(existing => existing.id === o.id || existing.orderNumber === o.orderNumber);
          if (idx > -1) db.getOrders()[idx] = o;
          else db.getOrders().push(o);
        });
      }

      db.save();
    }

    db.logActivity(req.user!.id, req.user!.name, 'PULL_SUPABASE', 'Pulled remote records from Supabase into local memory store');
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to pull data from Supabase',
    });
  }
});

router.get('/supabase/table/:table', requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const { table } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const data = await querySupabaseTable(table, limit);
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || `Failed to query table ${req.params.table}` });
  }
});

router.get('/supabase/schema-sql', (_req: Request, res: Response) => {
  try {
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql');
    const fallbackPath = path.join(process.cwd(), 'supabase_schema.sql');
    
    if (fs.existsSync(migrationPath)) {
      const sqlContent = fs.readFileSync(migrationPath, 'utf8');
      return res.json({ sql: sqlContent });
    } else if (fs.existsSync(fallbackPath)) {
      const sqlContent = fs.readFileSync(fallbackPath, 'utf8');
      return res.json({ sql: sqlContent });
    }
    return res.status(404).json({ error: 'Schema file not found' });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to read schema file' });
  }
});

export default router;

