import { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router';
import { productService, reviewService } from '../utils/db';
import type { Product, Variant } from '../utils/types';
import { Star, ShoppingCart, Clock, CreditCard, Tag, ChevronRight, Check, MessageSquare, Reply, Send, Loader2, ChevronLeft, Share2 } from 'lucide-react';
import { LoadingAnimation } from '../components/LoadingAnimation';
import { useAuthContext } from '../components/Providers';
import { useCartContext } from '../components/Providers';
import { toast } from 'sonner';
import { FRONTEND_URL } from '../utils/api';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { motion, AnimatePresence } from 'motion/react';
import useEmblaCarousel from 'embla-carousel-react';

export const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthContext();
  const { addToCart } = useCartContext();
  
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [selectedVariant, setSelectedVariant] = useState<Variant | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Combine product images and unique variant images for the carousel
  const allImages = useMemo(() => {
    if (!product) return [];
    const variantImages = product.variants
      .map(v => v.image)
      .filter((img): img is string => !!img && !product.images.includes(img));
    return [...product.images, ...variantImages];
  }, [product]);

  // Carousel state
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, skipSnaps: false, dragFree: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Review Form State
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const { setGlobalLoading } = useAuthContext();

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    if (allImages[index]) {
      setSelectedImage(allImages[index]);
    }
  }, [emblaApi, allImages]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi) emblaApi.reInit();
  }, [allImages.length, emblaApi]);

  useEffect(() => {
    let isMounted = true;
    
    const load = async () => {
      if (!id) return;
      setGlobalLoading(true);
      try {
        const foundProduct = await productService.getById(id);
        if (foundProduct && isMounted) {
          setProduct(foundProduct);
          setSelectedImage(foundProduct.images[0]);
          setSelectedVariant(undefined);
          setSelectedIndex(0);
          
          // Load reviews
          const productReviews = await reviewService.getForProduct(id);
          if (isMounted) {
            setReviews(productReviews);
            // Check if user can review
            if (user) {
              const purchased = await reviewService.hasUserPurchased(user.id, id);
              if (isMounted) {
                setCanReview(purchased);
                setHasReviewed(productReviews.some(r => r.userId === user.id));
              }
            }
          }
        }
      } finally {
        if (isMounted) {
          setGlobalLoading(false);
          setIsLoading(false);
        }
      }
    };

    load();
    return () => { isMounted = false; };
  }, [id, user, setGlobalLoading]);

  const refreshProduct = async () => {
    // This is now used for manual refreshes like after submitting a review
    if (!id) return;
    try {
      const foundProduct = await productService.getById(id);
      if (foundProduct) {
        setProduct(foundProduct);
        const productReviews = await reviewService.getForProduct(id);
        setReviews(productReviews);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Synchronize carousel when selectedImage changes from outside (variant/thumbnail click)
  useEffect(() => {
    if (!selectedImage || !emblaApi) return;
    const index = allImages.indexOf(selectedImage);
    if (index !== -1 && index !== emblaApi.selectedScrollSnap()) {
      emblaApi.scrollTo(index);
    }
  }, [selectedImage, allImages, emblaApi]);

  useEffect(() => {
    if (selectedVariant?.image) {
      setSelectedImage(selectedVariant.image);
    } else if (product && !selectedVariant) {
      setSelectedImage(product.images[0]);
    }
  }, [selectedVariant, product]);

  const handleShare = async () => {
    if (!product) return;
    const shareData = {
      title: product.name,
      text: product.description,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('Failed to share product');
      }
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingAnimation />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-gray-100 max-w-sm w-full">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <Tag className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-4">Product Not Found</h2>
          <p className="text-gray-500 mb-8 font-medium">The item you are looking for might have been removed or relocated.</p>
          <button onClick={() => navigate('/products')} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black hover:bg-purple-700 transition shadow-xl shadow-purple-100">Explore Shop</button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    addToCart({
      productId: product.id,
      variantId: selectedVariant?.id || 'base',
      quantity,
      product,
      variant: selectedVariant || { id: 'base', name: 'Standard', attributes: {} },
    });

    toast.success('Successfully added to cart!');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) return;
    
    setGlobalLoading(true);
    try {
      const result = await reviewService.add(user.id, product.id, newRating, newComment);
      if (result.success) {
        toast.success('Thank you for your review!');
        setShowReviewForm(false);
        setNewComment('');
        await refreshProduct();
      } else {
        toast.error(result.error || 'Failed to submit review');
      }
    } catch (err) {
      toast.error('Failed to submit review');
    } finally {
      setGlobalLoading(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  // Delivery time: prefer variant-specific days, fall back to product production time
  const deliveryDays = selectedVariant?.deliveryDays ?? (product.productionTime || 7);
  const estimatedDeliveryDate = new Date();
  estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + deliveryDays);

  const displayPrice = selectedVariant?.price || (product.discountEnabled && product.discountPrice ? product.discountPrice : product.basePrice);
  const originalPrice = product.basePrice;
  const hasDiscount = product.discountEnabled && !selectedVariant?.price;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Helmet>
        {/* Basic Meta Tags */}
        <title>{`${product.name} | ABYRA STORE`}</title>
        <meta name="description" content={product.description?.replace(/[<>"]/g, '').substring(0, 160) || "Premium handcrafted crochet art from ABYRA STORE."} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="product" />
        <meta property="og:url" content={`${FRONTEND_URL}/product/${product.id}`} />
        <meta property="og:title" content={`${product.name} | ABYRA STORE`} />
        <meta property="og:description" content={product.description?.replace(/[<>"]/g, '').substring(0, 160) || "Premium handcrafted crochet art from ABYRA STORE."} />
        <meta property="og:image" content={selectedImage || product.images[0]} />
        <meta property="og:site_name" content="ABYRA STORE" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={`${FRONTEND_URL}/product/${product.id}`} />
        <meta name="twitter:title" content={`${product.name} | ABYRA STORE`} />
        <meta name="twitter:description" content={product.description?.replace(/[<>"]/g, '').substring(0, 160) || "Premium handcrafted crochet art from ABYRA STORE."} />
        <meta name="twitter:image" content={selectedImage || product.images[0]} />
      </Helmet>
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center space-x-2 text-xs font-black text-gray-400 uppercase tracking-widest">
          <button onClick={() => navigate('/')} className="hover:text-purple-600">Home</button>
          <ChevronRight className="w-3 h-3" />
          <button onClick={() => navigate('/products')} className="hover:text-purple-600">Shop</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-purple-600 truncate max-w-[200px]">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Image Gallery with Carousel */}
          <div className="space-y-4 lg:space-y-6">
            <div className="relative group">
              <div 
                className="overflow-hidden rounded-3xl lg:rounded-[2.5rem] bg-white shadow-2xl border border-gray-100 touch-pan-y select-none cursor-grab active:cursor-grabbing" 
                ref={emblaRef}
              >
                <div className="flex">
                  {allImages.map((image: string, index: number) => (
                    <div 
                      key={index} 
                      className="w-full flex-shrink-0 relative aspect-square" 
                      onClick={() => setSelectedVariant(undefined)}
                    >
                      <img 
                        src={image} 
                        alt={`${product.name} ${index + 1}`} 
                        className="w-full h-full object-cover pointer-events-none select-none" 
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Arrows */}
              <button 
                onClick={(e) => { e.stopPropagation(); scrollPrev(); }} 
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl text-gray-900 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10 hidden md:block"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); scrollNext(); }} 
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl text-gray-900 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10 hidden md:block"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {hasDiscount && (
                <div className="absolute top-6 left-6 bg-red-500 text-white px-4 py-2 rounded-2xl font-black text-sm shadow-xl flex items-center">
                  <Tag className="w-4 h-4 mr-2" /> SALE
                </div>
              )}
            </div>

            {/* Thumbnails */}
            <div className="flex space-x-3 sm:space-x-4 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
              {allImages.map((image: string, index: number) => (
                <button 
                  key={index} 
                  onClick={() => setSelectedImage(image)} 
                  className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-white shadow-md border-2 transition-all ${selectedImage === image ? 'border-purple-600 scale-105 ring-4 ring-purple-50' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={image} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-block px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black uppercase tracking-widest">{product.category}</span>
                <button onClick={handleShare} className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-500 hover:text-purple-600 transition-all active:scale-95 group">
                  <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 leading-tight">{product.name}</h1>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center bg-yellow-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-yellow-100">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400 mr-2" />
                  <span className="font-black text-yellow-700 text-sm sm:text-base">{averageRating ? averageRating.toFixed(1) : 'No reviews'}</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-400 sm:border-l sm:border-gray-200 sm:pl-6">{reviews.length} Verified Reviews</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 bg-white rounded-3xl lg:rounded-[2rem] shadow-xl border border-gray-100 space-y-6">
              <div className="flex items-baseline space-x-4">
                <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900">₹{displayPrice.toLocaleString()}</p>
                {hasDiscount && <p className="text-lg sm:text-xl font-bold text-gray-400 line-through">₹{originalPrice.toLocaleString()}</p>}
              </div>

              <div className="border-t border-gray-50 pt-6">
                <p className="text-gray-500 font-medium leading-relaxed">{product.description}</p>
              </div>

              {!user?.isAdmin && (
                <>
                  <div className="space-y-4">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Select Your Preference</label>
                    <div className="flex flex-wrap gap-3">
                      {/* Default Variant Option */}
                      <button 
                        onClick={() => setSelectedVariant(undefined)} 
                        className={`px-6 py-4 rounded-2xl font-black text-sm transition-all flex items-center border-2 ${!selectedVariant ? 'border-purple-600 bg-purple-600 text-white shadow-xl shadow-purple-200 scale-105' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-purple-200'}`}
                      >
                        {!selectedVariant && <Check className="w-4 h-4 mr-2" />}
                        Standard
                      </button>

                      {product.variants.map((variant) => (
                        <button 
                          key={variant.id} 
                          onClick={() => setSelectedVariant(variant)} 
                          className={`px-6 py-4 rounded-2xl font-black text-sm transition-all flex items-center border-2 ${selectedVariant?.id === variant.id ? 'border-purple-600 bg-purple-600 text-white shadow-xl shadow-purple-200 scale-105' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-purple-200'}`}
                        >
                          {selectedVariant?.id === variant.id && <Check className="w-4 h-4 mr-2" />}
                          {variant.name} {variant.price && <span className={`ml-2 text-xs opacity-70`}>(₹{variant.price})</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:space-x-6">
                    <div className="bg-gray-50 rounded-2xl p-2 flex items-center justify-between sm:justify-start sm:space-x-4 border border-gray-100">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-black text-gray-900 hover:bg-gray-100 transition-colors">-</button>
                      <span className="text-xl font-black text-gray-900 min-w-[2ch] text-center">{quantity}</span>
                      <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-black text-gray-900 hover:bg-gray-100 transition-colors">+</button>
                    </div>
                    <button onClick={handleAddToCart} className="flex-1 bg-purple-600 text-white py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl hover:bg-purple-700 transition shadow-2xl shadow-purple-100 flex items-center justify-center space-x-3 active:scale-95">
                      <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>Add To Cart</span>
                    </button>
                  </div>
                </>
              )}

              {user?.isAdmin && (
                <div className="p-6 bg-purple-50 rounded-3xl border border-purple-100 text-center">
                  <p className="font-black text-purple-900 uppercase text-xs tracking-widest">Admin Control View</p>
                  <p className="text-purple-600 text-sm font-bold mt-2">Manage this product in your dashboard</p>
                </div>
              )}
            </div>

            {/* Delivery Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-purple-50 rounded-2xl"><Clock className="w-6 h-6 text-purple-600" /></div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase">Delivery Time</p>
                  <p className="text-sm font-black text-gray-900">
                    {deliveryDays === 1 ? '1 Day' : `${deliveryDays} Days`}
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-green-50 rounded-2xl"><CreditCard className="w-6 h-6 text-green-600" /></div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase">Estimated By</p>
                  <p className="text-sm font-black text-gray-900">{estimatedDeliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="space-y-8 pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-black text-gray-900">Experience Feedback</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Verified Customer Satisfaction</p>
                </div>
                {canReview && !hasReviewed && !user?.isAdmin && (
                  <button onClick={() => setShowReviewForm(!showReviewForm)} className="bg-white border-2 border-purple-600 text-purple-600 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all">Write a Review</button>
                )}
              </div>

              {/* Review Form */}
              <AnimatePresence>
                {showReviewForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <form onSubmit={handleReviewSubmit} className="bg-purple-50 p-8 rounded-[2.5rem] border border-purple-100 space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-purple-900 uppercase tracking-widest">Rate your experience</span>
                        <div className="flex space-x-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} type="button" onClick={() => setNewRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                              <Star className={`w-8 h-8 ${star <= newRating ? 'fill-yellow-400 text-yellow-400' : 'text-purple-200'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={4} className="w-full p-4 bg-white border border-purple-100 rounded-3xl font-medium focus:ring-2 focus:ring-purple-600 transition-all text-sm outline-none resize-none" placeholder="Share your detailed thoughts on quality and design..." required />
                      <button type="submit" className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black hover:bg-purple-700 transition shadow-xl shadow-purple-100 flex items-center justify-center space-x-2">
                        <Send className="w-5 h-5" />
                        <span>Submit Review</span>
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-lg">
                          {review.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-gray-900">{review.userName}</p>
                          <div className="flex space-x-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{new Date(review.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-600 font-medium leading-relaxed italic">"{review.comment}"</p>
                    
                    {review.adminReply && (
                      <div className="mt-6 p-6 bg-purple-50 rounded-3xl border border-purple-100 relative">
                        <div className="absolute -top-3 left-6 px-3 py-1 bg-purple-600 text-white text-[8px] font-black rounded-lg uppercase tracking-widest flex items-center">
                          <Reply className="w-2.5 h-2.5 mr-1" /> Brand Response
                        </div>
                        <p className="text-purple-900 font-bold text-sm">{review.adminReply}</p>
                      </div>
                    )}
                  </div>
                ))}
                {reviews.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                    <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold">No reviews yet. Be the first to share your experience!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md bg-white rounded-[2.5rem] border-none p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-600"><ShoppingCart className="w-10 h-10" /></div>
            <h3 className="text-3xl font-black text-gray-900 mb-2">Almost There!</h3>
            <p className="text-gray-500 mb-8 font-medium">Please sign in to your ABYRA account to continue shopping.</p>
            <div className="space-y-3">
              <button onClick={() => { setShowLoginModal(false); navigate('/login', { state: { from: `/product/${id}` } }); }} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black hover:bg-purple-700 transition shadow-xl shadow-purple-100">Sign In</button>
              <button onClick={() => { setShowLoginModal(false); navigate('/register', { state: { from: `/product/${id}` } }); }} className="w-full border-2 border-purple-100 text-purple-600 py-4 rounded-2xl font-black hover:bg-purple-50 transition">Create Account</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Structured Data (JSON-LD) */}
      {product && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "image": product.images,
            "description": product.description,
            "brand": {
              "@type": "Brand",
              "name": "ABYRA"
            },
            "offers": {
              "@type": "Offer",
              "url": `${FRONTEND_URL}/product/${product.id}`,
              "priceCurrency": "INR",
              "price": product.discountEnabled ? product.discountPrice : product.basePrice,
              "availability": "https://schema.org/InStock",
              "itemCondition": "https://schema.org/NewCondition"
            },
            "aggregateRating": reviews.length > 0 ? {
              "@type": "AggregateRating",
              "ratingValue": (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1),
              "reviewCount": reviews.length
            } : undefined
          })}
        </script>
      )}
    </div>
  );
};