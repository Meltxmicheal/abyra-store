import { motion } from 'motion/react';

const LOGO_URL = 'https://res.cloudinary.com/dze1d3uen/image/upload/q_auto/f_auto/v1778080269/sgtzcvsm6uvuc4oasne0.jpg';

export const LoadingAnimation = () => {
  return (
    <div className="flex items-center justify-center py-12 relative">
      <div className="relative">
        {/* Logo in center */}
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <img src={LOGO_URL} alt="ABYRA" className="w-24 h-24 object-contain rounded-full shadow-lg" />
        </motion.div>
        
        {/* Stitching circle animation */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          {/* Needle and thread path */}
          <svg width="120" height="120" viewBox="0 0 120 120" className="absolute">
            <motion.circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#4A2C5A"
              strokeWidth="2"
              strokeDasharray="8 8"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </svg>
          
          {/* Moving needle */}
          <motion.div
            className="absolute w-1 h-6"
            style={{ top: '10px', left: '50%', transformOrigin: '0 50px', backgroundColor: '#4A2C5A' }}
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
        
        {/* Cross stitch decorative elements */}
        <div className="absolute -top-12 -left-12 w-full h-full pointer-events-none">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2"
              style={{
                left: '50%',
                top: '50%',
                transformOrigin: '0 0',
              }}
              initial={{ scale: 0, rotate: i * 60 }}
              animate={{
                scale: [0, 1, 0],
                x: [0, 60],
                y: [0, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8">
                <line x1="0" y1="0" x2="8" y2="8" stroke="#4A2C5A" strokeWidth="1.5" />
                <line x1="8" y1="0" x2="0" y2="8" stroke="#4A2C5A" strokeWidth="1.5" />
              </svg>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Loading text */}
      <motion.p
        className="absolute -bottom-6 tracking-wide font-black uppercase text-[10px]"
        style={{ color: '#37094dff' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Please wait....
      </motion.p>
    </div>
  );
};

// Smaller loading spinner for inline use
export const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center py-8">
      <motion.div
        className="w-8 h-8 border-4 rounded-full"
        style={{ borderColor: '#E8DFD0', borderTopColor: '#4A2C5A' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
};
