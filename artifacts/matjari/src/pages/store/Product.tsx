import React, { useState, useEffect } from 'react';
import { useGetStoreProduct, getGetStoreProductQueryKey, useGetRelatedProducts, getGetRelatedProductsQueryKey, useGetProductReviews, getGetProductReviewsQueryKey, useCreateProductReview } from '@workspace/api-client-react';
import { useCart } from '@/contexts/CartContext';
import { formatPrice, getCategoryLabel } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, Droplet, Leaf, Share2, Check, Star } from 'lucide-react';
import { Link } from 'wouter';
import { FragrancePyramid } from '@/components/store/FragrancePyramid';

export default function StoreProduct({ slug, productId }: { slug: string, productId: string }) {
  const { data: product, isLoading } = useGetStoreProduct(slug, Number(productId), { query: { enabled: !!slug && !!productId, queryKey: getGetStoreProductQueryKey(slug, Number(productId)) } });
  const { addToCart } = useCart();
  const { toast } = useToast();

  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>('');
  const [shared, setShared] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: product?.name, url }).catch(() => {/* user cancelled */});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      });
    }
  };

  useEffect(() => {
    if (product && product.variants.length > 0 && !selectedVariant) {
      setSelectedVariant(product.variants[0].id);
    }
    if (product && product.imageUrls && product.imageUrls.length > 0 && !activeImage) {
      setActiveImage(product.imageUrls[0]);
    }
  }, [product, selectedVariant, activeImage]);

  const { data: relatedProducts } = useGetRelatedProducts(slug, Number(productId), {
    query: { enabled: !!slug && !!productId, queryKey: getGetRelatedProductsQueryKey(slug, Number(productId)) },
  });

  const { data: reviewsData, refetch: refetchReviews } = useGetProductReviews(slug, Number(productId), {
    query: { enabled: !!slug && !!productId, queryKey: getGetProductReviewsQueryKey(slug, Number(productId)) },
  });

  const createReview = useCreateProductReview();

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || reviewRating < 1) return;
    createReview.mutate({
      slug,
      productId: Number(productId),
      data: {
        customerName: reviewName.trim(),
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      },
    }, {
      onSuccess: () => {
        setReviewSubmitted(true);
        refetchReviews();
      },
      onError: () => {
        toast({ title: 'تعذر إرسال التقييم، حاول مرة أخرى' });
      },
    });
  };

  if (isLoading) return <div className="text-center py-24">جاري التحميل...</div>;
  if (!product) return <div className="text-center py-24">المنتج غير موجود</div>;

  const currentVariant = product.variants.find(v => v.id === selectedVariant) || product.variants[0];
  const totalStock = product.variants.reduce((s, v) => s + (v.stock ?? 0), 0);
  const currentStock = currentVariant?.stock ?? 0;
  const isOutOfStock = currentStock <= 0;
  const isFragrance = product.category.startsWith('perfume') || product.category === 'oud';
  const isSkincare = product.category === 'skincare' || product.category === 'makeup';

  const handleAddToCart = () => {
    if (!currentVariant) return;
    if (currentStock <= 0) {
      toast({ title: 'هذا المنتج غير متوفر حالياً' });
      return;
    }
    const qty = Math.min(quantity, currentStock);
    if (qty < 1) return;
    addToCart({
      productId: product.id,
      variantId: currentVariant.id,
      productName: product.name,
      variantLabel: currentVariant.variantLabel,
      price: currentVariant.price,
      quantity: qty,
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
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-[hsl(var(--primary))] font-medium tracking-wide">
                {getCategoryLabel(product.category)}
              </span>
              {reviewsData && reviewsData.averageRating > 0 && (
                <div className="flex items-center gap-1.5" title="متوسط تقييم العملاء">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(reviewsData.averageRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{reviewsData.averageRating} ({reviewsData.reviews.length})</span>
                </div>
              )}
              {totalStock > 0 && totalStock <= 5 && (
                <span className="text-[10px] uppercase tracking-widest bg-zinc-900 text-white px-2 py-0.5">
                  متبقي {totalStock} فقط
                </span>
              )}
            </div>
            <button
              onClick={handleShare}
              title="مشاركة المنتج"
              className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              {shared ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
            </button>
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
                    onClick={() => { setSelectedVariant(v.id); setQuantity(1); }}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all border ${
                      selectedVariant === v.id 
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white shadow-sm' 
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    } ${(v.stock ?? 0) <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    disabled={(v.stock ?? 0) <= 0}
                  >
                    {v.variantLabel}
                    {(v.stock ?? 0) <= 0 && (
                      <span className={`mr-2 text-[10px] uppercase tracking-widest ${selectedVariant === v.id ? 'text-white/80' : 'text-red-500'}`}>
                        غير متوفر
                      </span>
                    )}
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
                className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => setQuantity(Math.min(quantity + 1, Math.max(currentStock, 1)))}
                disabled={isOutOfStock || quantity >= currentStock}
              >+</button>
            </div>
            
            <Button 
              onClick={handleAddToCart} 
              disabled={isOutOfStock}
              className="h-14 flex-1 text-lg font-bold shadow-lg hover:shadow-xl transition-shadow bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-900"
              style={{ backgroundColor: 'hsl(var(--primary))' }}
            >
              {isOutOfStock ? 'غير متوفر' : 'إضافة للسلة'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Related products ─────────────────── */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="mt-12 border-t border-zinc-100 pt-10 px-6 pb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 text-center mb-6">
            {isFragrance ? 'عطور مشابهة' : isSkincare ? 'أكمل مجموعتك' : 'منتجات مشابهة'}
          </p>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {relatedProducts.map(p => {
              const minPrice = p.variants?.length ? Math.min(...p.variants.map(v => v.price)) : 0;
              return (
                <Link key={p.id} href={`/store/${slug}/product/${p.id}`} className="shrink-0 w-40 sm:w-44">
                  <div className="bg-white group cursor-pointer border border-zinc-100">
                    <div className="aspect-[3/4] overflow-hidden bg-zinc-50">
                      {p.imageUrls?.[0] ? (
                        <img src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-serif text-zinc-200">
                          {p.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-serif text-zinc-900 line-clamp-1">{p.name}</h3>
                      <p className="text-sm text-zinc-500 mt-1">{formatPrice(minPrice)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Reviews ─────────────────────────────── */}
      <div className="border-t border-zinc-100 px-6 py-10">
        <h2 className="text-lg font-bold text-gray-900 mb-6">تقييمات العملاء</h2>

        {reviewsData && reviewsData.reviews.length > 0 ? (
          <div className="space-y-4">
            {reviewsData.reviews.map(r => (
              <div key={r.id} className="border border-gray-100 rounded-lg p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                      {r.customerName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{r.customerName}</p>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('ar-IQ')}</span>
                </div>
                {r.comment && <p className="text-gray-600 leading-relaxed">{r.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">لا توجد تقييمات بعد — كن أول من يقيّم هذا المنتج</p>
        )}

        {/* Add review form */}
        <div className="mt-10 bg-gray-50 border border-gray-100 rounded-xl p-6">
          {reviewSubmitted ? (
            <p className="text-green-600 font-medium">شكراً لك! سيظهر تقييمك بعد مراجعة المتجر.</p>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <h3 className="font-bold text-gray-900">أضف تقييمك</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسمك</Label>
                  <Input
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="مثال: زينب"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>تقييمك</Label>
                  <div className="flex items-center gap-1 pt-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewRating(i)}
                        className="p-0.5 transition-transform hover:scale-110"
                        aria-label={`${i} من 5`}
                      >
                        <Star className={`w-7 h-7 ${i <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>تعليقك (اختياري)</Label>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="شارك تجربتك مع هذا المنتج..."
                />
              </div>
              <Button
                type="submit"
                disabled={!reviewName.trim() || reviewRating < 1 || createReview.isPending}
                className="h-11 px-8 font-bold"
                style={{ backgroundColor: 'hsl(var(--primary))' }}
              >
                {createReview.isPending ? 'جاري الإرسال...' : 'إرسال التقييم'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
