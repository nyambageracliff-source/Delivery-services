import React, { useState, useEffect } from 'react';
import { 
  Filter, X, Search, SlidersHorizontal, ChevronDown, 
  RotateCcw, Sparkles 
} from 'lucide-react';
import { Product, Category, Department } from '../types';
import { api } from '../lib/api';
import { ProductCard } from '../components/ProductCard';

interface ShopPageProps {
  initialCategorySlug?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSelectProduct: (product: Product) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  initialCategorySlug,
  searchQuery: externalSearchQuery,
  onSearchChange,
  onSelectProduct
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategorySlug || '');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedFirmness, setSelectedFirmness] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedThickness, setSelectedThickness] = useState<string>('');
  const [priceRange, setPriceRange] = useState<number>(200000);
  const [search, setSearch] = useState<string>(externalSearchQuery || '');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Sync external search query from Header component
  useEffect(() => {
    if (externalSearchQuery !== undefined && externalSearchQuery !== search) {
      setSearch(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  const departmentsList: { id: string; label: string; icon: string }[] = [
    { id: 'all', label: 'All Products', icon: '🛍️' },
    { id: 'home-bedding', label: 'Mattresses & Bedding', icon: '🛏️' },
    { id: 'clothing', label: 'Clothing & Apparel', icon: '👕' },
    { id: 'shoes', label: 'Shoes & Footwear', icon: '👟' },
    { id: 'accessories', label: 'Watches & Accessories', icon: '🕶️' },
    { id: 'electronics', label: 'Electronics & Phones', icon: '📱' },
    { id: 'beauty', label: 'Beauty & Personal Care', icon: '✨' },
    { id: 'home-kitchen', label: 'Home & Kitchen', icon: '🍳' },
    { id: 'hardware', label: 'Plumbing & Hardware', icon: '🔧' }
  ];

  const brands = ['All', 'Haveens Signature', 'Haveens Company', 'Dr. Mattress', 'Bobmil', 'Nike', 'Adidas', 'Samsung', 'Oraimo', 'Apple', 'Total Tools'];
  const firmnessLevels = ['All', 'Plush Soft', 'Medium', 'Medium Firm', 'Extra Firm (Medical)'];
  const mattressSizes = ['All', '3x6 Single', '4x6 Double', '5x6 Queen', '6x6 King', '6x6.5 Super King'];
  const apparelSizes = ['All', 'Small (S)', 'Medium (M)', 'Large (L)', 'XL', 'XXL'];
  const shoeSizes = ['All', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45'];

  useEffect(() => {
    async function fetchCategories() {
      try {
        const cats = await api.getCategories();
        setCategories(cats);
      } catch (e) {
        console.error('Failed to load categories', e);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        const params: Record<string, any> = {};
        if (selectedDepartment && selectedDepartment !== 'all') params.department = selectedDepartment;
        if (selectedCategory) params.category = selectedCategory;
        if (selectedBrand && selectedBrand !== 'All') params.brand = selectedBrand;
        if (selectedFirmness && selectedFirmness !== 'All') params.firmness = selectedFirmness;
        if (selectedSize && selectedSize !== 'All') params.size = selectedSize.split(' ')[0];
        if (selectedThickness && selectedThickness !== 'All') params.thickness = selectedThickness.replace('"', '');
        if (search.trim()) params.search = search.trim();
        if (priceRange < 200000) params.maxPrice = priceRange;

        const res = await api.getProducts(params);
        let list = res.products;

        // Client sort
        if (sortBy === 'price-asc') {
          list.sort((a, b) => a.basePrice - b.basePrice);
        } else if (sortBy === 'price-desc') {
          list.sort((a, b) => b.basePrice - a.basePrice);
        } else if (sortBy === 'rating') {
          list.sort((a, b) => b.rating - a.rating);
        } else if (sortBy === 'newest') {
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        setProducts(list);
      } catch (err) {
        console.error('Failed to load shop products', err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [selectedDepartment, selectedCategory, selectedBrand, selectedFirmness, selectedSize, selectedThickness, search, priceRange, sortBy]);

  const handleResetFilters = () => {
    setSelectedDepartment('all');
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedFirmness('');
    setSelectedSize('');
    setSelectedThickness('');
    setPriceRange(200000);
    setSearch('');
    setSortBy('featured');
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  const handleSearchInputChange = (value: string) => {
    setSearch(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const hasActiveFilters = Boolean(
    (selectedDepartment && selectedDepartment !== 'all') ||
    selectedCategory || (selectedBrand && selectedBrand !== 'All') ||
    (selectedFirmness && selectedFirmness !== 'All') ||
    (selectedSize && selectedSize !== 'All') ||
    (selectedThickness && selectedThickness !== 'All') ||
    search || priceRange < 200000
  );

  const displayedCategories = selectedDepartment && selectedDepartment !== 'all'
    ? categories.filter(c => !c.department || c.department === selectedDepartment)
    : categories;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Shop Header */}
      <div className="border-b border-stone-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase text-amber-800 tracking-wider">
            Haveens Company Marketplace
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
            Shop Mattresses, Fashion, Electronics & Hardware
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Verified authentic products, fast countywide delivery across Kenya, and secure M-PESA payment.
          </p>
        </div>

        {/* Sort & Mobile Filter Toggle */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 border border-stone-200 cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-amber-800" />
            <span>Filters {hasActiveFilters && '(Active)'}</span>
          </button>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-500 font-medium whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800 focus:ring-1 focus:ring-amber-700"
            >
              <option value="featured">Featured / Best Match</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>
      </div>

      {/* Department Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-100 scrollbar-none">
        {departmentsList.map((dep) => (
          <button
            key={dep.id}
            onClick={() => {
              setSelectedDepartment(dep.id);
              setSelectedCategory('');
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              selectedDepartment === dep.id
                ? 'bg-amber-800 text-white shadow-md shadow-amber-900/20'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
            }`}
          >
            <span>{dep.icon}</span>
            <span>{dep.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content Layout (Sidebar Filters + Products Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sidebar Filters */}
        <div className="hidden lg:block space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2 font-serif font-bold text-stone-900 text-sm">
              <SlidersHorizontal className="w-4 h-4 text-amber-700" />
              <span>Filter Catalog</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-amber-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          {/* Search inside shop */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Search Keywords
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                placeholder="Search by name, description, size..."
                className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-8 pr-7 py-2 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchInputChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Category
            </label>
            <div className="space-y-1 text-xs max-h-60 overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedCategory('')}
                className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  selectedCategory === ''
                    ? 'bg-amber-100 text-amber-900 font-bold'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                All Categories
              </button>
              {displayedCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    selectedCategory === cat.slug
                      ? 'bg-amber-100 text-amber-900 font-bold'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Filter */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Brand / Manufacturer
            </label>
            <div className="flex flex-wrap gap-1.5">
              {brands.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBrand(b === 'All' ? '' : b)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                    (selectedBrand === b || (b === 'All' && !selectedBrand))
                      ? 'bg-stone-900 text-white border-stone-900 font-bold'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Department-Specific Filters */}
          {(selectedDepartment === 'all' || selectedDepartment === 'home-bedding' || selectedDepartment === 'mattresses') && (
            <>
              {/* Firmness Level Filter */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Mattress Firmness
                </label>
                <div className="space-y-1 text-xs">
                  {firmnessLevels.map((f) => (
                    <button
                      key={f}
                      onClick={() => setSelectedFirmness(f === 'All' ? '' : f)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                        (selectedFirmness === f || (f === 'All' && !selectedFirmness))
                          ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mattress Size Filter */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Bed Dimension
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {mattressSizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s === 'All' ? '' : s)}
                      className={`text-xs px-2 py-1.5 rounded-lg border font-medium text-center transition-all cursor-pointer ${
                        (selectedSize === s || (s === 'All' && !selectedSize))
                          ? 'bg-amber-700 text-white border-amber-700 font-bold'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Clothing Sizes Filter */}
          {selectedDepartment === 'clothing' && (
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Clothing Size
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {apparelSizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s === 'All' ? '' : s)}
                    className={`text-xs px-2 py-1.5 rounded-lg border font-medium text-center transition-all cursor-pointer ${
                      (selectedSize === s || (s === 'All' && !selectedSize))
                        ? 'bg-amber-700 text-white border-amber-700 font-bold'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Shoes Sizes Filter */}
          {selectedDepartment === 'shoes' && (
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Shoe Size (EU)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {shoeSizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s === 'All' ? '' : s)}
                    className={`text-xs px-2 py-1.5 rounded-lg border font-medium text-center transition-all cursor-pointer ${
                      (selectedSize === s || (s === 'All' && !selectedSize))
                        ? 'bg-amber-700 text-white border-amber-700 font-bold'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Max Price Range Slider */}
          <div>
            <div className="flex justify-between items-center text-xs mb-2">
              <label className="font-bold text-stone-700 uppercase tracking-wider">
                Max Price
              </label>
              <span className="font-bold text-amber-900 font-serif">
                KSh {priceRange.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="200000"
              step="2500"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full accent-amber-700 cursor-pointer"
            />
          </div>
        </div>

        {/* Products Grid Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs animate-fadeIn">
              <span className="text-stone-500 font-semibold">Active:</span>
              {search && (
                <span className="bg-amber-100/80 border border-amber-300 text-amber-950 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs">
                  <span>Search: "{search}"</span>
                  <button 
                    onClick={() => handleSearchInputChange('')}
                    title="Clear search keyword"
                    className="hover:bg-amber-200 p-0.5 rounded-full"
                  >
                    <X className="w-3 h-3 text-amber-900" />
                  </button>
                </span>
              )}
              {selectedDepartment && selectedDepartment !== 'all' && (
                <span className="bg-white border border-stone-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  Dept: {departmentsList.find(d => d.id === selectedDepartment)?.label || selectedDepartment}
                  <button onClick={() => setSelectedDepartment('all')}><X className="w-3 h-3 text-stone-400 hover:text-stone-700" /></button>
                </span>
              )}
              {selectedCategory && (
                <span className="bg-white border border-stone-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  Category: {selectedCategory}
                  <button onClick={() => setSelectedCategory('')}><X className="w-3 h-3 text-stone-400 hover:text-stone-700" /></button>
                </span>
              )}
              {selectedBrand && selectedBrand !== 'All' && (
                <span className="bg-white border border-stone-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  Brand: {selectedBrand}
                  <button onClick={() => setSelectedBrand('')}><X className="w-3 h-3 text-stone-400 hover:text-stone-700" /></button>
                </span>
              )}
              {selectedSize && selectedSize !== 'All' && (
                <span className="bg-white border border-stone-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  {selectedSize}
                  <button onClick={() => setSelectedSize('')}><X className="w-3 h-3 text-stone-400 hover:text-stone-700" /></button>
                </span>
              )}
              {priceRange < 200000 && (
                <span className="bg-white border border-stone-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  Under KSh {priceRange.toLocaleString()}
                  <button onClick={() => setPriceRange(200000)}><X className="w-3 h-3 text-stone-400 hover:text-stone-700" /></button>
                </span>
              )}
              <button
                onClick={handleResetFilters}
                className="text-amber-800 hover:underline font-bold ml-auto cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Results Summary */}
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>
              {search ? (
                <>
                  Showing <strong>{products.length}</strong> {products.length === 1 ? 'product' : 'products'} matching <strong>"{search}"</strong>
                </>
              ) : (
                <>
                  Showing <strong>{products.length}</strong> {products.length === 1 ? 'product' : 'products'}
                </>
              )}
            </span>
            {search && (
              <button
                onClick={() => handleSearchInputChange('')}
                className="text-amber-800 hover:underline font-semibold cursor-pointer"
              >
                Clear search filter
              </button>
            )}
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-96 rounded-2xl bg-stone-100 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="font-serif font-bold text-lg text-stone-900">
                {search 
                  ? `No products found matching "${search}"` 
                  : hasActiveFilters 
                    ? 'No products found matching filters' 
                    : 'No products available yet.'}
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {search
                  ? 'Try checking for spelling mistakes or searching by general terms like mattress, pillow, bed, or shoe.'
                  : hasActiveFilters 
                    ? 'Try widening your price limit or clearing filters to view all available products.'
                    : 'Products will appear here once added to the catalog by the administrator.'}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                {search && (
                  <button
                    onClick={() => handleSearchInputChange('')}
                    className="bg-amber-100 text-amber-900 hover:bg-amber-200 text-xs font-bold px-4 py-2 rounded-full transition-colors cursor-pointer"
                  >
                    Clear Search Query
                  </button>
                )}
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-colors cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={onSelectProduct}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto lg:hidden">
          <div 
            onClick={() => setIsMobileFilterOpen(false)}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm"
          />
          <div className="relative bg-white min-h-screen p-6 space-y-6 z-10">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-serif font-bold text-lg text-stone-900">Filters</h3>
              <button onClick={() => setIsMobileFilterOpen(false)} className="p-1 text-stone-500 cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile Search */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-2">Search Keywords</label>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  placeholder="Search by name, description, size..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-8 pr-7 py-2.5 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-3" />
                {search && (
                  <button
                    type="button"
                    onClick={() => handleSearchInputChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Department Selection */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-2">Department</label>
              <div className="grid grid-cols-2 gap-2">
                {departmentsList.map((dep) => (
                  <button
                    key={dep.id}
                    onClick={() => {
                      setSelectedDepartment(dep.id);
                      setSelectedCategory('');
                    }}
                    className={`p-2 rounded-xl text-xs font-semibold text-left border ${
                      selectedDepartment === dep.id
                        ? 'border-amber-700 bg-amber-50 text-amber-900 font-bold'
                        : 'border-stone-200 text-stone-700'
                    }`}
                  >
                    {dep.icon} {dep.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Category */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-2">Category</label>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${
                    selectedCategory === '' ? 'bg-amber-100 text-amber-900 font-bold' : 'text-stone-700'
                  }`}
                >
                  All Categories
                </button>
                {displayedCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.slug)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${
                      selectedCategory === c.slug ? 'bg-amber-100 text-amber-900 font-bold' : 'text-stone-700'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex gap-3">
              <button
                onClick={handleResetFilters}
                className="flex-1 py-3 bg-stone-100 text-stone-700 font-bold text-xs rounded-xl"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-3 bg-stone-900 text-white font-bold text-xs rounded-xl"
              >
                View Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
