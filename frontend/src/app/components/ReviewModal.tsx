import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { toast } from 'sonner';
import { reviewService } from '../utils/db';

interface ReviewModalProps {
  orderId: string;
  userId: string;
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewModal = ({
  orderId,
  userId,
  productId,
  productName,
  isOpen,
  onClose,
  onSuccess,
}: ReviewModalProps) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error('Please write a review');
      return;
    }

    setIsLoading(true);
    try {
      const result = await reviewService.add(
        userId,
        productId,
        rating,
        comment
      );
      
      if (result.success) {
        toast.success('Review submitted successfully!');
        setComment('');
        setRating(5);
        onClose();
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to submit review');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">Share Your Review</h2>
            <p className="text-purple-100 font-medium text-sm mt-1">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Rating Section */}
          <div>
            <label className="block text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">
              Rating *
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {rating === 5 && "Excellent! 🎉"}
              {rating === 4 && "Great! 😊"}
              {rating === 3 && "Good 👍"}
              {rating === 2 && "Fair 😐"}
              {rating === 1 && "Poor 😞"}
            </p>
          </div>

          {/* Comment Section */}
          <div>
            <label className="block text-sm font-bold text-gray-900 uppercase tracking-widest mb-3">
              Your Review *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.substring(0, 500))}
              placeholder="Share your experience with this product..."
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 resize-none"
              rows={5}
            />
            <p className="text-xs text-gray-500 mt-2">
              {comment.length}/500 characters
            </p>
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
              📝 Review Guidelines
            </p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Be honest and specific</li>
              <li>• Share your actual experience</li>
              <li>• Avoid offensive language</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 flex gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-xl font-bold text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !comment.trim()}
            className="flex-1 px-4 py-2 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
};
