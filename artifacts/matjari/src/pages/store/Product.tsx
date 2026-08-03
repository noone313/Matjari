import React, { useState, useEffect } from 'react';
import { useGetStoreProduct, getGetStoreProductQueryKey } from '@workspace/api-client-react';
import { useCart } from '@/contexts/CartContext';
import { formatPrice, getCategoryLabel } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, Droplet, Leaf, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';

function FragrancePyramid({ top, heart, base }: { top?: string|null, heart?: string|null, base?: string|null }) {
  const [filled, setFilled] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setFilled(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const Bar = ({ label, note, delay }: { label: string, note?: string|null, delay: string }) => {
    if (!note) return null;
    return (
      <div className="flex flex-col gap-1 w-full max-w-sm mx-auto mb-4">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</span>
        <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
          <div 
            className="absolute top-0 right-0 h-full bg-[hsl(var(--primary))] opacity-20 transition-all duration-1000 ease-out"
            style={{ width: filled ? '100%' : '0%', transitionDelay: delay }}
          />
          <div 
            className="absolute top-0 right-0 h-full w-1 bg-[hsl(var(--primary))] transition-all duration-1000 ease-out"
            style={{ right: filled ? '100%' : '0%', transitionDelay: delay, transform: 'translateX(100%)' }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-900 z-10">
            {note}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="py-6 border-t border-b border-gray-100 my-8 text-center">
      <h3 className="font-serif font-bold text-lg mb-6 text-gray-900">الهرم العطري</h3>
      <Bar label="المقدمة" note={top} delay="0ms" />
      <Bar label="القلب" note={heart} delay="200ms" />
      <Bar label="القاعدة" note={base} delay="400ms" />
    </div>
  );
}

export default function StoreProduct({ slug, productId }: { slug: string, productId: string }) {
  const { data: product, isLoading } = useGetStoreProduct(slug, Number(productId), { query: { enabled: !!slug && !!productId, queryKey: getGetStoreProductQueryKey(slug, Number(productId)) } });
  const { addToCart } = useCart();
  const { toast } = useToast();

  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>('');

  useEffect(() => {
    if (product && product.variants.length > 0 && !selectedVariant) {
      setSelectedVariant(product.variants[0].id);
    }
    if (product && product.imageUrls && product.imageUrls.length > 0 && !activeImage) {
      setActiveImage(product.imageUrls[0]);
    }
  }, [product, selectedVariant, activeImage]);

  if (isLoading) return <div className="text-center py-24">جاري التحميل...</div>;
  if (!product) return <div className="text-center py-24">المنتج غير موجود</div>;

  const currentVariant = product.variants.find(v => v.id === selectedVariant) || product.variants[0];
  const isFragrance = product.category.startsWith('perfume') || product.category === 'oud';
  const isSkincare = product.category === 'skincare' || product.category === 'makeup';

  const handleAddToCart = () => {
    if (!currentVariant) return;
    addToCart({
      productId: product.id,
      variantId: currentVariant.id,
      productName: product.name,
      variantLabel: currentVariant.variantLabel,
      price: currentVariant.price,
      quantity,
      image: product.imageUrls?.[0],
      category: product.category
    });
    toast({ title: 'تمت الإضافة للسلة' });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <Link href={`/store/${slug}`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronRight className="w-4 h-4 ml-1" /> العودة للمتجر
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Images */}
        <div className="p-6 md:border-l border-gray-100 flex flex-col items-center">
          <div className="aspect-square w-full max-w-md bg-gray-50 rounded-lg overflow-hidden mb-4 border border-gray-100">
            {activeImage ? (
              <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">بدون صورة</div>
            )}
          </div>
          {product.imageUrls && product.imageUrls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto w-full max-w-md justify-center">
              {product.imageUrls.map((img, i) => (
                <button 
                  key={i} 
                  onClick={() => setActiveImage(img)}
                  className={`w-20 h-20 rounded-md overflow-hidden border-2 transition-colors ${activeImage === img ? 'border-[hsl(var(--primary))]' : 'border-transparent hover:border-gray-200'}`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-8 lg:p-12 flex flex-col justify-center">
          <div className="mb-2 text-sm text-[hsl(var(--primary))] font-medium tracking-wide">
            {getCategoryLabel(product.category)}
          </div>
          <h1 className="text-4xl font-bold font-serif text-gray-900 mb-4 leading-tight">{product.name}</h1>
          
          <div className="text-3xl font-bold text-gray-900 mb-6">
            {currentVariant ? formatPrice(currentVariant.price) : ''}
          </div>

          {product.description && (
            <p className="text-gray-600 leading-relaxed mb-8">{product.description}</p>
          )}

          {isFragrance && (product.noteTop || product.noteHeart || product.noteBase) && (
            <FragrancePyramid top={product.noteTop} heart={product.noteHeart} base={product.noteBase} />
          )}

          {isSkincare && (
            <div className="space-y-4 mb-8 bg-gray-50 p-6 rounded-lg border border-gray-100">
              {product.skinType && (
                <div className="flex items-start gap-3">
                  <Droplet className="w-5 h-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900 block mb-1">نوع البشرة المناسب</span>
                    <span className="text-gray-600">{product.skinType}</span>
                  </div>
                </div>
              )}
              {product.ingredients && (
                <div className="flex items-start gap-3 pt-4 border-t border-gray-200">
                  <Leaf className="w-5 h-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900 block mb-1">المكونات الرئيسية</span>
                    <span className="text-gray-600 text-sm leading-relaxed">{product.ingredients}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Variants */}
          {product.variants.length > 1 && (
            <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-3">اختر الخيار</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v.id)}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all border ${
                      selectedVariant === v.id 
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white shadow-sm' 
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {v.variantLabel}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mt-auto">
            <div className="flex items-center border border-gray-300 rounded-lg h-14 w-full sm:w-32">
              <button 
                type="button"
                className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-gray-900"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >-</button>
              <input 
                type="text" 
                readOnly 
                value={quantity} 
                className="w-full text-center font-bold bg-transparent outline-none"
              />
              <button 
                type="button"
                className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-gray-900"
                onClick={() => setQuantity(quantity + 1)}
              >+</button>
            </div>
            
            <Button 
              onClick={handleAddToCart} 
              className="h-14 flex-1 text-lg font-bold shadow-lg hover:shadow-xl transition-shadow bg-gray-900 text-white hover:bg-gray-800"
              style={{ backgroundColor: 'hsl(var(--primary))' }}
            >
              إضافة للسلة
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
