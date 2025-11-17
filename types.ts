
export enum Tab {
  CreativeStudio = 'Estúdio Criativo',
  AIAssistant = 'Assistente de IA',
  MarketResearch = 'Pesquisa de Mercado',
  Tools = 'Ferramentas',
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface GroundingSource {
    uri: string;
    title: string;
}