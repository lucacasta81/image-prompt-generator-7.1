import React from 'react';

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
    primary: "bg-light-grey text-blackish hover:bg-medium-grey shadow-[0_0_20px_rgba(224,224,224,0.1)]",
    secondary: "bg-dark-grey hover:bg-deep-grey text-light-grey border border-light-grey/10",
    outline: "border border-dark-grey hover:border-light-grey text-medium-grey hover:text-light-grey bg-transparent",
    ghost: "hover:bg-deep-grey text-medium-grey hover:text-light-grey"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <i className="fas fa-circle-notch fa-spin"></i>
      ) : icon}
      {children}
    </button>
  );
};