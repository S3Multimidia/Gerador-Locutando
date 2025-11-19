import React, { useState } from 'react';
import type { Voice } from '../types';
import type { TrackInfo } from '../App';
import { ShieldIcon, UserIcon, MicIcon, MusicIcon, SettingsIcon, TrashIcon, EditIcon } from './IconComponents';

interface AdminPanelProps {
    voices: Voice[];
    setVoices: React.Dispatch<React.SetStateAction<Voice[]>>;
    tracks: TrackInfo[];
    setTracks: React.Dispatch<React.SetStateAction<TrackInfo[]>>;
    ttsModel: string;
    setTtsModel: (model: string) => void;
    chatModel: string;
    setChatModel: (model: string) => void;
}

type AdminTab = 'users' | 'voices' | 'tracks' | 'settings';

const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com', plan: 'Profissional', status: 'Ativo' },
    { id: 2, name: 'Bob', email: 'bob@example.com', plan: 'Básico', status: 'Ativo' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', plan: 'Profissional', status: 'Inativo' },
];

const newVoiceInitialState: Voice = {
    id: '',
    name: '',
    displayName: '',
    gender: 'Masculino',
    language: 'pt-BR',
    description: '',
    imageUrl: '',
    demoUrl: ''
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
    voices, setVoices, tracks, setTracks, ttsModel, setTtsModel, chatModel, setChatModel 
}) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('users');
    const [showAddVoiceForm, setShowAddVoiceForm] = useState(false);
    const [newVoice, setNewVoice] = useState<Voice>(newVoiceInitialState);
    const [showAddTrackForm, setShowAddTrackForm] = useState(false);
    const [newTrack, setNewTrack] = useState({ name: '', url: ''});

    const handleAddVoice = (e: React.FormEvent) => {
        e.preventDefault();
        if (voices.some(v => v.id === newVoice.id)) {
            alert('Erro: Já existe uma voz com este ID.');
            return;
        }
        setVoices([...voices, newVoice]);
        setNewVoice(newVoiceInitialState);
        setShowAddVoiceForm(false);
    };

    const handleRemoveVoice = (voiceId: string) => {
        if (window.confirm('Tem certeza que deseja remover esta voz?')) {
            setVoices(voices.filter(v => v.id !== voiceId));
        }
    };
    
    const handleAddTrack = (e: React.FormEvent) => {
        e.preventDefault();
        setTracks([...tracks, newTrack]);
        setNewTrack({ name: '', url: '' });
        setShowAddTrackForm(false);
    };
    
    const handleRemoveTrack = (trackName: string) => {
        if (window.confirm('Tem certeza que deseja remover esta trilha?')) {
            setTracks(tracks.filter(t => t.name !== trackName));
        }
    };

    const renderTabContent = () => {
        switch(activeTab) {
            case 'users':
                return (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-mail</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.plan}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button className="text-indigo-600 hover:text-indigo-900">Editar</button>
                                            <button className="text-red-600 hover:text-red-900">Excluir</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'voices':
                return (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Vozes Disponíveis</h3>
                            <button onClick={() => setShowAddVoiceForm(!showAddVoiceForm)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700">
                                {showAddVoiceForm ? 'Cancelar' : 'Adicionar Nova Voz'}
                            </button>
                        </div>
                        {showAddVoiceForm && (
                            <form onSubmit={handleAddVoice} className="p-4 border rounded-lg bg-gray-50 mb-6 space-y-4 animate-fade-in">
                                <h4 className="font-semibold">Nova Voz</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input value={newVoice.id} onChange={(e) => setNewVoice({...newVoice, id: e.target.value, name: e.target.value})} placeholder="ID da Voz (ex: Kore)" required className="p-2 border rounded" />
                                    <input value={newVoice.displayName} onChange={(e) => setNewVoice({...newVoice, displayName: e.target.value})} placeholder="Nome de Exibição (ex: Ana Silva)" required className="p-2 border rounded" />
                                    <textarea value={newVoice.description} onChange={(e) => setNewVoice({...newVoice, description: e.target.value})} placeholder="Descrição" required className="p-2 border rounded md:col-span-2" />
                                    <input value={newVoice.imageUrl} onChange={(e) => setNewVoice({...newVoice, imageUrl: e.target.value})} placeholder="URL da Imagem" required className="p-2 border rounded" />
                                    <input value={newVoice.demoUrl} onChange={(e) => setNewVoice({...newVoice, demoUrl: e.target.value})} placeholder="URL do Áudio de Demonstração" required className="p-2 border rounded" />
                                </div>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar Voz</button>
                            </form>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {voices.map(voice => (
                                <div key={voice.id} className="border p-4 rounded-lg bg-white shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-lg">{voice.displayName}</p>
                                            <p className="text-sm text-gray-500">{voice.id}</p>
                                        </div>
                                        <button onClick={() => handleRemoveVoice(voice.id)} className="text-gray-400 hover:text-red-600">
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                    <p className="text-sm mt-2">{voice.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'tracks':
                return (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Trilhas Sonoras Pré-definidas</h3>
                            <button onClick={() => setShowAddTrackForm(!showAddTrackForm)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700">
                                {showAddTrackForm ? 'Cancelar' : 'Adicionar Nova Trilha'}
                            </button>
                        </div>
                        {showAddTrackForm && (
                             <form onSubmit={handleAddTrack} className="p-4 border rounded-lg bg-gray-50 mb-6 space-y-4 animate-fade-in">
                                <h4 className="font-semibold">Nova Trilha</h4>
                                <div className="grid grid-cols-1 gap-4">
                                     <input value={newTrack.name} onChange={(e) => setNewTrack({...newTrack, name: e.target.value})} placeholder="Nome da Trilha" required className="p-2 border rounded" />
                                     <input value={newTrack.url} onChange={(e) => setNewTrack({...newTrack, url: e.target.value})} placeholder="URL do Arquivo de Áudio" required className="p-2 border rounded" />
                                </div>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar Trilha</button>
                            </form>
                        )}
                         <div className="space-y-2">
                             {tracks.map(track => (
                                 <div key={track.name} className="border p-3 rounded-lg bg-white shadow-sm flex justify-between items-center">
                                     <p className="font-semibold">{track.name}</p>
                                     <button onClick={() => handleRemoveTrack(track.name)} className="text-gray-400 hover:text-red-600">
                                         <TrashIcon className="w-5 h-5"/>
                                     </button>
                                 </div>
                             ))}
                        </div>
                    </div>
                );
            case 'settings':
                 return (
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="tts-model-select" className="block text-sm font-medium text-gray-700 mb-2">Modelo de IA para Geração de Voz (TTS)</label>
                            <select id="tts-model-select" value={ttsModel} onChange={e => setTtsModel(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm">
                                <option value="gemini-2.5-flash-preview-tts">Gemini 2.5 Flash TTS</option>
                                {/* Add other compatible models here in the future */}
                            </select>
                             <p className="text-xs text-gray-500 mt-1">Este modelo converte o texto em áudio.</p>
                        </div>
                         <div>
                            <label htmlFor="chat-model-select" className="block text-sm font-medium text-gray-700 mb-2">Modelo de IA para Assistente de Roteiro (Chat)</label>
                            <select id="chat-model-select" value={chatModel} onChange={e => setChatModel(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm">
                                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            </select>
                             <p className="text-xs text-gray-500 mt-1">Este modelo ajuda a otimizar os roteiros na conversa.</p>
                        </div>
                    </div>
                );
        }
    };
    
    const TabButton: React.FC<{tab: AdminTab, label: string, icon: React.ReactNode}> = ({tab, label, icon}) => (
        <button onClick={() => setActiveTab(tab)} className={`flex items-center space-x-2 p-3 rounded-lg font-semibold transition-colors ${activeTab === tab ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            {icon}
            <span>{label}</span>
        </button>
    )

    return (
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex items-center mb-8">
                <ShieldIcon className="w-8 h-8 text-red-600 mr-3" />
                <h2 className="text-4xl font-extrabold text-gray-900">Painel Administrativo</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <aside className="md:col-span-1">
                    <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-200 space-y-2">
                        <TabButton tab="users" label="Usuários" icon={<UserIcon className="w-5 h-5"/>} />
                        <TabButton tab="voices" label="Vozes" icon={<MicIcon className="w-5 h-5"/>} />
                        <TabButton tab="tracks" label="Trilhas" icon={<MusicIcon className="w-5 h-5"/>} />
                        <TabButton tab="settings" label="Configurações IA" icon={<SettingsIcon className="w-5 h-5"/>} />
                    </div>
                </aside>
                <div className="md:col-span-3 bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200">
                    {renderTabContent()}
                </div>
            </div>
        </main>
    );
};