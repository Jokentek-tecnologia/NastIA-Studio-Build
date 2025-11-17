
import React, { useState } from 'react';
import Header from './components/Header';
import CreativeStudio from './components/CreativeStudio';
import AIAssistant from './components/AIAssistant';
import MarketResearch from './components/MarketResearch';
import Tools from './components/Tools';
import { Tab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CreativeStudio);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.CreativeStudio:
        return <CreativeStudio />;
      case Tab.AIAssistant:
        return <AIAssistant />;
      case Tab.MarketResearch:
        return <MarketResearch />;
      case Tab.Tools:
        return <Tools />;
      default:
        return <CreativeStudio />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="p-4 md:p-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
