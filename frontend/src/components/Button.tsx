import React from 'react';
import { motion } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#A6FF78] text-[#070908] font-semibold hover:bg-[#B8FF94] shadow-[0_0_24px_rgba(166,255,120,0.18)] border border-transparent',
  secondary:
    'bg-[#18211C] text-[#F5F7F5] font-medium hover:bg-[#1F2B24] border border-[#2A3830]',
  outline:
    'bg-transparent text-[#F5F7F5] font-medium hover:bg-[#121916] border border-[#26342C] hover:border-[#A6FF78]/50',
  ghost:
    'bg-transparent text-[#9AA69E] font-medium hover:text-[#F5F7F5] hover:bg-[#121916] border border-transparent',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.12 }}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6FF78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070908] disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  );
}
