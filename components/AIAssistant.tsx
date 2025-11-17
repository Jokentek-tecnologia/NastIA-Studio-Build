
import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as geminiService from '../services/geminiService';
import { ChatMessage } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';
import * as audioUtils from '../utils/audioUtils';
import { LiveSession, LiveServerMessage } from '@google/genai';

interface Prompt {
  label: string;
  value: string;
}

const predefinedPrompts: Prompt[] = [
  { label: 'Analisar Concorrência', value: 'Faça uma análise SWOT para a empresa [Nome do Concorrente] com base em sua presença online (website e redes sociais).' },
  { label: 'Criar Post para Redes Sociais', value: 'Crie 3 legendas criativas para um post no Instagram sobre o lançamento do nosso novo produto: [Nome do Produto]. Foque nos benefícios para o cliente.' },
  { label: 'Escrever E-mail Marketing', value: 'Escreva um e-mail marketing para nossa base de clientes anunciando uma promoção de 20% de desconto em [Categoria de Produtos] por tempo limitado. O tom deve ser amigável e urgente.' },
  { label: 'Brainstorm de Ideias de Conteúdo', value: 'Liste 5 ideias de posts para blog ou vídeo para uma empresa que vende [Tipo de Produto/Serviço]. As ideias devem ser focadas em educar o cliente e resolver seus problemas.' },
  { label: 'Sugerir Estratégia de Anúncios', value: 'Qual seria a melhor plataforma (Google Ads, Facebook Ads, TikTok Ads) para anunciar um [Tipo de Produto/Serviço] para um público-alvo de [Descrição do Público-Alvo]? Forneça uma justificativa.' },
];

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
  </svg>
);


const AIAssistant: React.FC = () => {
  // Estado do Chatbot
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatting, setIsChatting] = useState<boolean>(false);
  const [systemInstruction, setSystemInstruction] = useState<string>('Você é um assistente de marketing especialista para uma pequena empresa. Forneça conselhos concisos e práticos.');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);
  const [allPrompts, setAllPrompts] = useState<Prompt[]>(predefinedPrompts);


  // Estado da Conversa por Voz
  const [isVoiceSessionActive, setIsVoiceSessionActive] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [error, setError] = useState<string | null>(null);
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Carregar personas personalizadas do localStorage
    try {
      const savedPrompts = localStorage.getItem('customPersonas');
      if (savedPrompts) {
        const customPrompts = JSON.parse(savedPrompts);
        setAllPrompts([...predefinedPrompts, ...customPrompts]);
      }
    } catch (e) {
      console.error("Failed to load custom personas from localStorage", e);
    }
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handlePersonaSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSystemInstruction(e.target.value);
  };
  
  const handleSavePersona = () => {
    const label = window.prompt("Digite um nome para esta persona:", "Minha Persona Personalizada");
    if (label && systemInstruction.trim()) {
      const newPrompt = { label, value: systemInstruction };
      try {
        const savedPrompts = localStorage.getItem('customPersonas');
        const customPrompts = savedPrompts ? JSON.parse(savedPrompts) : [];
        const updatedPrompts = [...customPrompts, newPrompt];
        localStorage.setItem('customPersonas', JSON.stringify(updatedPrompts));
        setAllPrompts([...predefinedPrompts, ...updatedPrompts]);
        alert(`Persona "${label}" salva com sucesso!`);
      } catch (e) {
        console.error("Failed to save custom persona to localStorage", e);
        alert("Ocorreu um erro ao salvar a persona.");
      }
    }
  };

  const handleResetChat = () => {
    setChatHistory([]);
    chatRef.current = null;
    alert("O chat foi resetado. A nova persona será usada na próxima mensagem.");
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    
    const newUserMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatHistory(prev => [...prev, newUserMessage]);
    setChatInput('');
    setIsChatting(true);

    try {
        if (!chatRef.current) {
            chatRef.current = geminiService.startChat(systemInstruction);
        }
        
        let fullResponse = "";
        const stream = await geminiService.streamChat(chatRef.current, chatInput);
        
        let currentModelMessageIndex = -1;

        for await (const chunk of stream) {
            const chunkText = chunk.text;
            fullResponse += chunkText;
            if (currentModelMessageIndex === -1) {
              setChatHistory(prev => {
                const newHistory = [...prev, { role: 'model', content: fullResponse }];
                currentModelMessageIndex = newHistory.length - 1;
                return newHistory;
              });
            } else {
               setChatHistory(prev => {
                 const newHistory = [...prev];
                 newHistory[currentModelMessageIndex] = { role: 'model', content: fullResponse };
                 return newHistory;
               });
            }
        }

    } catch (e: any) {
        // FIX: Explicitly type the error message object to satisfy the ChatMessage interface.
        const errorMessage: ChatMessage = { role: 'model', content: `Erro: ${e.message}` };
        setChatHistory(prev => [...prev, errorMessage]);
    } finally {
        setIsChatting(false);
    }
  };

    const handleCopyText = (text: string, button: HTMLButtonElement) => {
        navigator.clipboard.writeText(text).then(() => {
            const originalContent = button.innerHTML;
            button.textContent = 'Copiado!';
            button.disabled = true;
            setTimeout(() => {
                button.innerHTML = originalContent;
                button.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error('Falha ao copiar texto: ', err);
            alert('Falha ao copiar texto.');
        });
    };

    const handleShareText = async (text: string) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Conteúdo Gerado por IA',
                    text: text,
                });
            } catch (error) {
                 if ((error as DOMException).name !== 'AbortError') {
                    console.error('Erro ao compartilhar texto:', error)
                 }
            }
        } else {
            alert('O compartilhamento não é suportado neste navegador.');
        }
    };

  const startVoiceConversation = useCallback(async () => {
    setError(null);
    setVoiceStatus('listening');
    setIsVoiceSessionActive(true);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphoneStreamRef.current = stream;

        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = inputAudioContext;

        sessionPromiseRef.current = geminiService.startVoiceConversation({
            onMessage: (message: LiveServerMessage) => {
                if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
                    setVoiceStatus('speaking');
                }
                 if (message.serverContent?.turnComplete) {
                    setVoiceStatus('listening');
                }
            },
            onError: (e: ErrorEvent) => {
                console.error("Erro na sessão de voz:", e);
                setError("Ocorreu um erro durante a sessão de voz.");
                stopVoiceConversation();
            },
            onClose: () => {
                console.log("Sessão de voz fechada.");
                stopVoiceConversation();
            }
        });

        mediaStreamSourceRef.current = inputAudioContext.createMediaStreamSource(stream);
        scriptProcessorRef.current = inputAudioContext.createScriptProcessor(4096, 1, 1);

        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = audioUtils.createPcmBlob(inputData);
            if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
            }
        };

        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(inputAudioContext.destination);

    } catch (e: any) {
        console.error("Falha ao iniciar a conversa por voz:", e);
        setError("Não foi possível acessar o microfone. Por favor, verifique as permissões.");
        setIsVoiceSessionActive(false);
        setVoiceStatus('idle');
    }
  }, []);

  const stopVoiceConversation = useCallback(async () => {
    if (sessionPromiseRef.current) {
      const session = await sessionPromiseRef.current;
      session.close();
      sessionPromiseRef.current = null;
    }

    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsVoiceSessionActive(false);
    setVoiceStatus('idle');
  }, []);
  
  const voiceStatusMap = {
    idle: 'Inativo',
    listening: 'Ouvindo...',
    processing: 'Processando...',
    speaking: 'Falando...'
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Chatbot */}
      <Card title="Assistente de Marketing IA (Chat)">
        <div className="flex flex-col h-[700px]">
          <div className="mb-4 space-y-2">
              <label htmlFor="persona-select" className="block text-sm font-medium text-gray-400">Carregar uma persona:</label>
              <select
                  id="persona-select"
                  className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                  onChange={handlePersonaSelect}
                  value={""} 
              >
                  <option value="" disabled>-- Selecione uma persona para carregar --</option>
                  <optgroup label="Sugestões">
                    {predefinedPrompts.map(p => <option key={p.label} value={p.value}>{p.label}</option>)}
                  </optgroup>
                  {allPrompts.length > predefinedPrompts.length && (
                    <optgroup label="Minhas Personas">
                      {allPrompts.filter(p => !predefinedPrompts.includes(p)).map(p => <option key={p.label} value={p.value}>{p.label}</option>)}
                    </optgroup>
                  )}
              </select>
              <label htmlFor="system-instruction" className="block text-sm font-medium text-gray-400 mt-2">Defina a persona da IA (Instrução do Sistema):</label>
              <textarea
                id="system-instruction"
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                rows={4}
                placeholder="Defina a persona da IA..."
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
              />
              <div className="flex space-x-2">
                 <button onClick={handleSavePersona} className="flex-1 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg">Salvar Persona Atual</button>
                 <button onClick={handleResetChat} className="flex-1 text-sm bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg">Resetar Chat</button>
              </div>
          </div>
          <div ref={chatContainerRef} className="flex-grow p-4 bg-gray-800/50 rounded-lg overflow-y-auto mb-4 space-y-4">
            {chatHistory.length === 0 && <div className="text-center text-gray-500">A conversa aparecerá aqui.</div>}
            {chatHistory.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`group relative max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl ${msg.role === 'user' ? 'bg-brand-secondary text-white' : 'bg-gray-700 text-gray-200'}`}>
                   <p style={{whiteSpace: 'pre-wrap'}}>{msg.content}</p>
                    {msg.role === 'model' && msg.content && !isChatting && (
                        <div className="absolute top-0 right-0 -mt-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => handleCopyText(msg.content, e.currentTarget)} 
                                title="Copiar texto" 
                                className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded-full text-white disabled:opacity-50"
                            >
                                <CopyIcon />
                            </button>
                            <button 
                                onClick={() => handleShareText(msg.content)} 
                                title="Compartilhar texto" 
                                className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded-full text-white"
                            >
                                <ShareIcon />
                            </button>
                        </div>
                    )}
                </div>
              </div>
            ))}
             {isChatting && chatHistory[chatHistory.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                    <div className="p-3 rounded-2xl bg-gray-700 text-gray-200"><Spinner/></div>
                </div>
             )}
          </div>
          <div className="flex">
            <textarea
              className="flex-grow p-3 bg-gray-800 border border-gray-700 rounded-l-lg focus:ring-2 focus:ring-brand-accent focus:outline-none"
              placeholder="Pergunte ao seu assistente de IA..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && !isChatting && (handleChatSend(), e.preventDefault())}
              disabled={isChatting}
              rows={2}
            />
            <button
              onClick={handleChatSend}
              disabled={isChatting}
              className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-6 rounded-r-lg transition-colors disabled:bg-gray-600 flex items-center justify-center"
            >
              Enviar
            </button>
          </div>
        </div>
      </Card>
      
      {/* Voice Conversation */}
      <Card title="Agente de Voz IA">
        <div className="flex flex-col items-center justify-center h-[700px] text-center">
            {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-4">{error}</div>}
            <div className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 ${
                voiceStatus === 'listening' ? 'bg-blue-500/30 animate-pulse' : 
                voiceStatus === 'speaking' ? 'bg-amber-500/30 animate-pulse' : 
                'bg-gray-700'
            }`}>
                 <div className={`absolute w-full h-full rounded-full ${voiceStatus === 'listening' ? 'animate-ping bg-blue-500' : ''} ${voiceStatus === 'speaking' ? 'animate-ping bg-amber-500' : ''}`}></div>
                <button
                    onClick={isVoiceSessionActive ? stopVoiceConversation : startVoiceConversation}
                    className="w-32 h-32 bg-brand-primary rounded-full text-white text-lg font-semibold z-10 hover:bg-brand-dark focus:outline-none focus:ring-4 focus:ring-brand-accent transition-all"
                >
                    {isVoiceSessionActive ? 'Parar' : 'Iniciar'}
                </button>
            </div>
            <p className="mt-6 text-xl text-gray-400 capitalize">{voiceStatusMap[voiceStatus]}</p>
            <p className="mt-2 text-gray-500">
                {isVoiceSessionActive ? 'Pressione parar para encerrar a conversa.' : 'Pressione iniciar para falar com seu agente de IA.'}
            </p>
        </div>
      </Card>
    </div>
  );
};

export default AIAssistant;