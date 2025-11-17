
import React, { ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <section className="bg-gray-800/70 p-6 rounded-xl shadow-2xl border border-gray-700">
      <h2 className="text-xl font-bold mb-4 text-brand-accent border-b-2 border-brand-accent/30 pb-2">{title}</h2>
      {children}
    </section>
  );
};

export default Card;
