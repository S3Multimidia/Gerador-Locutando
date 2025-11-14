

import type { Voice } from './types';

// The order is based on the visual design provided in the user prompt
export const AVAILABLE_VOICES: Voice[] = [
  { 
    id: 'Iapetus', 
    name: 'Iapetus', 
    displayName: 'Iapetus',
    gender: 'Masculino', 
    language: 'pt-BR',
    description: 'Voz masculina animada, jovem e vendedora. Ideal para promoções e anúncios com energia e entusiasmo.',
    imageUrl: 'https://storage.googleapis.com/aistudio-ux-team-public/sdk-samples/locutando/daniel_costa.webp',
    demoUrl: 'http://s3m.com.br/vozes/locutorgepeto.mp3'
  },
];

export const DEFAULT_BACKGROUND_TRACK_URL = 'https://storage.googleapis.com/aistudio-ux-team-public/sdk-samples/locutando/upbeat_background.mp3';