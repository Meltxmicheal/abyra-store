import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductCard } from './ProductCard';
import type { Product } from '../utils/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CategoryCarouselProps {
  title: string;
  products: Product[];
}

export const CategoryCarousel = ({ title, products }: CategoryCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<any>(null);

  const itemsPerPage = 3;
  const totalPages = Math.ceil(products.length / itemsPerPage);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && totalPages > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % totalPages);
      }, 3000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isVisible, totalPages]);

  if (products.length === 0) return null;

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % totalPages);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages);

  return (
    <div ref={containerRef} className="py-12 border-t border-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">{title}</h2>
            <div className="h-1 w-20 bg-purple-600 rounded-full" />
          </div>
          
          {totalPages > 1 && (
            <div className="flex space-x-2">
              <button 
                onClick={prevSlide}
                className="p-3 bg-gray-50 rounded-xl hover:bg-purple-50 hover:text-purple-600 transition-all text-gray-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={nextSlide}
                className="p-3 bg-gray-50 rounded-xl hover:bg-purple-50 hover:text-purple-600 transition-all text-gray-400"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <motion.div 
            className="flex gap-8"
            animate={{ x: `-${currentIndex * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {products.map((product) => (
              <div 
                key={product.id} 
                className="w-full sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-21.333px)] flex-shrink-0"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </motion.div>
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center space-x-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === i ? 'w-8 bg-purple-600' : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
