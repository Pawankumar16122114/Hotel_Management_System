import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  MessageSquare, 
  Zap, 
  HelpCircle, 
  Compass, 
  X, 
  Minimize2, 
  Smile, 
  Bot,
  User,
  Volume2
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function AIConcierge() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      text: "👋 Hello! I am your AI Hostel Concierge. I can help recommend the best rooms, outline curfew codes, explain leaves, and answer any facilities questions. Ask me anything!" 
    }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const presets = [
    { label: 'Show Deluxe details', text: 'What is the pricing and amenities included with the Deluxe Room?' },
    { label: 'Explain Curfew codes', text: 'What are the curfew check-in limitations and penalties for checking in late?' },
    { label: 'Register Outstation Leave', text: 'How do students apply for hometown/weekend holiday leave requests?' },
    { label: 'Auto Allocation Fit', text: 'Can you recommend an AC room with a high score if my budget is ₹7000?' },
  ];

  const handleSendMessage = async (rawMessage: string) => {
    if (!rawMessage.trim()) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', text: rawMessage } as Message];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: rawMessage }),
      });
      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', text: data.text || 'Assistant responded.' }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', text: 'Could not connect to the consultation node. Please check server.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Expanded Consultation Window */}
      {open ? (
        <div className="w-96 h-[520px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-fade-in">
          
          {/* Header */}
          <div className="bg-slate-900 p-4.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-600 rounded-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm">Hostel Support AI</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Gemini Flash Counsel</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-full transition-colors hover:bg-slate-800"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Quick preset suggestions */}
          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
            {presets.map((b, idx) => (
              <button
                key={idx}
                id={`ai-preset-${idx}`}
                onClick={() => handleSendMessage(b.text)}
                className="bg-white border border-slate-200/80 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 px-3 py-1.5 rounded-full text-[10px] font-medium tracking-wide shadow-xs transition-all shrink-0 cursor-pointer"
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Chats panel */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-550 border border-indigo-100 flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-600/10">
                    <Bot className="w-4.5 h-4.5 text-indigo-600" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-slate-900 text-slate-200 rounded-br-none shadow-sm' 
                    : 'bg-white border border-slate-200/50 text-slate-800 rounded-bl-none shadow-xs'
                }`}>
                  <p className="whitespace-pre-line">{m.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-white shrink-0 animate-pulse">
                  <Bot className="w-4.5 h-4.5 text-indigo-600 animate-bounce" />
                </div>
                <div className="bg-white border border-slate-200/50 rounded-2xl p-3 shadow-xs rounded-bl-none">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-150"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-300"></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input field */}
          <div className="p-3 border-t border-slate-100 bg-white">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} 
              className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-indigo-650 focus-within:ring-3 focus-within:ring-indigo-100"
            >
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask query (pricing, rules, leaves)..." 
                className="flex-1 bg-transparent px-2 py-1.5 text-xs border-0 outline-none focus:ring-0 text-slate-800"
              />
              <button 
                type="submit"
                id="btn-ai-chat-send"
                disabled={!input.trim() || loading}
                className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 p-2.5 rounded-xl transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Floating Launcher Bubble */
        <button
          onClick={() => setOpen(true)}
          id="btn-ai-counsel-launcher"
          className="flex items-center gap-2 px-5 py-4 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-600/20 hover:bg-slate-900 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] outline-none border border-indigo-500/10 cursor-pointer"
        >
          <Bot className="w-5.5 h-5.5 text-white" />
          <span className="text-sm font-display font-medium tracking-wide">AI Counselor</span>
        </button>
      )}
    </div>
  );
}
