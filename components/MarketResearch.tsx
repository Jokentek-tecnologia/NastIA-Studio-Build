import React, { useState, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import Card from './common/Card';
import Spinner from './common/Spinner';
import { GroundingSource } from '../types';

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

const MarketResearch: React.FC = () => {
    // Web Search State
    const [webQuery, setWebQuery] = useState<string>('Quais foram as principais tendências de marketing de mídia social em 2024?');
    const [webResult, setWebResult] = useState<{ text: string, sources: GroundingSource[] } | null>(null);
    const [isSearchingWeb, setIsSearchingWeb] = useState<boolean>(false);
    const [webSearchError, setWebSearchError] = useState<string | null>(null);

    // Local Search State
    const [localQuery, setLocalQuery] = useState<string>('Quais restaurantes italianos bem avaliados estão perto de mim?');
    const [localResult, setLocalResult] = useState<{ text: string, sources: GroundingSource[] } | null>(null);
    const [isSearchingLocal, setIsSearchingLocal] = useState<boolean>(false);
    const [localSearchError, setLocalSearchError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                    setLocationError(null);
                },
                (error) => {
                    console.error("Erro ao obter localização: ", error);
                    setLocationError("Não foi possível obter sua localização. A pesquisa local pode ser imprecisa.");
                }
            );
        } else {
            setLocationError("Geolocalização não é suportada por este navegador.");
        }
    }, []);

    const handleCopyText = (text: string, button: HTMLButtonElement) => {
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


    const handleWebSearch = async () => {
        if (!webQuery) return;
        setIsSearchingWeb(true);
        setWebResult(null);
        setWebSearchError(null);
        try {
            const result = await geminiService.searchWeb(webQuery);
            setWebResult(result);
        } catch (e: any) {
            setWebSearchError(`Falha na pesquisa na web: ${e.message}`);
        } finally {
            setIsSearchingWeb(false);
        }
    };

    const handleLocalSearch = async () => {
        if (!localQuery) return;
        setIsSearchingLocal(true);
        setLocalResult(null);
        setLocalSearchError(null);
        try {
            const result = await geminiService.searchLocal(localQuery, userLocation);
            setLocalResult(result);
        } catch (e: any) {
            setLocalSearchError(`Falha na pesquisa local: ${e.message}`);
        } finally {
            setIsSearchingLocal(false);
        }
    };
    
    const renderSources = (sources: GroundingSource[]) => (
        <div className="mt-4">
            <h4 className="font-semibold text-gray-300">Fontes:</h4>
            <ul className="list-disc list-inside space-y-1 mt-2">
                {sources.map((source, index) => (
                    <li key={index}>
                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-brand-secondary hover:underline">
                            {source.title || source.uri}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );

    const renderResultActions = (text: string) => (
         <div className="flex justify-end space-x-2 mb-2">
            <button 
                onClick={(e) => handleCopyText(text, e.currentTarget)} 
                title="Copiar" 
                className="text-xs bg-gray-600 hover:bg-gray-500 text-white font-semibold py-1 px-2 rounded-lg flex items-center space-x-1 disabled:opacity-50"
            >
                <CopyIcon />
            </button>
            <button 
                onClick={() => handleShareText(text)} 
                title="Compartilhar" 
                className="text-xs bg-gray-600 hover:bg-gray-500 text-white font-semibold py-1 px-2 rounded-lg flex items-center space-x-1"
            >
                <ShareIcon />
            </button>
        </div>
    );

    return (
        <div className="grid md:grid-cols-2 gap-8">
            {/* Web Search */}
            <Card title="Pesquisa na Web com IA">
                <div className="space-y-4">
                    <textarea
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-accent focus:outline-none"
                        placeholder="O que você quer pesquisar na web?"
                        value={webQuery}
                        onChange={(e) => setWebQuery(e.target.value)}
                        rows={3}
                    />
                    <button
                        onClick={handleWebSearch}
                        disabled={isSearchingWeb || !webQuery}
                        className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-600"
                    >
                        {isSearchingWeb ? <Spinner /> : 'Pesquisar na Web'}
                    </button>
                    {webSearchError && <p className="text-red-400">{webSearchError}</p>}
                    {isSearchingWeb && <div className="flex justify-center p-8"><Spinner /></div>}
                    {webResult && (
                        <div className="mt-4 p-4 bg-gray-900/50 rounded-lg prose prose-invert max-w-none">
                           {renderResultActions(webResult.text)}
                           <p style={{whiteSpace: 'pre-wrap'}}>{webResult.text}</p>
                           {webResult.sources.length > 0 && renderSources(webResult.sources)}
                        </div>
                    )}
                </div>
            </Card>
            
            {/* Local Search */}
            <Card title="Pesquisa Local com IA">
                <div className="space-y-4">
                    {locationError && <p className="text-amber-400 text-sm">{locationError}</p>}
                    <textarea
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-accent focus:outline-none"
                        placeholder="O que você quer encontrar nas proximidades?"
                        value={localQuery}
                        onChange={(e) => setLocalQuery(e.target.value)}
                        rows={3}
                    />
                    <button
                        onClick={handleLocalSearch}
                        disabled={isSearchingLocal || !localQuery}
                        className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-600"
                    >
                        {isSearchingLocal ? <Spinner /> : 'Pesquisar Localmente'}
                    </button>
                    {localSearchError && <p className="text-red-400">{localSearchError}</p>}
                     {isSearchingLocal && <div className="flex justify-center p-8"><Spinner /></div>}
                    {localResult && (
                        <div className="mt-4 p-4 bg-gray-900/50 rounded-lg prose prose-invert max-w-none">
                            {renderResultActions(localResult.text)}
                            <p style={{whiteSpace: 'pre-wrap'}}>{localResult.text}</p>
                            {localResult.sources.length > 0 && renderSources(localResult.sources)}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default MarketResearch;