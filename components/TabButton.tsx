
import React from 'react';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick }) => {
  const baseClasses = "px-4 py-2 rounded-md font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-accent";
  const activeClasses = "bg-brand-secondary text-white shadow-md";
  const inactiveClasses = "bg-gray-700 text-gray-300 hover:bg-gray-600";

  return (
    <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
      {label}
    </button>
  );
};

export default TabButton;
