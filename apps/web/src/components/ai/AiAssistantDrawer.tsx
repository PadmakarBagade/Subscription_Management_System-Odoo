import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, ArrowRight, Loader2 } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  dataBasis?: any;
  suggestedActions?: Array<{ label: string; url: string }>;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'Hello! I am your Brightloop AI Revenue Assistant. Ask me any question about your real-time revenue, active subscriptions, collection trends, or overdue invoices.',
      suggestedActions: [
        { label: 'Overview Metrics', url: '/admin' },
        { label: 'View Reports', url: '/admin/reports' },
      ],
    },
  ]);

  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = { sender: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiRequest('/ai/query', {
        method: 'POST',
        body: JSON.stringify({ question: textToSend }),
      });

      if (res.success && res.data) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: res.data.response,
            dataBasis: res.data.dataBasis,
            suggestedActions: res.data.suggestedActions,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Unable to process query: ${err.message || 'Server error'}. Please try asking about active subscriptions, overdue invoices, or collections.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    'What is our total revenue collected?',
    'How many subscriptions are active?',
    'Are there any overdue invoices?',
    'Which plan generates the most revenue?',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">AI Revenue Assistant</h3>
                <p className="text-xs text-indigo-600 font-medium">Read-Only Financial Intelligence</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs whitespace-nowrap">
            <span className="text-slate-400">Suggestions:</span>
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="bg-white border border-slate-200 px-2.5 py-1 rounded-full text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-3.5 text-sm ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60'
                  }`}
                >
                  <p className="leading-relaxed">{m.text}</p>

                  {/* Basis Data Badge */}
                  {m.dataBasis && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 text-xs text-slate-600 grid grid-cols-2 gap-2">
                      <div className="bg-white/80 p-1.5 rounded">
                        <span className="block text-[10px] text-slate-400 uppercase">Total Invoiced</span>
                        <span className="font-semibold text-slate-900">₹{m.dataBasis.totalInvoiced?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="bg-white/80 p-1.5 rounded">
                        <span className="block text-[10px] text-slate-400 uppercase">Collected</span>
                        <span className="font-semibold text-emerald-600">₹{m.dataBasis.totalCollected?.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {m.suggestedActions && m.suggestedActions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.suggestedActions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => {
                            navigate(act.url);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white px-2 py-1 rounded border border-indigo-100 hover:border-indigo-300 transition-colors"
                        >
                          {act.label} <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-xl p-3.5 text-slate-500 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Analyzing revenue metrics...</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Input */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about revenue, churn, overdue invoices..."
                className="flex-1 px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
