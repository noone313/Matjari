import React, { Suspense, lazy, useEffect } from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';

import { handleApiError } from '@/lib/sessionExpired';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { ComparisonProvider } from './contexts/ComparisonContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { StoreCategoriesProvider } from './contexts/StoreCategoriesContext';
import NotFound from '@/pages/not-found';

// --- Dashboard Pages (lazy loaded) ---
const Login = lazy(() => import('@/pages/dashboard/Login'));
const Register = lazy(() => import('@/pages/dashboard/Register'));
const ForgotPassword = lazy(() => import('@/pages/dashboard/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/dashboard/ResetPassword'));
const Overview = lazy(() => import('@/pages/dashboard/Overview'));
const Products = lazy(() => import('@/pages/dashboard/Products'));
const ProductForm = lazy(() => import('@/pages/dashboard/ProductForm'));
const Orders = lazy(() => import('@/pages/dashboard/Orders'));
const OrderDetail = lazy(() => import('@/pages/dashboard/OrderDetail'));
const Discounts = lazy(() => import('@/pages/dashboard/Discounts'));
const Reviews = lazy(() => import('@/pages/dashboard/Reviews'));
const Bundles = lazy(() => import('@/pages/dashboard/Bundles'));
const BundleForm = lazy(() => import('@/pages/dashboard/BundleForm'));
const Categories = lazy(() => import('@/pages/dashboard/Categories'));
const CategoryAttributes = lazy(() => import('@/pages/dashboard/CategoryAttributes'));
const Settings = lazy(() => import('@/pages/dashboard/Settings'));
import DashboardLayout from '@/components/layout/DashboardLayout';

// --- Public Pages ---
const Landing = lazy(() => import('@/pages/Landing'));

// --- Storefront Pages (lazy loaded) ---
import StoreLayout from '@/components/layout/StoreLayout';
const StoreHome = lazy(() => import('@/pages/store/Home'));
const StoreProduct = lazy(() => import('@/pages/store/Product'));
const StoreCompare = lazy(() => import('@/pages/store/Compare'));
const StoreCart = lazy(() => import('@/pages/store/Cart'));
const StoreCheckout = lazy(() => import('@/pages/store/Checkout'));
const StoreConfirmation = lazy(() => import('@/pages/store/Confirmation'));
const StoreWishlist = lazy(() => import('@/pages/store/Wishlist'));
const StoreTrack = lazy(() => import('@/pages/store/Track'));

function PageSpinner() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="animate-pulse text-zinc-300 dark:text-zinc-600 text-sm">...</div>
    </div>
  );
}

// Centralized 401 handling: an expired/invalid session on any protected
// dashboard request clears the stored session and redirects to /login.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,       // 1 minute — data is fresh for 60s
      gcTime: 5 * 60_000,      // 5 minutes — cache kept in memory
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
  queryCache: new QueryCache({ onError: (error) => handleApiError(error) }),
  mutationCache: new MutationCache({ onError: (error) => handleApiError(error) }),
});

function DashboardRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageSpinner />}>
        <Switch>
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route component={Login} />
        </Switch>
      </Suspense>
    );
  }

  return (
    <DashboardLayout>
      <Suspense fallback={<PageSpinner />}>
        <Switch>
          <Route path="/login"><Redirect to="/dashboard" /></Route>
          <Route path="/register"><Redirect to="/dashboard" /></Route>
          <Route path="/">
            <Redirect to="/dashboard" />
          </Route>
          <Route path="/dashboard" component={Overview} />
          <Route path="/dashboard/products" component={Products} />
          <Route path="/dashboard/products/new" component={ProductForm} />
          <Route path="/dashboard/products/:id/edit" component={ProductForm} />
          <Route path="/dashboard/orders" component={Orders} />
          <Route path="/dashboard/orders/:id" component={OrderDetail} />
          <Route path="/dashboard/discounts" component={Discounts} />
          <Route path="/dashboard/reviews" component={Reviews} />
          <Route path="/dashboard/bundles" component={Bundles} />
          <Route path="/dashboard/bundles/new" component={BundleForm} />
          <Route path="/dashboard/bundles/:id/edit" component={BundleForm} />
          <Route path="/dashboard/categories" component={Categories} />
          <Route path="/dashboard/categories/:catId/attributes" component={CategoryAttributes} />
          <Route path="/dashboard/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

function StoreRouter({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <CartProvider storeSlug={slug}>
        <ComparisonProvider storeSlug={slug}>
          <WishlistProvider storeSlug={slug}>
            <StoreCategoriesProvider slug={slug}>
              <StoreLayout slug={slug}>
              <Suspense fallback={<PageSpinner />}>
                <Switch>
                  <Route path="/store/:slug">
                    {() => <StoreHome slug={slug} />}
                  </Route>
                  <Route path="/store/:slug/product/:productId">
                    {(p) => <StoreProduct slug={slug} productId={p?.productId ?? ''} />}
                  </Route>
                  <Route path="/store/:slug/compare">
                    {() => <StoreCompare slug={slug} />}
                  </Route>
                  <Route path="/store/:slug/wishlist">
                    {() => <StoreWishlist slug={slug} />}
                  </Route>
                  <Route path="/store/:slug/track">
                    {() => <StoreTrack slug={slug} />}
                  </Route>
                  <Route path="/store/:slug/cart">
                    {() => <StoreCart slug={slug} />}
                  </Route>
                  <Route path="/store/:slug/checkout">
                    {() => <StoreCheckout slug={slug} />}
                  </Route>
                  <Route path="/store/:slug/confirmation/:orderId">
                    {() => <StoreConfirmation />}
                  </Route>
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
            </StoreLayout>
            </StoreCategoriesProvider>
          </WishlistProvider>
        </ComparisonProvider>
      </CartProvider>
    </ThemeProvider>
  );
}

function MainRouter() {
  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }, []);

  return (
    <Switch>
      <Route path="/store/:slug/*?" component={StoreRouter} />
      <Route path="/store/:slug" component={StoreRouter} />

      <Route path="/">
        <Suspense fallback={<PageSpinner />}>
          <Landing />
        </Suspense>
      </Route>

      <Route path="/register" component={DashboardRouter} />
      <Route path="/login" component={DashboardRouter} />
      <Route path="/forgot-password" component={DashboardRouter} />
      <Route path="/reset-password" component={DashboardRouter} />

      <Route path="/dashboard/*?" component={DashboardRouter} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <MainRouter />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
