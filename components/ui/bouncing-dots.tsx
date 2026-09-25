'use client'

import { motion } from 'framer-motion'

export const BouncingDots = () => {
  return (
    <div className="flex items-end justify-center gap-2 h-10">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-3 h-3 bg-[#003017] rounded-full"
          animate={{ y: [0, -16, 0], scaleY: [0.8, 1.1, 0.8] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

export default BouncingDots
