-- ============================================================================
-- HAVEN MATTRESSES KENYA - COMPLETE SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- Migration: 001_initial_schema.sql
-- Target: Supabase (PostgreSQL 15+)
-- ============================================================================

-- 0. EXTENSIONS & PREREQUISITES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. HELPER FUNCTIONS & SHARED TRIGGERS
-- ============================================================================

-- Reusable trigger function for updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence & Function for Sequential Unique Order Numbers (ORD-YYYY-000001)
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
    current_yr TEXT;
    seq_val BIGINT;
    formatted_num TEXT;
BEGIN
    current_yr := TO_CHAR(NOW(), 'YYYY');
    seq_val := NEXTVAL('public.order_number_seq');
    formatted_num := 'ORD-' || current_yr || '-' || LPAD(seq_val::TEXT, 6, '0');
    RETURN formatted_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. PROFILES (AUTH & USER MANAGEMENT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin', 'driver')),
    account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Security Helper Functions for Role Checking (to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND account_status = 'active'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'staff') AND account_status = 'active'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Trigger: Automatically Create Profile on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone, email, avatar_url, role, account_status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        'customer', -- strictly enforce 'customer' default, cannot self-register as admin
        'active'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. ADDRESSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    county TEXT NOT NULL,
    town TEXT NOT NULL,
    area TEXT,
    address_line TEXT NOT NULL,
    landmark TEXT,
    delivery_notes TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_addresses_updated_at
    BEFORE UPDATE ON public.addresses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 4. CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 5. PRODUCTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    brand TEXT NOT NULL DEFAULT 'Haven Mattresses Kenya',
    description TEXT,
    materials TEXT,
    firmness TEXT,
    thickness TEXT,
    warranty TEXT,
    sku TEXT UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 6. PRODUCT VARIANTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    selling_price NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
    sale_price NUMERIC(12, 2) CHECK (sale_price >= 0),
    supplier_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (supplier_cost >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    stock_status TEXT NOT NULL DEFAULT 'available' CHECK (stock_status IN ('available', 'out_of_stock', 'on_order', 'discontinued')),
    sku TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_product_variants_updated_at
    BEFORE UPDATE ON public.product_variants
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 7. PRODUCT IMAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. SUPPLIERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 9. SUPPLIER PRODUCTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.supplier_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    product_variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    supplier_price NUMERIC(12, 2) NOT NULL CHECK (supplier_price >= 0),
    supplier_sku TEXT,
    availability TEXT DEFAULT 'In Stock',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_supplier_variant UNIQUE (supplier_id, product_variant_id)
);

CREATE TRIGGER set_supplier_products_updated_at
    BEFORE UPDATE ON public.supplier_products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 10. WISHLISTS & WISHLIST ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wishlist_id UUID NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_wishlist_product UNIQUE (wishlist_id, product_id)
);

-- ============================================================================
-- 11. CARTS & CART ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'abandoned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_carts_updated_at
    BEFORE UPDATE ON public.carts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    product_variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cart_variant UNIQUE (cart_id, product_variant_id)
);

CREATE TRIGGER set_cart_items_updated_at
    BEFORE UPDATE ON public.cart_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 12. DELIVERY ZONES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.delivery_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    county TEXT NOT NULL,
    town TEXT,
    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    estimated_days INTEGER DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_delivery_zones_updated_at
    BEFORE UPDATE ON public.delivery_zones
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 13. ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL DEFAULT public.generate_order_number(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT NOT NULL,
    delivery_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    currency TEXT NOT NULL DEFAULT 'KES',
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')
    ),
    order_status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (
        order_status IN (
            'pending_payment', 'payment_received', 'confirmed', 'processing',
            'supplier_purchase', 'ready_for_delivery', 'out_for_delivery',
            'delivered', 'cancelled', 'refunded'
        )
    ),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 14. ORDER ITEMS (WITH PRICE & COST SNAPSHOTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_size TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    supplier_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (supplier_cost >= 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 15. PAYMENTS (AUDIT & M-PESA TRANSACTIONS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    provider TEXT NOT NULL DEFAULT 'mpesa_daraja',
    payment_method TEXT NOT NULL DEFAULT 'mpesa_stk',
    provider_transaction_id TEXT UNIQUE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
    metadata JSONB DEFAULT '{}'::jsonb,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 16. ORDER STATUS HISTORY (AUDIT TRAIL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 17. DRIVERS & ASSIGNMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    phone TEXT,
    vehicle_type TEXT DEFAULT 'Delivery Van',
    vehicle_number TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_drivers_updated_at
    BEFORE UPDATE ON public.drivers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.driver_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'picked_up', 'out_for_delivery', 'delivered', 'failed', 'cancelled')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    notes TEXT
);

-- ============================================================================
-- 18. REVIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    image_url TEXT,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
    is_approved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 19. COUPONS & USAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
    minimum_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    maximum_discount NUMERIC(12, 2),
    usage_limit INTEGER,
    per_user_limit INTEGER DEFAULT 1,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_coupons_updated_at
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.coupon_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    discount_amount NUMERIC(12, 2) NOT NULL CHECK (discount_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 20. NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 21. ADMIN ACTIVITY LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 22. BUSINESS SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT NOT NULL DEFAULT 'Haven Mattresses Kenya',
    logo_url TEXT,
    phone TEXT DEFAULT '+254 700 000 000',
    email TEXT DEFAULT 'info@havenmattresses.co.ke',
    whatsapp TEXT DEFAULT '+254 700 000 000',
    address TEXT DEFAULT 'Mombasa Road / Enterprise Road, Nairobi, Kenya',
    currency TEXT NOT NULL DEFAULT 'KES',
    default_delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_business_settings_updated_at
    BEFORE UPDATE ON public.business_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert single initial business settings row if not exists
INSERT INTO public.business_settings (id, business_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Haven Mattresses Kenya')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 23. SUPPORT TICKETS & MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 24. PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON public.wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_county ON public.delivery_zones(county);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_tx_id ON public.payments(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_order_id ON public.driver_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver_id ON public.driver_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON public.reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON public.coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON public.admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);

-- ============================================================================
-- 25. PUBLIC CUSTOMER-SAFE VIEWS (HIDING SENSITIVE COSTS)
-- ============================================================================
-- Customer-safe product variants view without supplier_cost
CREATE OR REPLACE VIEW public.customer_product_variants AS
SELECT 
    id, product_id, size, selling_price, sale_price,
    stock_quantity, stock_status, sku, created_at, updated_at
FROM public.product_variants;

-- Customer-safe order items view without supplier_cost
CREATE OR REPLACE VIEW public.customer_order_items AS
SELECT 
    id, order_id, product_variant_id, product_name, product_size,
    quantity, unit_price, total_price, created_at
FROM public.order_items;

-- ============================================================================
-- 26. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS across all application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin_or_staff());

CREATE POLICY "Users can update own profile except role"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND 
        (role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Admins full access profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- ADDRESSES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can manage own addresses"
    ON public.addresses FOR ALL
    USING (auth.uid() = user_id OR public.is_admin_or_staff())
    WITH CHECK (auth.uid() = user_id OR public.is_admin_or_staff());

-- ----------------------------------------------------------------------------
-- CATEGORIES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can view active categories"
    ON public.categories FOR SELECT
    USING (is_active = true OR public.is_admin_or_staff());

CREATE POLICY "Admins manage categories"
    ON public.categories FOR ALL
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- PRODUCTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can view active products"
    ON public.products FOR SELECT
    USING (is_active = true OR public.is_admin_or_staff());

CREATE POLICY "Admins manage products"
    ON public.products FOR ALL
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- PRODUCT VARIANTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can view variants for active products"
    ON public.product_variants FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.is_active = true)
        OR public.is_admin_or_staff()
    );

CREATE POLICY "Admins manage variants"
    ON public.product_variants FOR ALL
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- PRODUCT IMAGES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can view product images"
    ON public.product_images FOR SELECT
    USING (true);

CREATE POLICY "Admins manage product images"
    ON public.product_images FOR ALL
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- SUPPLIERS & SUPPLIER PRODUCTS (CONFIDENTIAL - ADMIN/STAFF ONLY)
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins and Staff view suppliers"
    ON public.suppliers FOR SELECT
    USING (public.is_admin_or_staff());

CREATE POLICY "Admins manage suppliers"
    ON public.suppliers FOR ALL
    USING (public.is_admin());

CREATE POLICY "Admins and Staff view supplier products"
    ON public.supplier_products FOR SELECT
    USING (public.is_admin_or_staff());

CREATE POLICY "Admins manage supplier products"
    ON public.supplier_products FOR ALL
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- WISHLISTS & WISHLIST ITEMS
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can manage own wishlist"
    ON public.wishlists FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishlist items"
    ON public.wishlist_items FOR ALL
    USING (EXISTS (SELECT 1 FROM public.wishlists w WHERE w.id = wishlist_items.wishlist_id AND w.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.wishlists w WHERE w.id = wishlist_items.wishlist_id AND w.user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- CARTS & CART ITEMS
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can manage own cart"
    ON public.carts FOR ALL
    USING (auth.uid() = user_id OR (user_id IS NULL AND session_id IS NOT NULL))
    WITH CHECK (auth.uid() = user_id OR (user_id IS NULL AND session_id IS NOT NULL));

CREATE POLICY "Users can manage own cart items"
    ON public.cart_items FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.carts c 
        WHERE c.id = cart_items.cart_id AND (c.user_id = auth.uid() OR c.user_id IS NULL)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.carts c 
        WHERE c.id = cart_items.cart_id AND (c.user_id = auth.uid() OR c.user_id IS NULL)
    ));

-- ----------------------------------------------------------------------------
-- DELIVERY ZONES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can view active delivery zones"
    ON public.delivery_zones FOR SELECT
    USING (is_active = true OR public.is_admin_or_staff());

CREATE POLICY "Admins manage delivery zones"
    ON public.delivery_zones FOR ALL
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- ORDERS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Customers can view own orders"
    ON public.orders FOR SELECT
    USING (
        auth.uid() = user_id 
        OR public.is_admin_or_staff()
        OR EXISTS (
            SELECT 1 FROM public.driver_assignments da 
            JOIN public.drivers d ON d.id = da.driver_id 
            WHERE da.order_id = orders.id AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create own orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins and Staff manage orders"
    ON public.orders FOR UPDATE
    USING (public.is_admin_or_staff())
    WITH CHECK (public.is_admin_or_staff());

-- ----------------------------------------------------------------------------
-- ORDER ITEMS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own order items"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.user_id = auth.uid() OR public.is_admin_or_staff()))
        OR EXISTS (
            SELECT 1 FROM public.driver_assignments da 
            JOIN public.drivers d ON d.id = da.driver_id 
            WHERE da.order_id = order_items.order_id AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "System/Admin insert order items"
    ON public.order_items FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.user_id = auth.uid() OR public.is_admin_or_staff()))
    );

-- ----------------------------------------------------------------------------
-- PAYMENTS POLICIES (AUDIT & RECONCILIATION)
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own verified payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin_or_staff());

CREATE POLICY "Admins and service role manage payments"
    ON public.payments FOR ALL
    USING (public.is_admin_or_staff());

-- ----------------------------------------------------------------------------
-- ORDER STATUS HISTORY
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view history for own orders"
    ON public.order_status_history FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_status_history.order_id AND (o.user_id = auth.uid() OR public.is_admin_or_staff()))
    );

CREATE POLICY "Staff and Admins add order history"
    ON public.order_status_history FOR INSERT
    WITH CHECK (public.is_admin_or_staff());

-- ----------------------------------------------------------------------------
-- DRIVERS & ASSIGNMENTS
-- ----------------------------------------------------------------------------
CREATE POLICY "Drivers view own driver profile"
    ON public.drivers FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin_or_staff());

CREATE POLICY "Admins manage drivers"
    ON public.drivers FOR ALL
    USING (public.is_admin());

CREATE POLICY "Drivers view and update own assignments"
    ON public.driver_assignments FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_assignments.driver_id AND d.user_id = auth.uid())
        OR public.is_admin_or_staff()
    );

CREATE POLICY "Drivers update assignment status"
    ON public.driver_assignments FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_assignments.driver_id AND d.user_id = auth.uid())
        OR public.is_admin_or_staff()
    );

CREATE POLICY "Admins manage driver assignments"
    ON public.driver_assignments FOR ALL
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- REVIEWS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can view approved reviews"
    ON public.reviews FOR SELECT
    USING (is_approved = true OR auth.uid() = user_id OR public.is_admin_or_staff());

CREATE POLICY "Verified buyers can submit reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.orders o
            JOIN public.order_items oi ON oi.order_id = o.id
            JOIN public.product_variants pv ON pv.id = oi.product_variant_id
            WHERE o.user_id = auth.uid() 
              AND pv.product_id = reviews.product_id 
              AND o.order_status = 'delivered'
        )
    );

CREATE POLICY "Admins manage reviews"
    ON public.reviews FOR ALL
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- COUPONS & USAGES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can view active coupons"
    ON public.coupons FOR SELECT
    USING (is_active = true OR public.is_admin_or_staff());

CREATE POLICY "Admins manage coupons"
    ON public.coupons FOR ALL
    USING (public.is_admin());

CREATE POLICY "Users view own coupon usages"
    ON public.coupon_usages FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin_or_staff());

CREATE POLICY "Insert coupon usage"
    ON public.coupon_usages FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin_or_staff());

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
CREATE POLICY "Users manage own notifications"
    ON public.notifications FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- ADMIN ACTIVITY LOGS (ADMIN ONLY)
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins view activity logs"
    ON public.admin_activity_logs FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins and system insert activity logs"
    ON public.admin_activity_logs FOR INSERT
    WITH CHECK (public.is_admin_or_staff());

-- ----------------------------------------------------------------------------
-- BUSINESS SETTINGS
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can view business settings"
    ON public.business_settings FOR SELECT
    USING (true);

CREATE POLICY "Admins modify business settings"
    ON public.business_settings FOR ALL
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- SUPPORT TICKETS & MESSAGES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own support tickets"
    ON public.support_tickets FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin_or_staff());

CREATE POLICY "Users can create support tickets"
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and Staff view support messages"
    ON public.support_messages FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = support_messages.ticket_id AND (st.user_id = auth.uid() OR public.is_admin_or_staff()))
    );

CREATE POLICY "Users and Staff post support messages"
    ON public.support_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = support_messages.ticket_id AND (st.user_id = auth.uid() OR public.is_admin_or_staff()))
    );

-- ============================================================================
-- 27. SUPABASE STORAGE BUCKETS & STORAGE POLICIES
-- ============================================================================

-- Create Storage Buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('product-images', 'product-images', true),
    ('avatars', 'avatars', true),
    ('review-images', 'review-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Enable RLS on storage.objects (if not already enabled)
-- Policies for 'product-images'
CREATE POLICY "Public read product images bucket"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');

CREATE POLICY "Admins upload product images bucket"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'product-images' AND public.is_admin_or_staff());

CREATE POLICY "Admins update/delete product images bucket"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'product-images' AND public.is_admin_or_staff());

-- Policies for 'avatars'
CREATE POLICY "Public read avatars bucket"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policies for 'review-images'
CREATE POLICY "Public read review images bucket"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'review-images');

CREATE POLICY "Users upload own review images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'review-images' AND 
        auth.uid() IS NOT NULL
    );
