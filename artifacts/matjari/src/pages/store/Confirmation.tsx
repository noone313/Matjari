import React, { useEffect, useState } from 'react';
import { useGetStore, getGetStoreQueryKey } from '@workspace/api-client-react';
import { formatPrice } from '@/lib/utils';
import { Link, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export default function StoreConfirmation() {
  const { slug, orderId } = useParams();
  const { data: store } = useGetStore(slug || '', { query: { enabled: !!slug, queryKey: getGetStoreQueryKey(slug || '') } });
  
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Reveal content after seal animation
    const timer = setTimeout(() => setShowContent(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-4 relative">
      
      {/* Wax Seal Animation */}
      <div className="relative mb-12 flex justify-center">
        <div 
          className="w-32 h-32 rounded-full flex items-center justify-center text-white text-5xl font-serif font-bold shadow-2xl z-10"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #F6E27F, #D4AF37, #AA7C11)',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5), 0 10px 20px rgba(0,0,0,0.2)',
            animation: 'sealStamp 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            border: '4px solid rgba(255,255,255,0.2)'
          }}
        >
          {store?.storeName?.charAt(0) || 'M'}
        </div>
        
        {/* Decorative inner circle */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-dashed border-white/40 z-20 pointer-events-none"
          style={{ animation: 'fadeIn 0.5s ease-out 0.8s forwards', opacity: 0 }}
        />
      </div>

      <style dangerouslySetInnerHTML={{__html:`
        @keyframes sealStamp {
          0% { transform: scale(3) rotate(-15deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}} />

      <div className={`text-center space-y-6 max-w-lg transition-all duration-700 ease-out transform ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-2">
          <Check className="w-6 h-6" />
        </div>
        
        <h1 className="text-4xl font-bold font-serif text-gray-900">تم تأكيد طلبك!</h1>
        
        <p className="text-lg text-gray-600 leading-relaxed">
          شكراً لتسوقك من <strong className="text-gray-900 font-serif">{store?.storeName}</strong>. لقد تلقينا طلبك بنجاح وسنقوم بتجهيزه قريباً.
        </p>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-8 inline-block text-right">
          <div className="text-sm text-gray-500 mb-1">رقم الطلب</div>
          <div className="text-2xl font-bold font-mono text-gray-900 mb-4">#{orderId}</div>
          <p className="text-sm text-gray-600 mb-4">يرجى الاحتفاظ برقم الطلب للمراجعة.</p>
        </div>

        <div className="pt-8">
          <Link href={`/store/${slug}`}>
            <Button variant="outline" className="h-12 px-8 font-bold border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900">
              العودة للمتجر
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
