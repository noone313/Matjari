import React from 'react';
import { Link } from 'wouter';
import { Sparkles, Package, Shield, CreditCard, MessageCircle, Instagram, ArrowRight, Star, Zap, Truck } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">
      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-48">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-50 via-white to-white" />
        <div className="absolute top-0 right-0 w-full h-full opacity-5">
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <main className="relative max-w-screen-xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 border border-zinc-200 text-xs tracking-widest uppercase text-zinc-600 mb-8">
            <Zap className="w-3 h-3 text-[hsl(var(--primary))]" />
            <span>منصة متجري — متجرك الإلكتروني الخاص بالعطور والكوزمتك</span>
          </div>

          <h1 className="font-serif font-bold text-4xl md:text-6xl lg:text-7xl tracking-tight leading-[1.1] mb-6">
متجر إلكتروني خاص بكل تاجر عطور
            <br />
            <span className="text-[hsl(var(--primary))]">بدون تعقيدات</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            أوقف البيع المبعثر عبر الدايركت. احصل على متجر احترافي برابط واحد، 
            نظام مخزون ذكي، أكواد خصم، ودفع عند الاستلام — جاهز خلال دقائق.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors shadow-sm hover:shadow-md">
              <Sparkles className="w-5 h-5" />
              <span>ابدأ مجاناً الآن</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 border-2 border-zinc-200 text-zinc-700 rounded-lg font-medium hover:border-zinc-400 hover:bg-zinc-50 transition-colors">
              <span>لدي حساب بالفعل</span>
            </Link>
          </div>

          <p className="mt-6 text-sm text-zinc-400">لا حاجة لبطاقة ائتمان • إعداد في دقائق • إلغاء في أي وقت</p>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-12 text-zinc-400 text-sm">
            <div className="flex items-center gap-2"><Shield className="w-4 h-4" /><span>مخزون محمي</span></div>
            <div className="flex items-center gap-2"><CreditCard className="w-4 h-4" /><span>دفع عند الاستلام</span></div>
            <div className="flex items-center gap-2"><Truck className="w-4 h-4" /><span>شحن مدمج</span></div>
            <div className="flex items-center gap-2"><Star className="w-4 h-4 fill-[hsl(var(--primary))] text-[hsl(var(--primary))]" /><span>تقييمات العملاء</span></div>
          </div>
        </main>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-white border-y border-zinc-100">
        <div className="max-w-screen-xl mx-auto px-6">
          <header className="text-center mb-16 md:mb-20">
            <h2 className="font-serif font-bold text-3xl md:text-4xl tracking-tight mb-4">
              كل ما يحتاجه متجر عطور ناجح
            </h2>
            <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
              ميزات حقيقية مطورة للتجار الصغار — لا إضافات وهمية، لا تعقيد.
            </p>
          </header>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Package,
                title: 'متجر خاص برابط واحد',
                desc: 'كل تاجر يحصل على نطاق فرعي خاص (store.yourname.matjari.iq) وصفحة رئيسية احترافية مع بنر، أقسام، وقدرة على تخصيص الألوان والشعار.',
              },
              {
                icon: Shield,
                title: 'حماية من نفاد المخزون',
                desc: 'نظام مخزون ذكي يمنع البيع عند النفاد، مع تنبيهات فورية للتاجر عند وصول منتج للحد الأدنى، وزر «أعلمني عند التوفر» للعملاء.',
              },
              {
                icon: CreditCard,
                title: 'دفع بسيط وآمن',
                desc: 'طريقتان فقط: دفع نقدي عند الاستلام (COD) أو تحويل بنكي. لا بوابات دفع معقدة، لا عمولات خفية، لا تجميد أموال.',
              },
              {
                icon: MessageCircle,
                title: 'تواصل مباشر مع العملاء',
                desc: 'أزرار واتساب وانستقرام مدمجة في كل صفحة منتج وفي الفوتر. العميل يضغط ويتحدث مع التاجر فوراً — لا نماذج اتصال معقدة.',
              },
              {
                icon: Star,
                title: 'تقييمات ونجوم بموافقة التاجر',
                desc: 'العملاء يتركون تقييماتهم، والتاجر يقرر ما يظهر علناً. متوسط النجوم يظهر في كرت المنتج وصفحة المنتج — يبني ثقة حقيقية.',
              },
              {
                icon: Zap,
                title: 'أكواد خصم ومرونة التسعير',
                desc: 'خصم بنسبة مئوية أو مبلغ ثابت، قابل للتحديد بمنتجات أو فئات معينة، بتاريخ بداية ونهاية، وحد أقصى للاستخدام.',
              },
            ].map((feature, i) => (
              <article key={i} className="group p-6 md:p-8 bg-zinc-50/50 border border-zinc-100 rounded-xl hover:border-[hsl(var(--primary))] hover:bg-white transition-all duration-300 hover:shadow-lg">
                <div className="w-12 h-12 rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] flex items-center justify-center mb-5 group-hover:bg-[hsl(var(--primary))] group-hover:text-white transition-colors">
                  <feature.icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <h3 className="font-serif font-bold text-xl text-zinc-900 mb-2">{feature.title}</h3>
                <p className="text-zinc-500 leading-relaxed">{feature.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-zinc-50">
        <div className="max-w-screen-xl mx-auto px-6">
          <header className="text-center mb-16 md:mb-20">
            <h2 className="font-serif font-bold text-3xl md:text-4xl tracking-tight mb-4">
              كيف تبدأ في 3 خطوات
            </h2>
            <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
              من التسجيل إلى أول طلب خلال دقائق — لا مهارات تقنية مطلوبة.
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'سجّل حسابك',
                desc: 'أدخل بريدك الإلكتروني، اختر اسم متجرك، وكلمة مرور. لا حاجة لبطاقة بنكية أو مستندات معقدة.',
                icon: Sparkles,
              },
              {
                step: '02',
                title: 'عبّي منتجاتك',
                desc: 'أضف عطورك وكوزمتك: صور، أوصاف، خيارات (حجم/لون)، أسعار، ومخزون. يدعم الباقات (bundles) للهدايا.',
                icon: Package,
              },
              {
                step: '03',
                title: 'شارك رابطك وابدأ البيع',
                desc: 'نسخ رابط متجرك وشاركه على انستقرام، تيك توك، واتساب. العملاء يتصفحون، يطلبون، وتدفع لهم عند الاستلام.',
                icon: ArrowRight,
              },
            ].map((step, i) => (
              <article key={i} className="relative text-center p-6 md:p-8">
                <div className="absolute top-0 right-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-zinc-400 text-lg md:text-xl">
                  {step.step}
                </div>
                <div className="pt-10">
                  <div className="w-14 h-14 mx-auto mb-5 rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] flex items-center justify-center">
                    <step.icon className="w-7 h-7" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif font-bold text-xl text-zinc-900 mb-2">{step.title}</h3>
                  <p className="text-zinc-500 leading-relaxed">{step.desc}</p>
                </div>
              </article>
            ))}
          </div>

          {/* CTA at bottom of steps */}
          <div className="mt-16 text-center">
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors shadow-sm hover:shadow-md">
              <Sparkles className="w-5 h-5" />
              <span>أنشئ متجرك مجاناً الآن</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Social proof / Platform stats ───────────────── */}
      <section className="py-24 md:py-32 bg-white border-y border-zinc-100">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { value: '500+', label: 'متجر نشط' },
              { value: '10K+', label: 'منتج معروض' },
              { value: '99.9%', label: 'توفر الخدمة' },
              { value: '0', label: 'عمولة على المبيعات' },
            ].map((stat, i) => (
              <div key={i} className="p-6">
                <div className="font-serif font-bold text-4xl md:text-5xl text-zinc-900 mb-2">{stat.value}</div>
                <div className="text-zinc-500 tracking-widest uppercase text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-zinc-900 text-white">
        <div className="max-w-screen-xl mx-auto px-6 text-center">
          <h2 className="font-serif font-bold text-3xl md:text-4xl tracking-tight mb-4">
            جاهز لبدء متجر العطور الخاص بك؟
          </h2>
          <p className="text-zinc-300 text-lg max-w-2xl mx-auto mb-10">
            انضم لمئات التجار الذين انتقلوا من الدايركت المبعثر إلى متجر احترافي 
            يدير المخزون، الطلبات، والعملاء بأسلوب منظم.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white text-zinc-900 rounded-lg font-medium hover:bg-zinc-100 transition-colors shadow-sm hover:shadow-md">
              <Sparkles className="w-5 h-5" />
              <span>ابدأ مجاناً الآن</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 border-2 border-zinc-600 text-zinc-100 rounded-lg font-medium hover:border-zinc-400 hover:bg-zinc-800 transition-colors">
              <span>دخول للتجار الحاليين</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="bg-zinc-50 border-t border-zinc-100 py-12 px-6">
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[hsl(var(--primary))]" />
            <span className="font-serif font-bold text-zinc-900">متجري</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/register" className="hover:text-zinc-900 transition-colors">إنشاء متجر</Link>
            <Link href="/login" className="hover:text-zinc-900 transition-colors">تسجيل الدخول</Link>
          </nav>
          <p className="text-xs">© 2025 متجري — منصة متاجر العطور والكوزمتك العراقية</p>
        </div>
      </footer>
    </div>
  );
}