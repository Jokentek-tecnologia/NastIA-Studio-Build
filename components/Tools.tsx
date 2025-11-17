import React, { useState } from 'react';
import * as geminiService from '../services/geminiService';
import Card from './common/Card';
import Spinner from './common/Spinner';

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

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);


const Tools: React.FC = () => {
    // State for Complex Analysis
    const [prompt, setPrompt] = useState<string>('Analise os dados de vendas trimestrais anexados e forneça um resumo executivo, destacando as principais tendências de crescimento, produtos de melhor desempenho e áreas para melhoria. (Nota: funcionalidade de upload de arquivo não implementada neste exemplo)');
    const [result, setResult] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    
    // State for Audio Transcription
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [transcription, setTranscription] = useState<string | null>(null);
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
    const [transcriptionError, setTranscriptionError] = useState<string | null>(null);


    const handleAnalysis = async () => {
        if (!prompt) return;
        setIsAnalyzing(true);
        setResult(null);
        setAnalysisError(null);
        try {
            const analysisResult = await geminiService.complexAnalysis(prompt);
            setResult(analysisResult);
        } catch (e: any) {
            setAnalysisError(`Falha na análise: ${e.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAudioFile(e.target.files[0]);
            setTranscription(null);
            setTranscriptionError(null);
        }
    };

    const handleTranscription = async () => {
        if (!audioFile) return;
        setIsTranscribing(true);
        setTranscription(null);
        setTranscriptionError(null);
        try {
            const transcribedText = await geminiService.transcribeAudio(audioFile);
            setTranscription(transcribedText);
        } catch (e: any) {
            setTranscriptionError(`Falha na transcrição: ${e.message}`);
        } finally {
            setIsTranscribing(false);
        }
    };
    
    const handleCopyText = (text: string, button: HTMLButtonElement) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const originalContent = button.innerHTML;
            button.innerHTML = 'Copiado!';
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
        if (!text) return;
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

    const handleDownloadText = (content: string, filename: string) => {
        if (!content) return;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
            <Card title="Ferramenta de Análise Complexa (Gemini 2.5 Pro)">
                <div className="space-y-4">
                    <p className="text-gray-400">
                        Use esta ferramenta para tarefas complexas que exigem raciocínio avançado, como análise de dados, geração de código ou planejamento estratégico.
                    </p>
                    <textarea
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-accent focus:outline-none"
                        placeholder="Digite sua tarefa ou pergunta complexa..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={8}
                    />
                    <button
                        onClick={handleAnalysis}
                        disabled={isAnalyzing || !prompt}
                        className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-600"
                    >
                        {isAnalyzing ? <Spinner /> : 'Executar Análise'}
                    </button>
                    {analysisError && <p className="text-red-400">{analysisError}</p>}
                    {isAnalyzing && <div className="flex justify-center p-8"><Spinner /></div>}
                    {result && (
                        <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
                             <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold text-gray-200">Resultado da Análise:</h3>
                                <div className="flex items-center space-x-2">
                                    <button onClick={(e) => handleCopyText(result, e.currentTarget)} title="Copiar" className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded-full text-white disabled:opacity-50"><CopyIcon /></button>
                                    <button onClick={() => handleShareText(result)} title="Compartilhar" className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded-full text-white"><ShareIcon /></button>
                                    <button onClick={() => handleDownloadText(result, 'analise.txt')} title="Download .txt" className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded-full text-white"><DownloadIcon /></button>
                                </div>
                             </div>
                             <p className="text-gray-300 whitespace-pre-wrap">{result}</p>
                        </div>
                    )}
                </div>
            </Card>

            <Card title="Transcrição de Áudio">
                 <div className="space-y-4">
                    <p className="text-gray-400">
                        Carregue um arquivo de áudio para transcrever seu conteúdo em texto.
                    </p>
                    <input type="file" accept="audio/*" onChange={handleAudioFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-secondary file:text-white hover:file:bg-brand-dark" />
                    {audioFile && <p className="text-sm text-gray-500">Arquivo selecionado: {audioFile.name}</p>}
                    <button
                        onClick={handleTranscription}
                        disabled={isTranscribing || !audioFile}
                        className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-600"
                    >
                        {isTranscribing ? <Spinner /> : 'Transcrever Áudio'}
                    </button>
                     {transcriptionError && <p className="text-red-400">{transcriptionError}</p>}
                     {isTranscribing && <div className="flex justify-center p-8"><Spinner /></div>}
                     {transcription && (
                        <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
                             <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold text-gray-200">Transcrição:</h3>
                                <div className="flex items-center space-x-2">
                                    <button onClick={(e) => handleCopyText(transcription, e.currentTarget)} title="Copiar" className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded-full text-white disabled:opacity-50"><CopyIcon /></button>
                                    <button onClick={() => handleShareText(transcription)} title="Compartilhar" className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded-full text-white"><ShareIcon /></button>
                                    <button onClick={() => handleDownloadText(transcription, 'transcricao.txt')} title="Download .txt" className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded-full text-white"><DownloadIcon /></button>
                                </div>
                             </div>
                             <p className="text-gray-300 whitespace-pre-wrap">{transcription}</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Tools;