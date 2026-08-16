import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseSchema } from './db.js';
import { Product, Order, Supplier, Driver, DeliveryZone, Coupon, Review, User } from '../src/types.js';
import dotenv from 'dotenv';

dotenv.config();

let supabaseClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.trim().length > 0 && key.trim().length > 0 && !url.includes('YOUR_SUPABASE'));
}

export function getSupabaseClient(userToken?: string): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  // If a user token is provided and no service_role key is used, authenticate client with user token
  if (userToken && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
    });
  }

  if (!supabaseClient || cachedUrl !== url || cachedKey !== key) {
    if (url && key) {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      cachedUrl = url;
      cachedKey = key;
    }
  }
  return supabaseClient;
}

export interface SupabaseStatusResult {
  isConfigured: boolean;
  connected: boolean;
  url: string;
  configuredKeyType: 'service_role' | 'anon' | 'none';
  tablesDetected: string[];
  message: string;
  error?: string;
}

export async function testSupabaseConnection(): Promise<SupabaseStatusResult> {
  const isConfig = isSupabaseConfigured();
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasAnonKey = Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const keyType = hasServiceKey ? 'service_role' : hasAnonKey ? 'anon' : 'none';

  if (!isConfig) {
    return {
      isConfigured: false,
      connected: false,
      url: url ? url : 'Not set',
      configuredKeyType: keyType,
      tablesDetected: [],
      message: 'Supabase credentials are not configured yet. Add SUPABASE_URL and SUPABASE_ANON_KEY to your environment variables.',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      isConfigured: true,
      connected: false,
      url,
      configuredKeyType: keyType,
      tablesDetected: [],
      message: 'Failed to initialize Supabase client.',
    };
  }

  try {
    const detectedTables: string[] = [];
    const checkTables = ['categories', 'products', 'product_variants', 'suppliers', 'drivers', 'orders', 'order_items', 'delivery_zones', 'coupons', 'reviews', 'users', 'profiles', 'payments'];

    for (const table of checkTables) {
      try {
        const { error } = await client.from(table).select('*').limit(1);
        if (!error) {
          detectedTables.push(table);
        }
      } catch {
        // Table may not exist yet
      }
    }

    return {
      isConfigured: true,
      connected: true,
      url,
      configuredKeyType: keyType,
      tablesDetected: detectedTables,
      message: detectedTables.length > 0 
        ? `Connected to Supabase successfully (${detectedTables.length} tables active: ${detectedTables.join(', ')}).`
        : 'Connected to Supabase endpoint, but SQL tables have not been created yet. Run the SQL schema in Supabase SQL Editor.',
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      connected: false,
      url,
      configuredKeyType: keyType,
      tablesDetected: [],
      message: `Connection test failed: ${err?.message || 'Unknown error'}`,
      error: err?.message,
    };
  }
}

// ============================================================================
// REAL-TIME SUPABASE MUTATIONS ENGINE (CREATES, UPDATES, DELETES)
// ============================================================================

export const supabaseMutations = {
  /**
   * Insert or Upsert a Product and its variants into Supabase
   */
  async insertProduct(product: Product, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      // 1. Build primary product record with schema resilience
      const prodRecord: Record<string, any> = {
        id: product.id,
        name: product.name,
        brand: product.brand || 'Haven',
        description: product.description || '',
        category: (product as any).category || product.categoryId || 'Orthopedic',
        is_featured: Boolean(product.isFeatured),
        base_price: product.basePrice || (product.variants?.[0]?.sellingPrice || product.variants?.[0]?.price || 0),
        warranty_years: product.warrantyYears || 5,
        rating: product.rating || 5.0,
        review_count: product.reviewCount || 0,
        images: Array.isArray(product.images) ? product.images : [],
        updated_at: new Date().toISOString(),
      };

      const { error: prodErr } = await client.from('products').upsert(prodRecord, { onConflict: 'id' });
      if (prodErr) {
        console.warn('Supabase product upsert warning:', prodErr.message);
      }

      // 2. Insert/Upsert Variants
      if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        const variantRecords = product.variants.map((v, idx) => {
          const sellingPrice = (v.sellingPrice ?? v.price) || 0;
          return {
            id: v.id || `${product.id}-var-${idx + 1}`,
            product_id: product.id,
            price: sellingPrice,
            stock_status: v.stockStatus || 'in_stock',
            sku: v.sku || `${product.id}-${idx + 1}`,
            dimensions: v.dimensions || '',
            size_label: v.sizeLabel || v.size || 'Standard',
            thickness_inches: v.thicknessInches || v.thickness || 8,
          };
        });

        const { error: varErr } = await client.from('product_variants').upsert(variantRecords, { onConflict: 'id' });
        if (varErr) {
          console.warn('Supabase product variants upsert warning:', varErr.message);
        }
      }

      return true;
    } catch (err: any) {
      console.warn('Supabase insertProduct exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Update an existing product in Supabase
   */
  async updateProduct(id: string, updates: Partial<Product>, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const prodRecord: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) prodRecord.name = updates.name;
      if (updates.brand !== undefined) prodRecord.brand = updates.brand;
      if (updates.description !== undefined) prodRecord.description = updates.description;
      if ((updates as any).category !== undefined) prodRecord.category = (updates as any).category;
      if (updates.categoryId !== undefined) prodRecord.category = updates.categoryId;
      if (updates.isFeatured !== undefined) prodRecord.is_featured = updates.isFeatured;
      if (updates.basePrice !== undefined) prodRecord.base_price = updates.basePrice;
      if (updates.warrantyYears !== undefined) prodRecord.warranty_years = updates.warrantyYears;
      if (updates.rating !== undefined) prodRecord.rating = updates.rating;
      if (updates.reviewCount !== undefined) prodRecord.review_count = updates.reviewCount;
      if (updates.images !== undefined) prodRecord.images = updates.images;

      const { error } = await client.from('products').update(prodRecord).eq('id', id);
      if (error) {
        console.warn('Supabase updateProduct warning:', error.message);
      }

      // Update variants if provided
      if (updates.variants && Array.isArray(updates.variants)) {
        const variantRecords = updates.variants.map((v, idx) => {
          const sellingPrice = (v.sellingPrice ?? v.price) || 0;
          return {
            id: v.id || `${id}-var-${idx + 1}`,
            product_id: id,
            price: sellingPrice,
            stock_status: v.stockStatus || 'in_stock',
            sku: v.sku || `${id}-${idx + 1}`,
            dimensions: v.dimensions || '',
            size_label: v.sizeLabel || v.size || 'Standard',
            thickness_inches: v.thicknessInches || v.thickness || 8,
          };
        });
        await client.from('product_variants').upsert(variantRecords, { onConflict: 'id' });
      }

      return true;
    } catch (err: any) {
      console.warn('Supabase updateProduct exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Delete a product and its associated variants from Supabase
   */
  async deleteProduct(id: string, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      await client.from('product_variants').delete().eq('product_id', id);
      const { error } = await client.from('products').delete().eq('id', id);
      if (error) {
        console.warn('Supabase deleteProduct warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase deleteProduct exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Insert or Upsert an Order and its line items into Supabase
   */
  async insertOrder(order: Order, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const orderRecord = {
        id: order.id,
        order_number: order.orderNumber,
        customer_name: order.customerName,
        customer_email: order.email || null,
        customer_phone: order.phone,
        delivery_address: typeof order.deliveryAddress === 'object' ? order.deliveryAddress : {
          county: order.county,
          townCity: order.town,
          deliveryArea: order.deliveryAddress,
          landmark: order.landmark || '',
        },
        delivery_method: order.deliveryType || 'doorstep',
        delivery_fee: Number(order.deliveryFee || 0),
        subtotal: Number(order.subtotal || 0),
        discount_amount: Number(order.discount || 0),
        total_amount: Number(order.total || 0),
        payment_method: order.paymentMethod || 'mpesa',
        payment_status: order.paymentStatus || 'pending',
        order_status: order.orderStatus || 'pending_payment',
        special_notes: order.deliveryNotes || null,
        driver_id: order.driverId || null,
        supplier_id: order.supplierId || null,
        created_at: order.createdAt || new Date().toISOString(),
        updated_at: order.updatedAt || new Date().toISOString(),
      };

      const { error: ordErr } = await client.from('orders').upsert(orderRecord, { onConflict: 'id' });
      if (ordErr) {
        console.warn('Supabase insertOrder warning:', ordErr.message);
      }

      if (order.items && Array.isArray(order.items) && order.items.length > 0) {
        const itemRecords = order.items.map((item, idx) => ({
          id: item.id || `${order.id}-item-${idx + 1}`,
          order_id: order.id,
          product_id: item.productId,
          variant_id: item.variantId || null,
          product_name: item.productName || 'Mattress',
          size_label: item.sizeLabel || 'Standard',
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unitPrice || 0),
          factory_cost: Number(item.supplierPrice || Math.round((item.unitPrice || 0) * 0.7)),
          line_total: Number(item.lineTotal || ((item.unitPrice || 0) * (item.quantity || 1))),
        }));

        const { error: itemErr } = await client.from('order_items').upsert(itemRecords, { onConflict: 'id' });
        if (itemErr) {
          console.warn('Supabase insertOrder order_items warning:', itemErr.message);
        }
      }

      return true;
    } catch (err: any) {
      console.warn('Supabase insertOrder exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Update an order's status, assignment, or details in Supabase
   */
  async updateOrder(id: string, updates: Partial<Order> | Record<string, any>, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const ordUpdate: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if ('orderStatus' in updates && updates.orderStatus) ordUpdate.order_status = updates.orderStatus;
      if ('order_status' in updates && updates.order_status) ordUpdate.order_status = updates.order_status;
      if ('paymentStatus' in updates && updates.paymentStatus) ordUpdate.payment_status = updates.paymentStatus;
      if ('payment_status' in updates && updates.payment_status) ordUpdate.payment_status = updates.payment_status;
      if ('driverId' in updates) ordUpdate.driver_id = updates.driverId;
      if ('driver_id' in updates) ordUpdate.driver_id = updates.driver_id;
      if ('assigned_driver_id' in updates) ordUpdate.driver_id = updates.assigned_driver_id;
      if ('supplierId' in updates) ordUpdate.supplier_id = updates.supplierId;
      if ('supplier_id' in updates) ordUpdate.supplier_id = updates.supplier_id;
      if ('special_notes' in updates) ordUpdate.special_notes = updates.special_notes;
      if ('deliveryNotes' in updates) ordUpdate.special_notes = updates.deliveryNotes;

      const { error } = await client.from('orders').update(ordUpdate).eq('id', id);
      if (error) {
        console.warn('Supabase updateOrder warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase updateOrder exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Insert or Upsert a Supplier into Supabase
   */
  async insertSupplier(supplier: Supplier, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const record = {
        id: supplier.id,
        company: supplier.company || supplier.name,
        contact_person: supplier.name || supplier.company,
        phone: supplier.phone,
        email: supplier.email || null,
        location: supplier.location || null,
        lead_time_days: supplier.leadTimeDays || 1,
        rating: 5.0,
        active: supplier.active !== false,
      };

      const { error } = await client.from('suppliers').upsert(record, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase insertSupplier warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase insertSupplier exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Update a supplier in Supabase
   */
  async updateSupplier(id: string, updates: Partial<Supplier>, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const record: Record<string, any> = {};
      if (updates.company) record.company = updates.company;
      if (updates.name) record.contact_person = updates.name;
      if (updates.phone) record.phone = updates.phone;
      if (updates.email !== undefined) record.email = updates.email;
      if (updates.location !== undefined) record.location = updates.location;
      if (updates.leadTimeDays !== undefined) record.lead_time_days = updates.leadTimeDays;
      if (updates.active !== undefined) record.active = updates.active;

      const { error } = await client.from('suppliers').update(record).eq('id', id);
      if (error) {
        console.warn('Supabase updateSupplier warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase updateSupplier exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Delete a supplier from Supabase
   */
  async deleteSupplier(id: string, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const { error } = await client.from('suppliers').delete().eq('id', id);
      if (error) {
        console.warn('Supabase deleteSupplier warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase deleteSupplier exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Insert or Upsert a Driver into Supabase
   */
  async insertDriver(driver: Driver, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const record = {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        vehicle_type: driver.vehicleType || 'Delivery Van',
        is_available: driver.active !== false,
      };

      const { error } = await client.from('drivers').upsert(record, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase insertDriver warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase insertDriver exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Update a driver in Supabase
   */
  async updateDriver(id: string, updates: Partial<Driver>, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const record: Record<string, any> = {};
      if (updates.name) record.name = updates.name;
      if (updates.phone) record.phone = updates.phone;
      if (updates.vehicleType) record.vehicle_type = updates.vehicleType;
      if (updates.active !== undefined) record.is_available = updates.active;

      const { error } = await client.from('drivers').update(record).eq('id', id);
      if (error) {
        console.warn('Supabase updateDriver warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase updateDriver exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Delete a driver from Supabase
   */
  async deleteDriver(id: string, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const { error } = await client.from('drivers').delete().eq('id', id);
      if (error) {
        console.warn('Supabase deleteDriver warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase deleteDriver exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Insert or Upsert a Category into Supabase
   */
  async insertCategory(category: { id: string; name: string; slug: string; description?: string; image?: string; displayOrder?: number; is_active?: boolean }, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const record = {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description || null,
        image: category.image || null,
        display_order: category.displayOrder || 0,
        is_active: category.is_active !== false,
      };

      const { error } = await client.from('categories').upsert(record, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase insertCategory warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase insertCategory exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Delete a category from Supabase
   */
  async deleteCategory(id: string, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const { error } = await client.from('categories').delete().eq('id', id);
      if (error) {
        console.warn('Supabase deleteCategory warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase deleteCategory exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Insert or Upsert a Delivery Zone into Supabase
   */
  async insertDeliveryZone(zone: DeliveryZone, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const record = {
        id: zone.id,
        county: zone.county,
        towns: zone.towns || [],
        base_fee: zone.baseFee || 0,
        free_delivery_threshold: zone.freeDeliveryThreshold || 35000,
        estimated_days: zone.estimatedDays || '24 hrs',
      };

      const { error } = await client.from('delivery_zones').upsert(record, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase insertDeliveryZone warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase insertDeliveryZone exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Delete a Delivery Zone from Supabase
   */
  async deleteDeliveryZone(id: string, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const { error } = await client.from('delivery_zones').delete().eq('id', id);
      if (error) {
        console.warn('Supabase deleteDeliveryZone warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase deleteDeliveryZone exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Insert or Upsert a Coupon into Supabase
   */
  async insertCoupon(coupon: Coupon, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const record = {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discountType,
        discount_value: coupon.discountValue,
        min_order_amount: coupon.minOrderAmount || 0,
        description: coupon.description || null,
        is_active: coupon.active !== false,
      };

      const { error } = await client.from('coupons').upsert(record, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase insertCoupon warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase insertCoupon exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Delete a coupon from Supabase
   */
  async deleteCoupon(id: string, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const { error } = await client.from('coupons').delete().eq('id', id);
      if (error) {
        console.warn('Supabase deleteCoupon warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase deleteCoupon exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Insert or Upsert a Review into Supabase
   */
  async insertReview(review: Review, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const record = {
        id: review.id,
        product_id: review.productId,
        customer_name: review.customerName,
        rating: review.rating,
        comment: review.comment,
        verified_purchase: review.isVerifiedPurchase !== false,
        created_at: review.createdAt || new Date().toISOString(),
      };

      const { error } = await client.from('reviews').upsert(record, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase insertReview warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase insertReview exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Delete a review from Supabase
   */
  async deleteReview(id: string, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const { error } = await client.from('reviews').delete().eq('id', id);
      if (error) {
        console.warn('Supabase deleteReview warning:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase deleteReview exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Upsert a user/profile into Supabase
   */
  async upsertUser(user: Partial<User> & { id: string }, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      const record: Record<string, any> = {
        id: user.id,
        updated_at: new Date().toISOString(),
      };
      if (user.email) record.email = user.email;
      if (user.name) record.name = user.name;
      if (user.phone !== undefined) record.phone = user.phone;
      if (user.role) record.role = user.role;
      if (user.addresses) record.addresses = user.addresses;

      // Try users table
      const { error } = await client.from('users').upsert(record, { onConflict: 'id' });
      if (error) {
        // Fallback to profiles table
        const profileRecord = {
          id: user.id,
          email: user.email,
          full_name: user.name,
          phone: user.phone || null,
          role: user.role || 'customer',
          addresses: user.addresses || [],
        };
        await client.from('profiles').upsert(profileRecord, { onConflict: 'id' });
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase upsertUser exception:', err?.message || err);
      return false;
    }
  },

  /**
   * Delete a user from Supabase
   */
  async deleteUser(id: string, userToken?: string) {
    const client = getSupabaseClient(userToken);
    if (!client) return null;

    try {
      await client.from('users').delete().eq('id', id);
      await client.from('profiles').delete().eq('id', id);
      return true;
    } catch (err: any) {
      console.warn('Supabase deleteUser exception:', err?.message || err);
      return false;
    }
  },
};

// ============================================================================
// FULL BULK SYNC ENGINE (LOCAL -> SUPABASE & SUPABASE -> LOCAL)
// ============================================================================

export async function syncLocalDataToSupabase(localData: DatabaseSchema): Promise<{ success: boolean; message: string; syncedCounts: Record<string, number> }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  const counts: Record<string, number> = {};

  // 1. Sync Categories
  if (localData.categories?.length > 0) {
    for (const c of localData.categories) {
      await supabaseMutations.insertCategory(c);
    }
    counts['categories'] = localData.categories.length;
  }

  // 2. Sync Suppliers
  if (localData.suppliers?.length > 0) {
    for (const s of localData.suppliers) {
      await supabaseMutations.insertSupplier(s);
    }
    counts['suppliers'] = localData.suppliers.length;
  }

  // 3. Sync Products & Variants
  if (localData.products?.length > 0) {
    for (const p of localData.products) {
      await supabaseMutations.insertProduct(p);
    }
    counts['products'] = localData.products.length;
  }

  // 4. Sync Delivery Zones
  if (localData.deliveryZones?.length > 0) {
    for (const z of localData.deliveryZones) {
      await supabaseMutations.insertDeliveryZone(z);
    }
    counts['delivery_zones'] = localData.deliveryZones.length;
  }

  // 5. Sync Drivers
  if (localData.drivers?.length > 0) {
    for (const d of localData.drivers) {
      await supabaseMutations.insertDriver(d);
    }
    counts['drivers'] = localData.drivers.length;
  }

  // 6. Sync Coupons
  if (localData.coupons?.length > 0) {
    for (const cp of localData.coupons) {
      await supabaseMutations.insertCoupon(cp);
    }
    counts['coupons'] = localData.coupons.length;
  }

  // 7. Sync Users & Profiles
  if (localData.users?.length > 0) {
    for (const u of localData.users) {
      await supabaseMutations.upsertUser(u);
    }
    counts['users'] = localData.users.length;
  }

  // 8. Sync Orders & Order Items
  if (localData.orders?.length > 0) {
    for (const o of localData.orders) {
      await supabaseMutations.insertOrder(o);
    }
    counts['orders'] = localData.orders.length;
  }

  // 9. Sync Reviews
  if (localData.reviews?.length > 0) {
    for (const r of localData.reviews) {
      await supabaseMutations.insertReview(r);
    }
    counts['reviews'] = localData.reviews.length;
  }

  return {
    success: true,
    message: 'Local database records successfully synced to Supabase!',
    syncedCounts: counts,
  };
}

/**
 * Pull all data from Supabase to synchronize into the local app store
 */
export async function pullDataFromSupabase(): Promise<{ success: boolean; message: string; pulledCounts: Record<string, number>; data: Partial<DatabaseSchema> }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  const counts: Record<string, number> = {};
  const pulledData: any = {};

  try {
    // 1. Categories
    const { data: cats } = await client.from('categories').select('*');
    if (cats && cats.length > 0) {
      pulledData.categories = cats.map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        image: c.image || '',
        displayOrder: c.display_order || 0
      }));
      counts['categories'] = cats.length;
    }

    // 2. Suppliers
    const { data: supps } = await client.from('suppliers').select('*');
    if (supps && supps.length > 0) {
      pulledData.suppliers = supps.map((s: any) => ({
        id: s.id,
        name: s.contact_person || s.name || s.company,
        company: s.company || s.name,
        phone: s.phone || '',
        email: s.email || '',
        location: s.location || '',
        leadTimeDays: s.lead_time_days || 1,
        active: s.active !== false
      }));
      counts['suppliers'] = supps.length;
    }

    // 3. Products & Variants
    const { data: prods } = await client.from('products').select('*');
    const { data: vars } = await client.from('product_variants').select('*');

    if (prods && prods.length > 0) {
      pulledData.products = prods.map((p: any) => {
        const matchingVars = (vars || [])
          .filter((v: any) => v.product_id === p.id)
          .map((v: any) => {
            const price = Number(v.price || v.selling_price || 0);
            return {
              id: v.id,
              productId: p.id,
              sizeLabel: v.size_label || v.size || 'Standard',
              size: v.size || v.size_label || 'Standard',
              dimensions: v.dimensions || '',
              thicknessInches: Number(v.thickness_inches || v.thickness || 8),
              sellingPrice: price,
              price: price,
              supplierPrice: Number(v.supplier_cost || v.factory_cost || Math.round(price * 0.7)),
              sku: v.sku || ''
            };
          });

        return {
          id: p.id,
          name: p.name,
          slug: p.slug || p.id,
          brand: p.brand || 'Haven',
          categoryId: p.category_id || p.category,
          category: p.category || 'Orthopedic',
          supplierId: p.supplier_id || undefined,
          description: p.description || '',
          features: Array.isArray(p.features) ? p.features : [],
          images: Array.isArray(p.images) ? p.images : [],
          firmness: p.firmness || 'Medium Firm',
          warrantyYears: p.warranty_years || 5,
          trialNights: p.trial_nights || 100,
          isFeatured: Boolean(p.is_featured),
          isBestSeller: Boolean(p.is_bestseller),
          basePrice: Number(p.base_price || (matchingVars[0]?.sellingPrice || 0)),
          variants: matchingVars
        };
      });
      counts['products'] = prods.length;
      if (vars) counts['variants'] = vars.length;
    }

    // 4. Delivery Zones
    const { data: zones } = await client.from('delivery_zones').select('*');
    if (zones && zones.length > 0) {
      pulledData.deliveryZones = zones.map((z: any) => ({
        id: z.id,
        county: z.county,
        towns: Array.isArray(z.towns) ? z.towns : [],
        baseFee: Number(z.base_fee || 0),
        freeDeliveryThreshold: Number(z.free_delivery_threshold || 35000),
        estimatedDays: z.estimated_days || '24 hrs'
      }));
      counts['deliveryZones'] = zones.length;
    }

    // 5. Drivers
    const { data: drivers } = await client.from('drivers').select('*');
    if (drivers && drivers.length > 0) {
      pulledData.drivers = drivers.map((d: any) => ({
        id: d.id,
        userId: d.user_id || undefined,
        name: d.name,
        phone: d.phone,
        vehicleType: d.vehicle_type || 'Delivery Van',
        vehiclePlate: d.vehicle_plate || '',
        activeDeliveriesCount: d.assigned_orders_count || 0,
        active: d.is_available !== false && d.status !== 'off_duty'
      }));
      counts['drivers'] = drivers.length;
    }

    // 6. Users / Profiles
    let userRecords: any[] = [];
    const { data: usersFromTable } = await client.from('users').select('*');
    if (usersFromTable && usersFromTable.length > 0) {
      userRecords = usersFromTable;
    } else {
      const { data: profiles } = await client.from('profiles').select('*');
      if (profiles && profiles.length > 0) {
        userRecords = profiles;
      }
    }

    if (userRecords && userRecords.length > 0) {
      pulledData.users = userRecords.map((u: any) => ({
        id: u.id,
        name: u.name || u.full_name || u.email?.split('@')[0] || 'User',
        email: u.email || '',
        phone: u.phone || '',
        role: u.role || 'customer',
        createdAt: u.created_at || new Date().toISOString(),
        addresses: Array.isArray(u.addresses) ? u.addresses : []
      }));
      counts['users'] = userRecords.length;
    }

    // 7. Orders & Items
    const { data: orders } = await client.from('orders').select('*').order('created_at', { ascending: false });
    const { data: items } = await client.from('order_items').select('*');

    if (orders && orders.length > 0) {
      pulledData.orders = orders.map((o: any) => {
        const orderItems = (items || [])
          .filter((i: any) => i.order_id === o.id)
          .map((i: any) => ({
            id: i.id,
            productId: i.product_id,
            variantId: i.variant_id || '',
            productName: i.product_name || 'Mattress',
            sizeLabel: i.size_label || 'Standard',
            thicknessInches: i.thickness_inches || 8,
            quantity: Number(i.quantity || 1),
            unitPrice: Number(i.unit_price || 0),
            supplierPrice: Number(i.factory_cost || 0),
            lineTotal: Number(i.line_total || ((i.unit_price || 0) * (i.quantity || 1)))
          }));

        const deliveryAddr = typeof o.delivery_address === 'object' && o.delivery_address !== null ? o.delivery_address : {};

        return {
          id: o.id,
          orderNumber: o.order_number || o.id,
          customerId: o.customer_id || undefined,
          customerName: o.customer_name || 'Customer',
          phone: o.customer_phone || '',
          email: o.customer_email || '',
          county: deliveryAddr.county || o.county || 'Nairobi',
          town: deliveryAddr.townCity || o.town || 'CBD',
          deliveryAddress: deliveryAddr.deliveryArea || o.delivery_address_str || '',
          landmark: deliveryAddr.landmark || '',
          deliveryType: o.delivery_method || 'doorstep',
          deliveryNotes: o.special_notes || '',
          paymentMethod: o.payment_method || 'mpesa',
          paymentStatus: o.payment_status || 'pending',
          orderStatus: o.order_status || 'pending_payment',
          supplierStatus: o.supplier_status || 'unassigned',
          subtotal: Number(o.subtotal || 0),
          deliveryFee: Number(o.delivery_fee || 0),
          discount: Number(o.discount_amount || 0),
          total: Number(o.total_amount || 0),
          items: orderItems,
          createdAt: o.created_at || new Date().toISOString(),
          updatedAt: o.updated_at || o.created_at || new Date().toISOString()
        };
      });
      counts['orders'] = orders.length;
    }

    return {
      success: true,
      message: `Successfully pulled records from Supabase!`,
      pulledCounts: counts,
      data: pulledData
    };
  } catch (err: any) {
    console.error('Failed to pull data from Supabase:', err);
    throw err;
  }
}

/**
 * Direct table query inspector for Admin Panel
 */
export async function querySupabaseTable(tableName: string, limit = 50): Promise<{ table: string; count: number; rows: any[] }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  const { data, error, count } = await client
    .from(tableName)
    .select('*', { count: 'exact' })
    .limit(limit);

  if (error) {
    throw error;
  }

  return {
    table: tableName,
    count: count ?? (data?.length || 0),
    rows: data || []
  };
}

/**
 * Upserts a single user into Supabase
 */
export async function upsertUserToSupabase(user: { id: string; email: string; name: string; phone?: string; role?: any; addresses?: any[] }) {
  await supabaseMutations.upsertUser(user as any);
}


