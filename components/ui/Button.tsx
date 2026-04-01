import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const baseClass = 'btn';
  const variantClass = `${baseClass}--${variant}`;
  const sizeClass = `${baseClass}--${size}`;
  const widthClass = fullWidth ? `${baseClass}--full` : '';

  const combinedClasses = [
    baseClass,
    variantClass,
    sizeClass,
    widthClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
};

export default Button;       