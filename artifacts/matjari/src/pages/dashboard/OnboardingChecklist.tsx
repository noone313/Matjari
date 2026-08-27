import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useGetDashboardSettings, useListProducts, useListHeroSlides } from '@workspace/api-client-react';
import { useListDashboardCategories } from '@/hooks/useCategories';
import { Check, Circle, ChevronDown, ChevronUp, Rocket, Package, MessageCircle, Image, FileText, CreditCard, Layers } from 'lucide-react';

const DISMISS_KEY = 'onboarding_dismissed';

interface Step {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
  icon: React.ReactNode;
}

export default function OnboardingChecklist() {
  const { data: settings, isLoading: settingsLoading } = useGetDashboardSettings();
  const { data: products, isLoading: productsLoading } = useListProducts();
  const { data: heroData, isLoading: heroLoading } = useListHeroSlides();
  const { data: categories, isLoading: categoriesLoading } = useListDashboardCategories();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  const [expanded, setExpanded] = useState(true);

  const isLoading = settingsLoading || productsLoading || heroLoading || categoriesLoading;

  useEffect(() => {
    if (dismissed) {
      try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    } else {
      try { localStorage.removeItem(DISMISS_KEY); } catch {}
    }
  }, [dismissed]);

  if (isLoading || !settings) return null;

  const steps: Step[] = [
    {
      id: 'category',
      label: 'أنشئ فئتك الأولى',
      description: 'أضف فئة تناسب منتجاتك — مثل: ملابس، إلكترونيات، عطور... أي فئة تريدها',
      done: (categories?.length ?? 0) > 0,
      href: '/dashboard/categories',
      icon: <Layers className="w-5 h-5" />,
    },
    {
      id: 'product',
      label: 'أضف منتجك الأول',
      description: 'ارفع منتجاً مع صورة وسعر لبدء البيع',
      done: (products?.length ?? 0) > 0,
      href: '/dashboard/products/new',
      icon: <Package className="w-5 h-5" />,
    },
    {
      id: 'whatsapp',
      label: 'اربط واتساب',
      description: 'أضف رقم واتساب ليتمكن العملاء من التواصل معك',
      done: !!settings.whatsappNumber && settings.whatsappNumber.length > 0,
      href: '/dashboard/settings',
      icon: <MessageCircle className="w-5 h-5" />,
    },
    {
      id: 'hero',
      label: 'فعّل معرض الصور',
      description: 'أضف صوراً للعرض في أعلى متجرك كمعرض متحرك',
      done: !!settings.heroEnabled && (heroData?.slides?.length ?? 0) > 0,
      href: '/dashboard/settings',
      icon: <Image className="w-5 h-5" />,
    },
    {
      id: 'banner',
      label: 'أضف صورة غلاف',
      description: 'صورة غلاف تظهر في أعلى صفحة المتجر',
      done: !!settings.bannerUrl && settings.bannerUrl.length > 0,
      href: '/dashboard/settings',
      icon: <Image className="w-5 h-5" />,
    },
    {
      id: 'description',
      label: 'اكتب وصفاً للمتجر',
      description: 'وصف قصير يظهر للعملاء تحت اسم متجرك',
      done: !!settings.description && settings.description.length > 0,
      href: '/dashboard/settings',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: 'bank',
      label: 'أضف معلومات التحويل البنكي',
      description: 'تفاصيل الحساب البنكي التي تظهر للعملاء عند الدفع',
      done: !!settings.bankTransferInfo && settings.bankTransferInfo.length > 0,
      href: '/dashboard/settings',
      icon: <CreditCard className="w-5 h-5" />,
    },
  ];

  const completed = steps.filter(s => s.done).length;
  const total = steps.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = completed === total;

  if (dismissed && allDone) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${allDone ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
            <Rocket className="w-5 h-5" />
          </div>
          <div className="text-right">
            <h3 className="font-bold text-gray-900">
              {allDone ? 'متجرك جاهز!' : 'جهّز متجرك للبيع'}
            </h3>
            <p className="text-sm text-gray-500">
              {allDone ? 'أكملت كل الخطوات — متجرك مفتوح للعملاء' : `${completed} من ${total} خطوات مكتملة`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${allDone ? 'text-green-600' : 'text-gray-700'}`}>{pct}%</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-5 space-y-3">
          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-green-500' : 'bg-gray-900'}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Steps */}
          <ul className="space-y-2 mt-3">
            {steps.map(step => (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    step.done
                      ? 'bg-green-50 hover:bg-green-100'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className={`shrink-0 ${step.done ? 'text-green-600' : 'text-gray-300'}`}>
                    {step.done ? <Check className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </span>
                  <span className={`shrink-0 ${step.done ? 'text-green-500' : 'text-gray-400'}`}>
                    {step.icon}
                  </span>
                  <div className="flex-1 min-w-0 text-right">
                    <span className={`text-sm font-medium ${step.done ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                      {step.label}
                    </span>
                    {!step.done && (
                      <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Dismiss */}
          <div className="pt-2 text-center">
            <button
              onClick={() => setDismissed(true)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {allDone ? 'إخفاء' : 'ليس الآن'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
