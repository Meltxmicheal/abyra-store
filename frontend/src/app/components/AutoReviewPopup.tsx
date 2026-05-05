import { useEffect, useState } from 'react';
import { useAuthContext } from './Providers';
import { orderService } from '../utils/db';
import { ReviewModal } from './ReviewModal';
import type { Order } from '../utils/types';

export const AutoReviewPopup = () => {
  const { user, isAuthenticated } = useAuthContext();
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const checkPendingReviews = async () => {
      const orders = await orderService.getUserOrders(user.id);
      const pending = orders.find(o => o.reviewPending && o.status === 'delivered');
      
      if (pending) {
        setPendingOrder(pending);
        setShowReview(true);
      }
    };

    // Check on mount (app open)
    checkPendingReviews();
  }, [user, isAuthenticated]);

  const handleSuccess = async () => {
    if (pendingOrder) {
      await orderService.markReviewDone(pendingOrder.id);
      setShowReview(false);
      setPendingOrder(null);
    }
  };

  const handleClose = async () => {
    // User closed the popup - we still mark it as done so they aren't spammed
    // as per "Do NOT spam popup every time" rule.
    if (pendingOrder) {
      await orderService.markReviewDone(pendingOrder.id);
      setShowReview(false);
      setPendingOrder(null);
    }
  };

  if (!pendingOrder || !showReview) return null;

  // Review the first item by default in the auto-popup
  const firstItem = pendingOrder.items[0];

  return (
    <ReviewModal
      isOpen={showReview}
      onClose={handleClose}
      onSuccess={handleSuccess}
      orderId={pendingOrder.id}
      userId={user?.id || ''}
      productId={firstItem?.productId || ''}
      productName={firstItem?.product.name || 'Your Order'}
    />
  );
};
