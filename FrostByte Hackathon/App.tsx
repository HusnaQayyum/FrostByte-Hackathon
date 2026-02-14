
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { CameraTranslator } from './components/CameraTranslator';
import { AvatarVisualizer } from './components/AvatarVisualizer';
import { UserMode, Message } from './types';
import { getSignVisualization } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<UserMode>(UserMode.SIGNER);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGeneratingSign, setIsGeneratingSign] = useState(false);
  const [currentSignImage, setCurrentSignImage] = useState<string | undefined>(undefined);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processTextToSign = async (text: string) => {
    setIsGeneratingSign(true);
    try {
      const signImg = await getSignVisualization(text);
      setCurrentSignImage(signImg);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'gesture',
        sender: 'ai',
        content: `Visual sign for: "${text}"`,
        signImage: signImg,
        timestamp: new Date()
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'text',
        sender: 'ai',
        content: error.message === "RATE_LIMIT_REACHED" 
          ? "⚠️ Image quota exceeded. Try again in a minute." 
          : "⚠️ AI could not render that sign. Please try a different word.",
        timestamp: new Date()
      }]);
    } finally {
      setIsGeneratingSign(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'text',
      sender: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    const textToProcess = inputValue;
    setInputValue('');

    if (mode === UserMode.LISTENER) {
      await processTextToSign(textToProcess);
    }
  };

  const startVoiceCapture = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'audio',
        sender: 'user',
        content: transcript,
        timestamp: new Date()
      }]);
      processTextToSign(transcript);
    };
    recognition.start();
  };

  const onGestureRecognized = useCallback((text: string) => {
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      // Prevent duplicates in close succession
      if (lastMsg && lastMsg.content === text && (Date.now() - lastMsg.timestamp.getTime() < 8000)) {
        return prev;
      }
      
      return [...prev, {
        id: Date.now().toString(),
        type: 'gesture',
        sender: 'user',
        content: text,
        timestamp: new Date()
      }];
    });
    
    // Voice feedback
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />
      
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Toggle Mode */}
        <div className="flex justify-center mb-12">
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex space-x-1">
            <button 
              onClick={() => setMode(UserMode.SIGNER)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === UserMode.SIGNER ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Sign to Speech
            </button>
            <button 
              onClick={() => setMode(UserMode.LISTENER)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === UserMode.LISTENER ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Speech to Sign
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Visual Section (Camera or Avatar) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-4 rounded-[2.5rem] shadow-xl shadow-indigo-100/50 border border-slate-100">
              {mode === UserMode.SIGNER ? (
                <CameraTranslator onGestureRecognized={onGestureRecognized} isActive={true} />
              ) : (
                <AvatarVisualizer signImage={currentSignImage} isGenerating={isGeneratingSign} currentText={messages[messages.length-1]?.content || ""} />
              )}
            </div>
            
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-start space-x-4">
              <div className="bg-indigo-600 text-white p-2 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-indigo-900 font-bold">Pro Tip</h4>
                <p className="text-indigo-700/80 text-sm">
                  {mode === UserMode.SIGNER 
                    ? "Keep your hands within the frame. AI works best with clear lighting and a steady background."
                    : "Speak or type clearly. The AI will generate a visual reference for each word you provide."}
                </p>
              </div>
            </div>
          </div>

          {/* Chat/Transcript Section */}
          <div className="lg:col-span-5 flex flex-col h-[600px] bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center space-x-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                <span>Live Transcript</span>
              </h3>
              <button 
                onClick={() => setMessages([])}
                className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                Clear
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 grayscale space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-500">No conversation data yet...</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl ${
                    msg.sender === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-100' 
                      : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    {msg.signImage && (
                      <img src={msg.signImage} className="mt-3 rounded-lg border-2 border-white/20 w-full" alt="Sign preview" />
                    )}
                    <span className="block text-[10px] mt-2 opacity-60 uppercase font-bold tracking-tight">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="relative flex items-center space-x-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={mode === UserMode.SIGNER ? "Gesture identified automatically..." : "Type a message to sign..."}
                  className="w-full pl-5 pr-24 py-4 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white shadow-inner text-sm transition-all outline-none"
                  disabled={mode === UserMode.SIGNER}
                />
                <div className="absolute right-2 flex space-x-1">
                  <button
                    type="button"
                    onClick={startVoiceCapture}
                    className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                  <button
                    type="submit"
                    className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 disabled:opacity-30"
                    disabled={!inputValue.trim()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;