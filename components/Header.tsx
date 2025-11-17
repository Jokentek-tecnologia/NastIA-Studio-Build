
import React from 'react';
import TabButton from './TabButton';
import { Tab } from '../types';

interface HeaderProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10 shadow-lg">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-accent mb-4 md:mb-0">
          Suíte de IA para Negócios
        </h1>
        <nav className="flex flex-wrap justify-center space-x-2">
          {Object.values(Tab).map((tab) => (
            <TabButton
              key={tab}
              label={tab}
              isActive={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            />
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;