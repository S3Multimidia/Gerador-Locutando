import type { Voice } from './types';
import type { TrackInfo } from './App';

// The order is based on the visual design provided in the user prompt
export const INITIAL_VOICES: Voice[] = [
  { 
    id: 'Iapetus', 
    name: 'Iapetus', 
    displayName: 'Daniel Costa',
    gender: 'Masculino', 
    language: 'pt-BR',
    description: 'Voz masculina animada, jovem e vendedora. Ideal para promoções e anúncios com energia e entusiasmo.',
    imageUrl: 'https://storage.googleapis.com/aistudio-ux-team-public/sdk-samples/locutando/daniel_costa.webp',
    demoUrl: 'https://storage.googleapis.com/aistudio-ux-team-public/sdk-samples/locutando/voice_demo_daniel.mp3'
  },
];

export const INITIAL_BACKGROUND_TRACKS: TrackInfo[] = [
  {
    name: 'Trilha Padrão Otimista',
    url: 'https://storage.googleapis.com/aistudio-ux-team-public/sdk-samples/locutando/trilha_padrao_otimista.mp3',
  }
];