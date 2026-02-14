
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
              S
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              SignSpeak
            </span>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="#" className="text-slate-600 hover:text-indigo-600 font-medium transition-colors">How it works</a>
            <a href="#" className="text-slate-600 hover:text-indigo-600 font-medium transition-colors">Resources</a>
            <a href="#" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-sm">
              Demo Mode
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};
