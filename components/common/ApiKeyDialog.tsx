
import React from 'react';

interface ApiKeyDialogProps {
    onClose: () => void;
    onKeySelected: () => void;
}

const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({ onClose, onKeySelected }) => {
    
    const handleSelectKey = async () => {
        // @ts-ignore
        if(window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            // @ts-ignore
            await window.aistudio.openSelectKey();
            onKeySelected();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-8 shadow-xl max-w-md w-full border border-gray-700">
                <h2 className="text-2xl font-bold text-brand-accent mb-4">Chave de API Necessária para o Veo</h2>
                <p className="text-gray-300 mb-6">
                    A geração de vídeo com o Veo exige que você selecione sua própria chave de API. Este é um passo necessário para prosseguir.
                    Por favor, garanta que seu projeto tenha o faturamento ativado.
                </p>
                <div className="space-y-4">
                    <button
                        onClick={handleSelectKey}
                        className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        Selecionar Chave de API
                    </button>
                     <a 
                        href="https://ai.google.dev/gemini-api/docs/billing" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block text-center text-sm text-brand-secondary hover:underline"
                    >
                        Saiba mais sobre faturamento
                    </a>
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyDialog;