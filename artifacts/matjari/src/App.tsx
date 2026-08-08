import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';

import { handleApiError } from '@/lib/sessionExpired';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { ComparisonProvider } from './contexts/ComparisonContext';
import NotFound from '@/pages/not-found';

// --- Dashboard Pages ---
import Login from '@/pages/dashboard/Login';
import Register from '@/pages/dashboard/Register';
import Overview from '@/pages/dashboard/Overview';
import Products from '@/pages/dashboard/Products';
import ProductForm from '@/pages/dashboard/ProductForm';
import Orders from '@/pages/dashboard/Orders';
import OrderDetail from '@/pages/dashboard/OrderDetail';
import Discounts from '@/pages/dashboard/Discounts';
import Reviews from '@/pages/dashboard/Reviews';
import Bundles from '@/pages/dashboard/Bundles';
import BundleForm from '@/pages/dashboard/BundleForm';
import Settings from '@/pages/dashboard/Settings';
import DashboardLayout from '@/components/layout/DashboardLayout';

// --- Public Pages ---
import Landing from '@/pages/Landing';

// --- Storefront Pages ---
import StoreLayout from '@/components/layout/StoreLayout';
import StoreHome from '@/pages/store/Home';
import StoreProduct from '@/pages/store/Product';
import StoreCompare from '@/pages/store/Compare';
import StoreCart from '@/pages/store/Cart';
import StoreCheckout from '@/pages/store/Checkout';
import StoreConfirmation from '@/pages/store/Confirmation';

// Centralized 401 handling: an expired/invalid session on any protected
// dashboard request clears the stored session and redirects to /login.
const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (error) => handleApiError(error) }),
  mutationCache: new MutationCache({ onError: (error) => handleApiError(error) }),
});

function DashboardRouter() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/register" component={Register} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <DashboardLayout>
      <Switch>
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
        <Route path="/dashboard/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function StoreRouter({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  return (
    <CartProvider storeSlug={slug}>
      <ComparisonProvider storeSlug={slug}>
        <StoreLayout slug={slug}>
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
        </StoreLayout>
      </ComparisonProvider>
    </CartProvider>
  );
}

function MainRouter() {
  useEffect(() => {
    // Enforce RTL at document level
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }, []);

  return (
    <Switch>
      <Route path="/store/:slug/*?" component={StoreRouter} />
      <Route path="/store/:slug" component={StoreRouter} />

      {/* Public landing page at root for unauthenticated visitors */}
      <Route path="/">
        <Landing />
      </Route>

      {/* Auth pages - handled by DashboardRouter which checks authentication */}
      <Route path="/register" component={DashboardRouter} />
      <Route path="/login" component={DashboardRouter} />

      {/* Protected dashboard routes */}
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
