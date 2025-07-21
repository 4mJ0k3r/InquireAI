"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import clsx from "clsx";
import { PaperAirplaneIcon, ClipboardIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { askQuestion, streamChat, getSnippet } from "../services/api";
import { useAuth } from "@/store/useAuth";

interface Message {
  role: 'user' | 'bot';
  text: string;
}

interface FormData {
  prompt: string;
}

interface Snippet {
  text: string;
  source?: string;
}

function Bubble({ role, text, onCitationClick }: { 
  role: 'user' | 'bot'; 
  text: string;
  onCitationClick?: (id: string) => void;
}) {
  // Replace citation patterns [[id]] with clickable superscripts
  const processText = (text: string) => {
    let citationIndex = 0;
    return text.replace(/\[\[(.*?)\]\]/g, (match, id) => {
      citationIndex++;
      return `<sup class="cursor-pointer hover:opacity-80 font-semibold transition-opacity duration-200" style="color: #ffb703;" data-id="${id}">[${citationIndex}]</sup>`;
    });
  };

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'SUP' && target.dataset.id && onCitationClick) {
      onCitationClick(target.dataset.id);
    }
  };

  return (
    <div className={clsx(
      'flex items-start gap-4 mb-6',
      role === 'user' ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {role === 'user' ? (
          <div 
            className="w-10 h-10 text-white flex items-center justify-center rounded-full text-sm font-bold shadow-lg ring-2 ring-white/20"
            style={{ background: 'linear-gradient(135deg, #0f4c81 0%, #ffb703 100%)' }}
          >
            U
          </div>
        ) : (
          <div 
            className="w-10 h-10 text-white flex items-center justify-center rounded-full text-lg shadow-lg ring-2 ring-white/20"
            style={{ background: 'linear-gradient(135deg, #0f4c81 0%, #1e40af 100%)' }}
          >
            🤖
          </div>
        )}
      </div>
      
      {/* Message Bubble */}
      <div className={clsx(
        'max-w-[75%] px-5 py-4 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl',
        role === 'user' 
          ? 'text-white rounded-br-md' 
          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
      )}
      style={role === 'user' ? { 
        background: 'linear-gradient(135deg, #0f4c81 0%, #1e40af 100%)' 
      } : {}}
      >
        <div 
          className={clsx(
            'text-sm leading-relaxed',
            role === 'user' ? 'text-white' : 'text-gray-800'
          )}
          dangerouslySetInnerHTML={{ __html: processText(text) }}
          onClick={handleClick}
        />
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [showSnippet, setShowSnippet] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { register, handleSubmit, reset, watch } = useForm<FormData>();
  const promptValue = watch('prompt');

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [promptValue]);

  const fetchSnippet = async (chunkId: string) => {
    try {
      // For now, we'll use a placeholder docId since we need to track which document the citation comes from
      // In a real implementation, you'd store the docId with each citation
      const response = await getSnippet('placeholder-doc-id', chunkId);
      setSnippet(response.data);
      setShowSnippet(true);
    } catch (error) {
      console.error('Error fetching snippet:', error);
      toast.error('Failed to fetch snippet');
    }
  };



  const onSubmit = async ({ prompt }: FormData) => {
    console.log('🚀 Form submitted with prompt:', prompt);
    
    if (streaming || !prompt.trim()) {
      console.log('❌ Submission blocked - streaming:', streaming, 'prompt empty:', !prompt.trim());
      return;
    }

    console.log('✅ Submitting prompt:', prompt.trim());

    // Add user message
    setMessages(m => [...m, { role: 'user', text: prompt.trim() }]);
    setStreaming(true);
    
    // Clear the form
    reset();
    
    // Also clear the textarea directly
    if (textareaRef.current) {
      textareaRef.current.value = '';
    }

    try {
      // Call the ask API
      console.log('📡 Calling askQuestion API...');
      const response = await askQuestion({ question: prompt.trim() });
      console.log('📡 Ask API response:', response);
      const { chatId } = response.data;

      // Debug token before streaming
      const { token } = useAuth.getState();
      console.log('🔑 Token for streaming:', token ? `${token.substring(0, 20)}...` : 'No token found');
      console.log('🔑 Token length:', token?.length || 0);

      // Start streaming
      console.log('🔄 Starting stream for chatId:', chatId);
      const eventSource = streamChat(chatId);

      eventSource.onopen = () => {
        console.log('🔗 EventSource connection opened');
      };

      eventSource.onmessage = (event) => {
        console.log('📨 Received token:', event.data);
        
        // Handle plain text response (not JSON)
        const token = event.data;
        
        setMessages(m => {
          const newMessages = [...m];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage?.role === 'bot') {
            lastMessage.text += token;
          } else {
            newMessages.push({ role: 'bot', text: token });
          }
          
          return newMessages;
        });
      };

      eventSource.addEventListener('end', () => {
        console.log('🏁 Stream ended');
        eventSource.close();
        setStreaming(false);
      });

      eventSource.onerror = (error) => {
        console.error('❌ EventSource error:', error);
        console.error('❌ EventSource readyState:', eventSource.readyState);
        console.error('❌ EventSource url:', eventSource.url);
        eventSource.close();
        setStreaming(false);
        toast.error('Connection error occurred');
      };

    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to send message';
      toast.error(errorMessage);
      setStreaming(false);
    }
  };

  const copyToClipboard = async () => {
    if (snippet?.text) {
      try {
        await navigator.clipboard.writeText(snippet.text);
        toast.success('Copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy');
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col" style={{ background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)' }}>
      {/* Messages Area */}
      <div id="messages" className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div 
              className="rounded-3xl p-12 shadow-xl border border-white/20 backdrop-blur-sm"
              style={{ background: 'linear-gradient(135deg, rgba(15, 76, 129, 0.05) 0%, rgba(255, 183, 3, 0.05) 100%)' }}
            >
              <div className="text-8xl mb-6">💬</div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#0f4c81' }}>
                Start a conversation
              </h2>
              <p className="text-gray-600 text-lg">Ask questions about your uploaded documents</p>
              <div className="mt-6 flex items-center justify-center space-x-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#0f4c81' }}></div>
                <div className="w-2 h-2 rounded-full animate-pulse delay-75" style={{ backgroundColor: '#ffb703' }}></div>
                <div className="w-2 h-2 rounded-full animate-pulse delay-150" style={{ backgroundColor: '#0f4c81' }}></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {messages.map((message, index) => (
              <Bubble
                key={index}
                role={message.role}
                text={message.text}
                onCitationClick={fetchSnippet}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Chat Form */}
      <div className="bg-white/80 backdrop-blur-sm border-t shadow-lg" style={{ borderColor: 'rgba(15, 76, 129, 0.1)' }}>
        <form onSubmit={(e) => {
          console.log('📝 Form onSubmit triggered');
          handleSubmit(onSubmit)(e);
        }} className="p-6 max-w-4xl mx-auto">
          <div className="flex gap-4">
            <textarea
              {...register('prompt', { required: true })}
              ref={textareaRef}
              placeholder="Ask a question about your documents..."
              className="flex-1 resize-none rounded-2xl border px-5 py-4 focus:outline-none focus:ring-2 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-lg"
              style={{ 
                borderColor: 'rgba(15, 76, 129, 0.2)',
                '--tw-ring-color': '#0f4c81'
              } as React.CSSProperties}
              rows={1}
              disabled={streaming}
              onKeyDown={(e) => {
                console.log('⌨️ Key pressed:', e.key, 'Shift:', e.shiftKey);
                if (e.key === 'Enter' && !e.shiftKey) {
                  console.log('⏎ Enter key triggered form submission');
                  e.preventDefault();
                  
                  try {
                    // Debug form state
                    console.log('🔍 Form state debug:');
                    console.log('  - promptValue:', promptValue);
                    console.log('  - promptValue type:', typeof promptValue);
                    console.log('  - streaming:', streaming);
                    console.log('  - form valid:', promptValue?.trim());
                    
                    // Get the actual textarea value as backup
                    const textareaValue = e.currentTarget.value;
                    console.log('  - textarea value:', textareaValue);
                    
                    // Use textarea value if promptValue is undefined
                    const actualPrompt = promptValue || textareaValue || '';
                    console.log('  - actual prompt to use:', actualPrompt);
                    
                    if (actualPrompt.trim()) {
                      // Try direct submission
                      const formData = { prompt: actualPrompt.trim() };
                      console.log('🔄 Calling onSubmit directly with:', formData);
                      onSubmit(formData);
                    } else {
                      console.log('❌ No prompt to submit');
                    }
                  } catch (error) {
                    console.error('❌ Error in onKeyDown:', error);
                  }
                }
              }}
            />
            <button
              type="submit"
              disabled={streaming || !promptValue?.trim()}
              onClick={(e) => {
                console.log('🔘 Button clicked!');
                console.log('  - disabled:', streaming || !promptValue?.trim());
                console.log('  - promptValue:', promptValue);
                console.log('  - streaming:', streaming);
                
                if (!streaming && promptValue?.trim()) {
                  e.preventDefault();
                  const formData = { prompt: promptValue.trim() };
                  console.log('🔄 Button calling onSubmit directly with:', formData);
                  onSubmit(formData);
                }
              }}
              className="rounded-2xl px-8 py-4 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              style={{ 
                background: streaming 
                  ? 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)'
                  : 'linear-gradient(135deg, #0f4c81 0%, #ffb703 100%)'
              }}
            >
              <PaperAirplaneIcon className="h-6 w-6" />
            </button>
          </div>
          
          {streaming && (
            <div className="mt-4 flex items-center justify-center">
              <div className="flex items-center space-x-2 text-sm" style={{ color: '#0f4c81' }}>
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#0f4c81' }}></div>
                <div className="w-2 h-2 rounded-full animate-bounce delay-75" style={{ backgroundColor: '#ffb703' }}></div>
                <div className="w-2 h-2 rounded-full animate-bounce delay-150" style={{ backgroundColor: '#0f4c81' }}></div>
                <span className="ml-2 font-medium">AI is thinking...</span>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Snippet Drawer */}
      <div
        className={clsx(
          "fixed inset-y-0 right-0 w-96 bg-white shadow-2xl transition-transform z-50 border-l",
          showSnippet ? "translate-x-0" : "translate-x-full"
        )}
        style={{ borderColor: 'rgba(15, 76, 129, 0.1)' }}
      >
        <div 
          className="flex items-center justify-between border-b p-6"
          style={{ 
            background: 'linear-gradient(135deg, #0f4c81 0%, #1e40af 100%)',
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <h3 className="text-lg font-bold text-white">Source Reference</h3>
          <button
            onClick={() => setShowSnippet(false)}
            className="text-white/80 hover:text-white transition-colors duration-200 p-1 rounded-lg hover:bg-white/10"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {snippet && (
          <div className="p-6">
            <div className="mb-6">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-md"
                style={{ 
                  color: '#0f4c81',
                  backgroundColor: 'rgba(15, 76, 129, 0.1)',
                  border: '1px solid rgba(15, 76, 129, 0.2)'
                }}
              >
                <ClipboardIcon className="h-4 w-4" />
                Copy text
              </button>
            </div>
            
            <div className="prose prose-sm max-w-none">
              <div 
                className="p-4 rounded-xl border text-gray-700 leading-relaxed"
                style={{ 
                  backgroundColor: 'rgba(15, 76, 129, 0.02)',
                  borderColor: 'rgba(15, 76, 129, 0.1)'
                }}
              >
                {snippet.text}
              </div>
              {snippet.source && (
                <p className="text-xs text-gray-500 mt-4 pt-4 border-t" style={{ borderColor: 'rgba(15, 76, 129, 0.1)' }}>
                  <span className="font-medium">Source:</span> {snippet.source}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overlay for snippet drawer */}
      {showSnippet && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-200"
          onClick={() => setShowSnippet(false)}
        />
      )}
    </div>
  );
}