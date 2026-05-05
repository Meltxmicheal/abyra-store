import { motion } from 'motion/react';

interface AvatarProps {
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

export const Avatar = ({ name, size = 'md', className = '' }: AvatarProps) => {
  const initial = name ? name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <motion.div
      whileHover={{ scale: 1.05, filter: 'brightness(1.1)' }}
      whileTap={{ scale: 0.95 }}
      className={`
        ${sizeClasses[size]} 
        bg-purple-600 
        text-white 
        rounded-full 
        flex 
        items-center 
        justify-center 
        font-black 
        shadow-sm 
        transition-all 
        ${className}
      `}
    >
      {initial}
    </motion.div>
  );
};
