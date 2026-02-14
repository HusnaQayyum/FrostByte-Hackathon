
import { useRef, useEffect, useState } from 'react';
import React from 'react';
import { getGestureInterpretation } from '../services/geminiService';

interface CameraTranslatorProps {
  onGestureRecognized: (text: string) => void;
  isActive: boolean;
}

export const CameraTranslator: React.FC<CameraTranslatorProps> = ({ onGestureRecognized, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [coolDown, setCoolDown] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Initialize Camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setErrorState(null);
      } catch (err) {
        console.error("Camera access denied", err);
        setErrorState("Camera access denied. Please check permissions.");
      }
    };
    if (isActive) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  // Cooldown timer logic
  useEffect(() => {
    if (coolDown <= 0) return;
    const timer = setInterval(() => setCoolDown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [coolDown]);

  // Recognition polling loop
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(async () => {
      // Don't start new request if one is in flight or cooling down
      if (isProcessing || coolDown > 0 || !videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');

      if (context && video.readyState === 4) {
        setIsProcessing(true);
        // Scaling down the frame for faster transfer and reduced token cost
        canvas.width = 320;
        canvas.height = 240;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          // Reduced quality to 0.4 to minimize RPC payload issues
          const base64 = canvas.toDataURL('image/jpeg', 0.4).split(',')[1];
          const result = await getGestureInterpretation(base64);
          
          setIsRetrying(false);
          if (result && result.length > 1 && result.toLowerCase() !== "scanning") {
            onGestureRecognized(result);
            setErrorState(null);
          }
        } catch (error: any) {
          if (error.message === "RATE_LIMIT_REACHED") {
            setCoolDown(30); 
          } else {
            console.warn("SignSpeak: Connection error, waiting for retry...");
            setIsRetrying(true);
            // Short cooldown for generic/XHR errors to let the network settle
            setCoolDown(4);
          }
        } finally {
          setIsProcessing(false);
        }
      }
    }, 12000); 

    return () => clearInterval(interval);
  }, [isActive, isProcessing, onGestureRecognized, coolDown]);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl bg-slate-900 aspect-video group border-4 border-white">
      {/* Video Stream */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`w-full h-full object-cover mirror transition-all duration-700 
          ${coolDown > 0 && !isRetrying ? 'opacity-30 grayscale blur-md' : 'opacity-100'} 
          ${isProcessing ? 'brightness-125' : 'brightness-100'}`}
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Scanning Indicator */}
      {isActive && coolDown === 0 && (
        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
          <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-indigo-400 animate-ping' : 'bg-green-400'}`}></div>
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">
            {isProcessing ? 'AI Analyzing...' : 'Live Monitoring'}
          </span>
        </div>
      )}

      {/* Retrying Overlay */}
      {isRetrying && coolDown > 0 && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-amber-500/90 backdrop-blur-md px-4 py-2 rounded-xl border border-amber-400/50 text-white animate-in slide-in-from-bottom-2">
           <div className="flex items-center space-x-2">
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-bold uppercase tracking-wider">Sync Issue - Retrying...</span>
           </div>
           <span className="text-[10px] font-mono opacity-80">{coolDown}s</span>
        </div>
      )}

      {/* Rate Limit / Cooldown Overlay */}
      {coolDown > 0 && !isRetrying && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-indigo-900/10">
          <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white max-w-xs animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-slate-900 font-bold text-lg mb-2">Rate Limit Hit</h3>
            <p className="text-slate-500 text-sm mb-6">Entering a 30s cooldown to respect API quotas.</p>
            <div className="text-3xl font-black text-indigo-600 mb-6 tabular-nums">
              00:{coolDown < 10 ? `0${coolDown}` : coolDown}
            </div>
            <button 
              onClick={() => setCoolDown(0)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-colors uppercase tracking-widest"
            >
              Force Reset
            </button>
          </div>
        </div>
      )}

      {/* Fatal Camera Error State */}
      {errorState && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-red-100 text-center max-w-sm">
            <p className="text-red-600 font-bold mb-2">Camera Error</p>
            <p className="text-slate-500 text-sm">{errorState}</p>
          </div>
        </div>
      )}
    </div>
  );
};
