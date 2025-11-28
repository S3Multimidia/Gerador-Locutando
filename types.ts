export interface Voice {
  id: string; // ID técnico usado pela API (ex: 'Kore')
  name: string; // Nome interno (pode ser o mesmo que o id)
  displayName: string; // Nome de exibição do locutor (ex: 'Beatriz Soares')
  gender: 'Masculino' | 'Feminino';
  language: 'pt-BR' | 'en-US';
  description: string;
  prompt: string;
  imageUrl: string;
  demoUrl: string;
  defaultTrackUrl?: string;
}

export interface TrackInfo {
  name: string;
  url: string;
}

export type Role = 'user' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  plan: 'Básico' | 'Profissional' | 'Empresarial';
  status: 'Ativo' | 'Inativo';
  role: Role;
  password: string;
}

export interface Client {
  id: string;
  name: string;
  instructions: string; // Endereço, telefone, guia de pronúncia, etc.
}