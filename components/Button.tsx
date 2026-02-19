import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  icon, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transform active:scale-95";
  
  const variants = {
    primary: "bg-light-green text-greenish-black hover:bg-medium-green shadow-[0_0_20px_rgba(232,255,232,0.1)]",
    secondary: "bg-dark-green hover:bg-deep-green text-light-green border border-light-green/10",
    outline: "border border-dark-green hover:border-light-green text-medium-green hover:text-light-green bg-transparent",
    ghost: "hover:bg-deep-green text-medium-green hover:text-light-green"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon}
      {children}
    </button>
  );
};