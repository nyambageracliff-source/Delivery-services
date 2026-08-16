-- ============================================================================
-- HAVEN / HAVEENS MARKETPLACE - MULTI-CATEGORY & REAL AUTH MIGRATION
-- Migration: 002_marketplace_categories_and_variants.sql
-- ============================================================================

-- 1. Extend Categories Table with Department and Active Status
ALTER TABLE IF EXISTS public.categories 
    ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'home-bedding',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Extend Products Table with Department, Brand, and Specifications
ALTER TABLE IF EXISTS public.products
    ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'home-bedding',
    ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT 'Haveens',
    ADD COLUMN IF NOT EXISTS base_price NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sale_price NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 5.0,
    ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(8, 2),
    ADD COLUMN IF NOT EXISTS dimensions TEXT,
    ADD COLUMN IF NOT EXISTS warranty_years INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- 3. Extend Product Variants Table for Multi-Category Attributes
ALTER TABLE IF EXISTS public.product_variants
    ADD COLUMN IF NOT EXISTS color TEXT,
    ADD COLUMN IF NOT EXISTS model TEXT,
    ADD COLUMN IF NOT EXISTS storage TEXT,
    ADD COLUMN IF NOT EXISTS shoe_size TEXT,
    ADD COLUMN IF NOT EXISTS clothing_size TEXT,
    ADD COLUMN IF NOT EXISTS size_label TEXT,
    ADD COLUMN IF NOT EXISTS thickness INTEGER,
    ADD COLUMN IF NOT EXISTS firmness TEXT,
    ADD COLUMN IF NOT EXISTS dimensions TEXT,
    ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(8, 2),
    ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS old_price NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS supplier_cost NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS stock_count INTEGER DEFAULT 10,
    ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'in_stock';

-- 4. Extend Profiles Table for Role and Phone
ALTER TABLE IF EXISTS public.profiles
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'buyer', 'driver', 'staff', 'admin'));

-- 5. Extend Orders Table with Multi-Category Support & Real Statuses
ALTER TABLE IF EXISTS public.orders
    ADD COLUMN IF NOT EXISTS delivery_county TEXT,
    ADD COLUMN IF NOT EXISTS delivery_town TEXT,
    ADD COLUMN IF NOT EXISTS delivery_area TEXT,
    ADD COLUMN IF NOT EXISTS landmark TEXT,
    ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
    ADD COLUMN IF NOT EXISTS coupon_code TEXT,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'mpesa',
    ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS mpesa_receipt_number TEXT,
    ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'pending_payment' CHECK (order_status IN (
        'pending_payment', 'payment_received', 'order_confirmed', 'confirmed', 'processing',
        'supplier_purchase', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'
    )),
    ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS tracking_history JSONB DEFAULT '[]'::jsonb;
