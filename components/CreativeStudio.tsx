import React, { useState, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import Card from './common/Card';
import Spinner from './common/Spinner';
import ApiKeyDialog from './common/ApiKeyDialog';
import { watermarkImageDataUrl } from '../assets/watermark';

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
  </svg>
);


const CreativeStudio: React.FC = () => {
    // Image Generation State
    const [imagePrompt, setImagePrompt] = useState<string>('Um robô segurando um skate vermelho.');
    const [imageAspectRatio, setImageAspectRatio] = useState<string>('1:1');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
    const [imageGenError, setImageGenError] = useState<string | null>(null);

    // Image Editing State
    const [imageToEdit, setImageToEdit] = useState<File | null>(null);
    const [imageToEditPreview, setImageToEditPreview] = useState<string | null>(null);
    const [editPrompt, setEditPrompt] = useState<string>('adicione uma lhama ao lado da imagem');
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [isEditingImage, setIsEditingImage] = useState<boolean>(false);
    const [imageEditError, setImageEditError] = useState<string | null>(null);

    // Video Generation State
    const [videoPrompt, setVideoPrompt] = useState<string>('Um holograma de néon de um gato dirigindo em alta velocidade');
    const [videoStartImage, setVideoStartImage] = useState<File | null>(null);
    const [videoStartImagePreview, setVideoStartImagePreview] = useState<string | null>(null);
    const [videoAspectRatio, setVideoAspectRatio] = useState<string>('16:9');
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
    const [videoGenError, setVideoGenError] = useState<string | null>(null);
    const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState<boolean>(false);
    const [hasApiKey, setHasApiKey] = useState<boolean>(false);

    useEffect(() => {
        // Check for API key on mount for video generation
        const checkKey = async () => {
            // @ts-ignore
            if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
                setHasApiKey(true);
            }
        };
        checkKey();
    }, []);

    const applyWatermark = (imageUrl: string, mimeType: 'image/jpeg' | 'image/png'): Promise<string> => {
        return new Promise((resolve) => {
            const baseImg = new Image();
            baseImg.crossOrigin = 'anonymous';
            baseImg.onload = () => {
                const watermarkImg = new Image();
                watermarkImg.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return resolve(imageUrl);

                    canvas.width = baseImg.width;
                    canvas.height = baseImg.height;
                    ctx.drawImage(baseImg, 0, 0);

                    const padding = canvas.width * 0.02; 
                    const watermarkWidth = canvas.width * 0.15; 
                    const watermarkHeight = watermarkImg.height * (watermarkWidth / watermarkImg.width);
                    const x = canvas.width - watermarkWidth - padding;
                    const y = canvas.height - watermarkHeight - padding;

                    ctx.globalAlpha = 0.7; 
                    ctx.drawImage(watermarkImg, x, y, watermarkWidth, watermarkHeight);

                    resolve(canvas.toDataURL(mimeType));
                };
                watermarkImg.onerror = () => resolve(imageUrl);
                watermarkImg.src = watermarkImageDataUrl;
            };
            baseImg.onerror = () => resolve(imageUrl); 
            baseImg.src = imageUrl;
        });
    };

    const handleShare = async (dataUrl: string, fileName: string, title: string) => {
        if (!navigator.share) {
            alert('O compartilhamento não é suportado neste navegador.');
            return;
        }
        try {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: blob.type });
            await navigator.share({
                files: [file],
                title: title,
            });
        } catch (error) {
            console.error('Erro ao compartilhar arquivo:', error);
            if ((error as DOMException).name !== 'AbortError') {
                alert(`Falha ao compartilhar: ${(error as Error).message}`);
            }
        }
    };

    const handleImageGeneration = async () => {
        if (!imagePrompt) return;
        setIsGeneratingImage(true);
        setGeneratedImage(null);
        setImageGenError(null);
        try {
            const imageBytes = await geminiService.generateImage(imagePrompt, imageAspectRatio);
            let imageUrl = `data:image/jpeg;base64,${imageBytes}`;
            imageUrl = await applyWatermark(imageUrl, 'image/jpeg');
            setGeneratedImage(imageUrl);
        } catch (e: any) {
            setImageGenError(`Falha ao gerar imagem: ${e.message}`);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleImageToEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageToEdit(file);
            setImageToEditPreview(URL.createObjectURL(file));
            setEditedImage(null);
        }
    };
    
    const handleImageEditing = async () => {
        if (!imageToEdit || !editPrompt) return;
        setIsEditingImage(true);
        setEditedImage(null);
        setImageEditError(null);
        try {
            const base64Data = await fileToBase64(imageToEdit);
            const imageBytes = await geminiService.editImage(base64Data, imageToEdit.type, editPrompt);
            let imageUrl = `data:image/png;base64,${imageBytes}`;
            imageUrl = await applyWatermark(imageUrl, 'image/png');
            setEditedImage(imageUrl);
        } catch (e: any) {
            setImageEditError(`Falha ao editar imagem: ${e.message}`);
        } finally {
            setIsEditingImage(false);
        }
    };

    const handleVideoStartImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setVideoStartImage(file);
            setVideoStartImagePreview(URL.createObjectURL(file));
        }
    };

    const handleVideoGeneration = async () => {
        // @ts-ignore
        if (!hasApiKey && !(window.aistudio && await window.aistudio.hasSelectedApiKey())) {
            setIsApiKeyDialogOpen(true);
            return;
        }

        if (!hasApiKey) setHasApiKey(true);

        if (!videoPrompt) return;
        setIsGeneratingVideo(true);
        setGeneratedVideo(null);
        setVideoGenError(null);

        try {
            let base64Data: string | undefined = undefined;
            if (videoStartImage) {
                base64Data = await fileToBase64(videoStartImage);
            }
            const videoUrl = await geminiService.generateVideo(
                videoPrompt,
                base64Data,
                videoStartImage?.type,
                videoAspectRatio
            );
            setGeneratedVideo(videoUrl);
        } catch (e: any) {
            if (e.message.includes("Requested entity was not found")) {
                setVideoGenError("Chave de API inválida ou não encontrada. Por favor, selecione uma chave de API válida.");
                setHasApiKey(false);
                setIsApiKeyDialogOpen(true);
            } else {
                setVideoGenError(`Falha ao gerar vídeo: ${e.message}`);
            }
        } finally {
            setIsGeneratingVideo(false);
        }
    };


    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isApiKeyDialogOpen && (
                <ApiKeyDialog 
                    onClose={() => setIsApiKeyDialogOpen(false)} 
                    onKeySelected={() => {
                        setHasApiKey(true);
                        setTimeout(() => handleVideoGeneration(), 100);
                    }}
                />
            )}
            
            {/* Image Generation */}
            <Card title="Gerador de Imagens">
                <div className="space-y-4">
                    <textarea
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-accent focus:outline-none"
                        placeholder="Descreva a imagem que você quer criar..."
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        rows={4}
                    />
                    <div className="flex items-center space-x-4">
                        <label htmlFor="aspect-ratio" className="text-sm font-medium text-gray-400">Proporção:</label>
                        <select
                            id="aspect-ratio"
                            value={imageAspectRatio}
                            onChange={(e) => setImageAspectRatio(e.target.value)}
                            className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                        >
                            <option value="1:1">1:1 (Quadrado)</option>
                            <option value="16:9">16:9 (Paisagem)</option>
                            <option value="9:16">9:16 (Retrato)</option>
                            <option value="4:3">4:3</option>
                            <option value="3:4">3:4</option>
                        </select>
                    </div>
                    <button
                        onClick={handleImageGeneration}
                        disabled={isGeneratingImage || !imagePrompt}
                        className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-600"
                    >
                        {isGeneratingImage ? <Spinner /> : 'Gerar Imagem'}
                    </button>
                    {imageGenError && <p className="text-red-400">{imageGenError}</p>}
                    {isGeneratingImage && <div className="flex justify-center p-8"><Spinner /></div>}
                    {generatedImage && (
                        <div className="mt-4 group relative">
                            <img src={generatedImage} alt="Generated" className="rounded-lg" />
                             <div className="absolute bottom-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a href={generatedImage} download="imagem_gerada.jpeg" title="Baixar" className="p-2 bg-gray-600/70 hover:bg-gray-500/70 rounded-full text-white"><DownloadIcon /></a>
                                <button onClick={() => handleShare(generatedImage, 'imagem_gerada.jpeg', 'Imagem Gerada por IA')} title="Compartilhar" className="p-2 bg-gray-600/70 hover:bg-gray-500/70 rounded-full text-white"><ShareIcon /></button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Image Editing */}
            <Card title="Editor de Imagens">
                 <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-400">
                        1. Carregue uma imagem para editar:
                    </label>
                    <input type="file" accept="image/*" onChange={handleImageToEditChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-secondary file:text-white hover:file:bg-brand-dark" />
                    {imageToEditPreview && <img src={imageToEditPreview} alt="Preview" className="rounded-lg max-h-48 mx-auto" />}
                    <label className="block text-sm font-medium text-gray-400">
                        2. Descreva a edição:
                    </label>
                    <textarea
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-accent focus:outline-none"
                        placeholder="Ex: adicione óculos de sol no gato"
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        rows={3}
                        disabled={!imageToEdit}
                    />
                    <button
                        onClick={handleImageEditing}
                        disabled={isEditingImage || !imageToEdit || !editPrompt}
                        className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-600"
                    >
                        {isEditingImage ? <Spinner /> : 'Editar Imagem'}
                    </button>
                    {imageEditError && <p className="text-red-400">{imageEditError}</p>}
                    {isEditingImage && <div className="flex justify-center p-8"><Spinner /></div>}
                    {editedImage && (
                        <div className="mt-4 group relative">
                            <img src={editedImage} alt="Edited" className="rounded-lg" />
                            <div className="absolute bottom-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a href={editedImage} download="imagem_editada.png" title="Baixar" className="p-2 bg-gray-600/70 hover:bg-gray-500/70 rounded-full text-white"><DownloadIcon /></a>
                                <button onClick={() => handleShare(editedImage, 'imagem_editada.png', 'Imagem Editada por IA')} title="Compartilhar" className="p-2 bg-gray-600/70 hover:bg-gray-500/70 rounded-full text-white"><ShareIcon /></button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
            
             {/* Video Generation */}
            <Card title="Gerador de Vídeos (Veo)">
                <div className="space-y-4">
                    <textarea
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-accent focus:outline-none"
                        placeholder="Descreva a cena do vídeo..."
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        rows={4}
                    />
                     <div className="flex items-center space-x-4">
                        <label htmlFor="video-aspect-ratio" className="text-sm font-medium text-gray-400">Proporção:</label>
                        <select
                            id="video-aspect-ratio"
                            value={videoAspectRatio}
                            onChange={(e) => setVideoAspectRatio(e.target.value)}
                            className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                        >
                            <option value="16:9">16:9 (Paisagem)</option>
                            <option value="9:16">9:16 (Retrato)</option>
                        </select>
                    </div>
                     <label className="block text-sm font-medium text-gray-400">
                        Imagem de início (opcional):
                    </label>
                    <input type="file" accept="image/*" onChange={handleVideoStartImageChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-secondary file:text-white hover:file:bg-brand-dark" />
                    {videoStartImagePreview && <img src={videoStartImagePreview} alt="Video Start Preview" className="rounded-lg max-h-32 mx-auto" />}
                    <button
                        onClick={handleVideoGeneration}
                        disabled={isGeneratingVideo || !videoPrompt}
                        className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-600"
                    >
                        {isGeneratingVideo ? 'Gerando... (pode levar alguns minutos)' : 'Gerar Vídeo'}
                    </button>
                    {videoGenError && <p className="text-red-400">{videoGenError}</p>}
                    {isGeneratingVideo && (
                         <div className="text-center p-4">
                            <Spinner />
                            <p className="mt-2 text-sm text-gray-400">A geração de vídeo está em andamento. Isso pode levar alguns minutos. Por favor, seja paciente.</p>
                         </div>
                    )}
                    {generatedVideo && (
                        <div className="mt-4">
                           <video controls src={generatedVideo} className="rounded-lg w-full"></video>
                        </div>
                    )}
                </div>
            </Card>

        </div>
    );
};

export default CreativeStudio;
