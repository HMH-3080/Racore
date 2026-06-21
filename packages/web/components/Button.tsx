import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "translucent" | "icon-circular";
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  className = "",
  ...props
}) => {
  const baseStyles = "font-medium text-btn transition-all";

  const variantStyles = {
    primary:
      "bg-white text-black px-[15px] py-[10px] rounded-pill hover:bg-gray-100 active:scale-95",
    secondary:
      "bg-surface-1 text-white px-[15px] py-[10px] rounded-pill hover:bg-surface-2 active:scale-95",
    translucent:
      "bg-surface-2 text-white px-[14px] py-[8px] rounded-xxl hover:bg-surface-1 active:scale-95",
    "icon-circular":
      "bg-surface-1 text-white w-[40px] h-[40px] rounded-full hover:bg-surface-2 active:scale-95 flex items-center justify-center",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
};
