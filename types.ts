
export interface Voice {
  id: string; // ID técnico usado pela API (ex: 'Kore')
  name: string; // Nome interno (pode ser o mesmo que o id)
  displayName: string; // Nome de exibição do locutor (ex: 'Beatriz Soares')
  gender: 'Masculino' | 'Feminino';
  language: 'pt-BR' | 'en-US';
  description: string;
  imageUrl: string;
  demoUrl: string;
}