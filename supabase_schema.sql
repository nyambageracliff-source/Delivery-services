-- =========================================================
-- HAVEENS COMPANY KENYA - SUPABASE DATABASE SCHEMA
-- Multi-Category E-Commerce Marketplace PostgreSQL Schema
-- =========================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USERS / PROFILES TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'buyer', 'driver', 'staff', 'admin')),
    avatar_url TEXT,
    county TEXT,
    town TEXT,
    address TEXT,
    addresses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    department TEXT DEFAULT 'home-bedding',
    description TEXT,
    image TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    location TEXT,
    lead_time_days INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCTS TABLE (Multi-Category Support)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    brand TEXT NOT NULL DEFAULT 'Haveens',
    department TEXT DEFAULT 'home-bedding',
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    specifications JSONB DEFAULT '{}'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    sale_price NUMERIC(12, 2) DEFAULT 0,
    firmness TEXT,
    warranty_years INT DEFAULT 1,
    weight_kg NUMERIC(8, 2),
    dimensions TEXT,
    is_featured BOOLEAN DEFAULT false,
    is_bestseller BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    review_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PRODUCT VARIANTS TABLE
CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size TEXT,
    size_label TEXT,
    color TEXT,
    model TEXT,
    storage TEXT,
    shoe_size TEXT,
    clothing_size TEXT,
    dimensions TEXT,
    thickness INT,
    firmness TEXT,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    old_price NUMERIC(12, 2),
    compare_at_price NUMERIC(12, 2),
    supplier_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    profit_margin NUMERIC(12, 2) NOT NULL DEFAULT 0,
    stock_count INT DEFAULT 10,
    stock_status TEXT DEFAULT 'in_stock',
    sku TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'Delivery Van',
    vehicle_plate TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'on_delivery', 'off_duty')),
    assigned_orders_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. DELIVERY ZONES TABLE
CREATE TABLE IF NOT EXISTS delivery_zones (
    id TEXT PRIMARY KEY,
    county TEXT NOT NULL,
    towns JSONB DEFAULT '[]'::jsonb,
    base_fee NUMERIC(10, 2) DEFAULT 0,
    free_delivery_threshold NUMERIC(10, 2) DEFAULT 35000,
    estimated_days TEXT DEFAULT 'Same Day / 24hrs',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    delivery_county TEXT NOT NULL,
    delivery_town TEXT NOT NULL,
    delivery_area TEXT,
    delivery_address TEXT NOT NULL,
    landmark TEXT,
    delivery_notes TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    coupon_code TEXT,
    total_supplier_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gross_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'mpesa',
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    mpesa_receipt_number TEXT,
    mpesa_phone TEXT,
    order_status TEXT DEFAULT 'pending_payment' CHECK (order_status IN (
        'pending_payment', 'payment_received', 'confirmed', 'processing', 
        'supplier_purchase', 'ready_for_delivery', 'out_for_delivery', 
        'delivered', 'cancelled', 'refunded'
    )),
    assigned_driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
    assigned_driver_name TEXT,
    driver_phone TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    timeline JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    checkout_request_id TEXT,
    merchant_request_id TEXT,
    phone_number TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    receipt_number TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    verified_purchase BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. COUPONS TABLE
CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL,
    min_order_amount NUMERIC(10, 2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
