import { Link } from 'react-router';
import { productService } from '../utils/db';
import type { Product } from '../utils/types';
import { ProductCard } from '../components/ProductCard';
import { CategoryCarousel } from '../components/CategoryCarousel';
import { ArrowRight, ShoppingBag, Star } from 'lucide-react';
import { motion } from 'motion/react';
import heroImage from '@/imports/hero_crochet.png';
import { useState, useEffect } from 'react';
import { useAuthContext } from '../components/Providers';

export const Home = () => {
  const { setGlobalLoading } = useAuthContext();
  const [products, setProducts] = useState<Product[]>([]);

  const groupedProducts = products.reduce((acc, product) => {
    const cat = product.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setGlobalLoading(true);
      try {
        const data = await productService.getAll();
        if (isMounted) setProducts(data);
      } finally {
        if (isMounted) setGlobalLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
      setGlobalLoading(false);
    };
  }, [setGlobalLoading]);


  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#FAF9F6] py-12 md:py-20 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-left z-10"
          >
            <div className="inline-flex items-center space-x-2 bg-purple-50 text-purple-700 px-4 py-1.5 rounded-full text-sm font-bold mb-6">
              <Star className="w-4 h-4 fill-current" />
              <span>Premium Handcrafted Crochet</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-gray-900 leading-[1.1] mb-6">
              Timeless Art, <br />
              <span className="text-purple-600">Made by Hand.</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-10 max-w-xl leading-relaxed">
              Discover the beauty of handcrafted crochet. From elegant bouquets to unique accessories, each piece is a masterpiece.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <Link
                to="/products"
                className="inline-flex items-center justify-center space-x-3 bg-purple-600 text-white px-6 sm:px-10 py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 group"
              >
                <span>Shop Collection</span>
                <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center justify-center space-x-2 border-2 border-gray-100 text-gray-700 px-6 sm:px-10 py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg hover:bg-gray-50 transition-all"
              >
                <span>Our Story</span>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-purple-200/30 rounded-[3rem] blur-3xl" />
            <img 
              src={heroImage} 
              alt="ABYRA Crochet Collection" 
              className="relative w-full h-auto rounded-[2.5rem] shadow-2xl object-cover aspect-[4/3] lg:aspect-auto"
            />
          </motion.div>
        </div>
      </section>

      {/* Category Carousels */}
      <section className="bg-white">
        {Object.entries(groupedProducts).map(([category, catProducts]) => (
          <CategoryCarousel 
            key={category} 
            title={category} 
            products={catProducts} 
          />
        ))}
        
        {products.length === 0 && (
          <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
              📦
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Restocking our shelves...</h3>
            <p className="text-gray-500">New handcrafted treasures are on their way!</p>
          </div>
        )}
      </section>

      {/* Why Choose Us - Minimalist Update */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="bg-white p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-2xl">
                🧶
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center md:text-left">Artisan Crafted</h3>
              <p className="text-gray-600 leading-relaxed text-center md:text-left">
                Every stitch is made with intention, using only the finest premium materials.
              </p>
            </div>
            <div className="bg-white p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-2xl">
                ♾️
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center md:text-left">Built to Last</h3>
              <p className="text-gray-600 leading-relaxed text-center md:text-left">
                Sustainable beauty that doesn't fade. Our flowers bloom forever.
              </p>
            </div>
            <div className="bg-white p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-2xl">
                💜
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center md:text-left">Personalized</h3>
              <p className="text-gray-600 leading-relaxed text-center md:text-left">
                Unique pieces that carry the warmth and soul of the maker.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section for AEO */}
      <section className="py-24 px-4 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-black text-gray-900 mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-3">What makes ABYRA STORE crochet products unique?</h3>
              <p className="text-gray-600 leading-relaxed">Our products are 100% handcrafted by skilled artisans. We use premium materials to ensure that each piece, from our forever-blooming bouquets to our artisanal bags, is a timeless work of art.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Do you accept custom orders?</h3>
              <p className="text-gray-600 leading-relaxed">Yes! We specialize in personalized gifts. You can request custom colors, designs, and arrangements to bring your unique vision to life.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-3">How long does shipping take?</h3>
              <p className="text-gray-600 leading-relaxed">Since every item is handmade, production time varies. Generally, orders are shipped within 5-7 business days. You can track your order status in real-time on our website.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Store",
          "name": "ABYRA STORE",
          "description": "Premium Handcrafted Crochet Art and Artisanal Gifts",
          "image": "https://res.cloudinary.com/dze1d3uen/image/upload/q_auto/f_auto/v1777728351/Picsart_26-05-02_18-44-52-685_wqgy9v.png",
          "url": "https://abyrastore.com/",
          "telephone": "+910000000000",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Artisan Lane",
            "addressLocality": "Chennai",
            "addressRegion": "TN",
            "postalCode": "600001",
            "addressCountry": "IN"
          },
          "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            "opens": "09:00",
            "closes": "21:00"
          },
          "sameAs": [
            "https://www.instagram.com/abyra_store",
            "https://www.facebook.com/abyrastore"
          ]
        })}
      </script>
    </div>
  );
};

