import { Link } from 'react-router';
import { Star, Tag } from 'lucide-react';
import { Product } from '../utils/types';
import { motion } from 'motion/react';
import { optimizeCloudinaryUrl } from '../utils/imageOptimizer';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <Link to={`/product/${product.id}`}>
      <motion.div
        className="group cursor-pointer"
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <div className="relative overflow-hidden rounded-lg bg-gray-100 aspect-square mb-3">
          <motion.img
            src={optimizeCloudinaryUrl(product.images[0])}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.3 }}
          />
          
          {/* Discount Badge */}
          {product.discountEnabled && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center shadow-lg">
              <Tag className="w-3 h-3 mr-1" />
              SPECIAL OFFER
            </div>
          )}

          {/* Badge for new or featured */}
          {product.rating >= 4.8 && (
            <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
              Popular
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-purple-600 transition">
            {product.name}
          </h3>
          
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-600">{product.rating}</span>
          </div>
          
          <div className="flex items-baseline space-x-2">
            {product.discountEnabled ? (
              <>
                <p className="text-lg font-black text-gray-900">
                  ₹{product.discountPrice}
                </p>
                <p className="text-sm font-medium text-gray-400 line-through">
                  ₹{product.basePrice}
                </p>
              </>
            ) : (
              <p className="text-lg font-black text-gray-900">
                ₹{product.basePrice}
              </p>
            )}
          </div>
          
          <p className="text-xs text-gray-500">
            {product.productionTime} days production
          </p>
        </div>
      </motion.div>
    </Link>
  );
};

