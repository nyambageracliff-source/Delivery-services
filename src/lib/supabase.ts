import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, Order, Product, Review } from '../types';

// Fallback configuration if runtime environment variables are not injected yet
const supabaseUrl: string =
  ((import.meta as any).env?.VITE_SUPABASE_URL as string) ||
  'https://hepedzbbmrdsslvxiobv.supabase.co';

const supabaseAnonKey: string =
  ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcGVkemJibXJkc3Nsdnhpb2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NzQ3NzYsImV4cCI6MjEwMjM1MDc3Nn0.V-04N73YUy5nYe_PRhbM_G05qn_D6uMrv_-Ww0m76H0';

export const isClientSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('YOUR_SUPABASE') &&
  supabaseUrl.startsWith('http')
);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

// Helper functions for Supabase Auth with Email Verification
export async function supabaseSignUp(params: {
  email: string;
  password: string;
  name: string;
  phone: string;
  role?: 'customer' | 'buyer' | 'driver' | 'admin' | 'staff';
  businessName?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  address?: any;
}) {
  const { email, password, name, phone, role = 'customer', businessName, vehicleType, vehiclePlate, address } = params;
  
  // Strictly disallow registering as 'admin' directly from public registration
  const safeRole = role === 'admin' ? 'customer' : role;

  // Calculate redirect URL to the current origin
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;

  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        name: name.trim(),
        full_name: name.trim(),
        phone: phone.trim(),
        role: safeRole,
        businessName: businessName || null,
        vehicleType: vehicleType || null,
        vehiclePlate: vehiclePlate || null,
        address: address || null,
      },
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    if (error.message?.toLowerCase().includes('already registered') || 
        error.message?.toLowerCase().includes('already in use') || 
        error.message?.toLowerCase().includes('user already exists')) {
      throw new Error('This email is already registered. Please sign in instead.');
    }
    throw error;
  }

  // Supabase may return user with empty identities if duplicate email with email confirmations on
  if (data.user && Array.isArray((data.user as any).identities) && (data.user as any).identities.length === 0) {
    throw new Error('This email is already registered. Please sign in instead.');
  }

  // If Supabase has email confirmation enabled:
  const isEmailConfirmationRequired = !data.session || (data.user && !data.user.confirmed_at);

  // If a session was created immediately, save profile in Supabase profiles/users table
  if (data.user) {
    await saveUserProfileToSupabase(data.user, {
      name: name.trim(),
      phone: phone.trim(),
      role: safeRole,
      businessName,
      vehicleType,
      vehiclePlate,
      addresses: address ? [address] : [],
    });
  }

  return {
    user: data.user,
    session: data.session,
    isEmailConfirmationRequired,
  };
}

export async function supabaseSignIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    if (error.message?.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Incorrect email or password. Please check your credentials and try again.');
    }
    if (error.message?.toLowerCase().includes('email not confirmed')) {
      const err: any = new Error('Email not verified. Please check your inbox and verify your email address to log in.');
      err.isEmailUnconfirmed = true;
      err.unconfirmedEmail = email;
      throw err;
    }
    throw error;
  }

  if (data.user) {
    // Attempt to sync or fetch profile
    await syncUserProfileFromSupabase(data.user);
  }

  return data;
}

export async function supabaseResendVerification(email: string) {
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    throw error;
  }
  return true;
}

export async function supabaseSignOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Supabase signOut error:', error);
  }
}

export async function supabaseResetPassword(email: string) {
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) throw error;
  return true;
}

// ----------------------------------------------------
// Supabase Data Persistence Helpers
// ----------------------------------------------------

export async function saveUserProfileToSupabase(
  authUser: SupabaseUser,
  profileData: { 
    name: string; 
    phone: string; 
    role?: string; 
    businessName?: string;
    vehicleType?: string;
    vehiclePlate?: string;
    addresses?: any[];
  }
) {
  try {
    const isCliff = authUser.email?.toLowerCase() === 'nyambageracliff@gmail.com';
    const resolvedRole = isCliff ? 'admin' : (profileData.role || authUser.user_metadata?.role || 'customer');

    const record = {
      id: authUser.id,
      email: authUser.email,
      name: profileData.name || authUser.user_metadata?.name || '',
      phone: profileData.phone || authUser.user_metadata?.phone || '',
      role: resolvedRole,
      business_name: profileData.businessName || authUser.user_metadata?.businessName || null,
      vehicle_type: profileData.vehicleType || authUser.user_metadata?.vehicleType || null,
      vehicle_plate: profileData.vehiclePlate || authUser.user_metadata?.vehiclePlate || null,
      addresses: profileData.addresses || [],
      updated_at: new Date().toISOString(),
    };

    // Try saving to 'users' table
    const { error } = await supabase.from('users').upsert(record, { onConflict: 'id' });
    if (error) {
      // If table differs, try 'profiles' table
      await supabase.from('profiles').upsert(record, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('Could not upsert profile directly to Supabase table:', err);
  }
}

export async function syncUserProfileFromSupabase(authUser: SupabaseUser): Promise<User | null> {
  const isCliff = authUser.email?.toLowerCase() === 'nyambageracliff@gmail.com';

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name || authUser.user_metadata?.name || 'Cliff Nyambagera',
        email: data.email || authUser.email || '',
        phone: data.phone || authUser.user_metadata?.phone || '',
        role: isCliff ? 'admin' : (data.role || (authUser.user_metadata?.role as any) || 'customer'),
        businessName: data.business_name || authUser.user_metadata?.businessName,
        vehicleType: data.vehicle_type || authUser.user_metadata?.vehicleType,
        vehiclePlate: data.vehicle_plate || authUser.user_metadata?.vehiclePlate,
        createdAt: data.created_at || authUser.created_at,
        addresses: data.addresses || [],
      };
    }
  } catch (e) {
    // fallback
  }

  return {
    id: authUser.id,
    name: authUser.user_metadata?.name || (isCliff ? 'Cliff Nyambagera' : (authUser.email?.split('@')[0] || 'Customer')),
    email: authUser.email || '',
    phone: authUser.user_metadata?.phone || '',
    role: isCliff ? 'admin' : ((authUser.user_metadata?.role as any) || 'customer'),
    businessName: authUser.user_metadata?.businessName,
    vehicleType: authUser.user_metadata?.vehicleType,
    vehiclePlate: authUser.user_metadata?.vehiclePlate,
    createdAt: authUser.created_at,
    addresses: authUser.user_metadata?.address ? [authUser.user_metadata.address] : [],
  };
}

// Save placed Order to Supabase cloud
export async function saveOrderToSupabase(order: Order) {
  try {
    const orderRecord = {
      id: order.id,
      order_number: order.orderNumber,
      customer_id: order.customerId || null,
      customer_name: order.customerName,
      customer_phone: order.phone,
      customer_email: order.email || null,
      delivery_method: order.deliveryType || 'doorstep',
      delivery_address: {
        county: order.county,
        townCity: order.town,
        deliveryArea: order.deliveryAddress,
        landmark: order.landmark,
      },
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      order_status: order.orderStatus,
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      discount_amount: order.discount,
      total_amount: order.total,
      supplier_id: order.supplierId || null,
      driver_id: order.driverId || null,
      special_notes: order.deliveryNotes || null,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    };

    const { error: ordErr } = await supabase.from('orders').upsert(orderRecord, { onConflict: 'id' });
    if (ordErr) {
      console.warn('Supabase save order warning:', ordErr.message);
    }

    if (order.items && order.items.length > 0) {
      const lineItems = order.items.map(item => ({
        id: item.id,
        order_id: order.id,
        product_id: item.productId,
        variant_id: item.variantId,
        product_name: item.productName,
        size_label: item.sizeLabel,
        thickness_inches: item.thicknessInches,
        unit_price: item.unitPrice,
        factory_cost: item.supplierPrice || Math.round(item.unitPrice * 0.7),
        quantity: item.quantity,
        line_total: item.lineTotal,
      }));

      await supabase.from('order_items').upsert(lineItems, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('Could not persist order to Supabase table:', err);
  }
}

// Fetch orders from Supabase for a customer or phone
export async function getOrdersFromSupabase(userId?: string, phone?: string): Promise<Order[]> {
  try {
    let query = supabase.from('orders').select('*, order_items(*)');
    if (userId) {
      query = query.eq('customer_id', userId);
    } else if (phone) {
      query = query.eq('customer_phone', phone);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      orderNumber: row.order_number,
      customerId: row.customer_id,
      isGuest: !row.customer_id,
      customerName: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email || '',
      county: row.delivery_address?.county || 'Nakuru',
      town: row.delivery_address?.townCity || 'Nakuru',
      area: row.delivery_address?.deliveryArea || '',
      deliveryAddress: row.delivery_address?.deliveryArea || '',
      landmark: row.delivery_address?.landmark,
      deliveryType: row.delivery_method || 'delivery',
      items: (row.order_items || []).map((i: any) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        productImage: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=600&q=80',
        brand: 'Haven',
        variantId: i.variant_id,
        sizeLabel: i.size_label,
        thicknessInches: i.thickness_inches,
        quantity: i.quantity,
        unitPrice: Number(i.unit_price),
        lineTotal: Number(i.line_total),
      })),
      subtotal: Number(row.subtotal),
      discount: Number(row.discount_amount || 0),
      deliveryFee: Number(row.delivery_fee || 0),
      total: Number(row.total_amount),
      paymentMethod: row.payment_method || 'mpesa',
      paymentStatus: row.payment_status || 'paid',
      orderStatus: row.order_status || 'processing',
      supplierStatus: 'not_contacted',
      trackingHistory: [
        {
          status: row.order_status || 'order_confirmed',
          label: 'Order Registered in Supabase Cloud',
          description: 'Synced with master database.',
          timestamp: row.created_at,
          actor: 'Supabase Cloud'
        }
      ],
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
    }));
  } catch (err) {
    console.warn('Failed to load orders from Supabase:', err);
    return [];
  }
}

// Persist mattress customer review to Supabase cloud
export async function saveReviewToSupabase(review: Partial<Review>) {
  try {
    const record = {
      id: review.id || `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      product_id: review.productId,
      product_name: review.productName,
      customer_id: review.userId || review.customerId || null,
      customer_name: review.userName || review.customerName || 'Verified Buyer',
      rating: review.rating || 5,
      title: review.title || null,
      comment: review.comment || '',
      verified_purchase: review.isVerifiedPurchase ?? review.verifiedPurchase ?? true,
      status: review.status || 'approved',
      created_at: review.createdAt || new Date().toISOString(),
    };

    await supabase.from('reviews').upsert(record, { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase review persist warning:', err);
  }
}

export async function getReviewsFromSupabase(productId: string): Promise<Review[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_name || '',
      customerId: r.customer_id || '',
      customerName: r.customer_name || 'Verified Buyer',
      userId: r.customer_id || '',
      userName: r.customer_name || 'Verified Buyer',
      rating: Number(r.rating) || 5,
      title: r.title || '',
      comment: r.comment || '',
      verifiedPurchase: Boolean(r.verified_purchase),
      isVerifiedPurchase: Boolean(r.verified_purchase),
      status: r.status || 'approved',
      createdAt: r.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Failed to fetch reviews from Supabase:', err);
    return [];
  }
}
