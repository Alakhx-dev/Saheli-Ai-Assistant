import React from 'react';
import { motion } from 'motion/react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: any;
}

export const GlassCard = ({ children, className = "", title, icon: Icon }: GlassCardProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    whileHover={{ 
      y: -12, 
      scale: 1.03, 
      boxShadow: "0 25px 50px -12px rgba(255, 183, 197, 0.4)",
      transition: { type: "spring", stiffness: 300, damping: 15 } 
    }}
    transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
    className={`glass rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-8 glass-hover ${className}`}
  >
    {title && (
      <div className="flex items-center gap-4 mb-6 lg:mb-8">
        {Icon && (
          <div className="p-2.5 lg:p-3 rounded-2xl bg-saheli-pink/20 text-saheli-purple border border-white/40 shadow-inner">
            <Icon size={18} className="lg:w-5 lg:h-5" />
          </div>
        )}
        <h3 className="font-display font-black text-xl lg:text-2xl tracking-tight text-saheli-text-primary">{title}</h3>
      </div>
    )}
    {children}
  </motion.div>
);
