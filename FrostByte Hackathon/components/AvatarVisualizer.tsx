import React from 'react';

interface AvatarVisualizerProps {
  signImage?: string;
  isGenerating: boolean;
  currentText: string;
}

export const AvatarVisualizer: React.FC<AvatarVisualizerProps> = ({ signImage, isGenerating, currentText }) => {
  return (
    <div className="relative aspect-square w-full max-w-md mx-auto bg-slate-100 rounded-3xl overflow-hidden border-4 border-white shadow-xl flex flex-col items-center justify-center group">
      {isGenerating ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Rendering Sign...</p>
        </div>
      ) : signImage ? (
        <img 
          src={signImage} 
          alt="ASL Sign" 
          className="w-full h-full object-cover transition-all duration-700 hover:scale-105" 
        />
      ) : (
        <div className="text-center p-8 space-y-4">
          <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">Avatar waiting for input...</p>
        </div>
      )}
      
      {currentText && !isGenerating && (
        <div className="absolute bottom-4 left-4 right-4 glass px-4 py-2 rounded-xl text-center shadow-lg border border-white/50">
          <span className="text-indigo-700 font-bold uppercase tracking-wider text-xs">Meaning:</span>
          <p className="text-slate-800 font-semibold">{currentText}</p>
        </div>
      )}
    </div>
  );
};
