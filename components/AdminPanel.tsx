import React, { useState } from 'react';
import type { Voice, User, TrackInfo } from '../types';
import { ShieldIcon, UserIcon, MicIcon, MusicIcon, SettingsIcon, TrashIcon, EditIcon, WandIcon, CreditCardIcon, LayoutIcon, SlidersIcon, EyeIcon, EyeOffIcon } from './IconComponents';
import { useSiteConfig } from '../contexts/SiteConfigContext';
import { SystemConfigTab } from './Admin/SystemConfigTab';
import { BackendService } from '../services/backend';

interface AdminPanelProps {
    voices: Voice[];
    setVoices: React.Dispatch<React.SetStateAction<Voice[]>>;
    tracks: TrackInfo[];
    setTracks: React.Dispatch<React.SetStateAction<TrackInfo[]>>;
    ttsModel: string;
    setTtsModel: (model: string) => void;
    chatModel: string;
    setChatModel: (model: string) => void;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

type AdminTab = 'users' | 'voices' | 'tracks' | 'settings' | 'site' | 'business' | 'system';

const userInitial: User = { id: 0, name: '', email: '', plan: 'Básico', status: 'Ativo', role: 'user', password: '' };

const newVoiceInitialState: Voice = {
    id: '',
    name: '',
    displayName: '',
    gender: 'Masculino',
    language: 'pt-BR',
    description: '',
    prompt: '',
    imageUrl: '',
    demoUrl: '',
    defaultTrackUrl: ''
};

const ALLOWED_VOICE_NAMES = [
    'achernar', 'achird', 'algenib', 'algieba', 'alnilam', 'aoede', 'autonoe', 'callirrhoe', 'charon', 'despina', 'enceladus', 'erinome', 'fenrir', 'gacrux', 'iapetus', 'kore', 'laomedeia', 'leda', 'orus', 'puck', 'pulcherrima', 'rasalgethi', 'sadachbia', 'sadaltager', 'schedar', 'sulafat', 'umbriel', 'vindemiatrix', 'zephyr', 'zubenelgenubi'
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
    voices, setVoices, tracks, setTracks, ttsModel, setTtsModel, chatModel, setChatModel, users, setUsers
}) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('users');
    const { config, updateConfig } = useSiteConfig();
    const [isBackendOnline, setIsBackendOnline] = useState(true);

    useEffect(() => {
        BackendService.checkHealth().then(online => setIsBackendOnline(online));
    }, []);

    // Voice State
    const [showAddVoiceForm, setShowAddVoiceForm] = useState(false);
    const [newVoice, setNewVoice] = useState<Voice>(newVoiceInitialState);
    const [editingVoiceId, setEditingVoiceId] = useState<string | null>(null);
    const [editingVoice, setEditingVoice] = useState<Voice>(newVoiceInitialState);

    // Track State
    const [showAddTrackForm, setShowAddTrackForm] = useState(false);
    const [newTrack, setNewTrack] = useState({ name: '', url: '' });

    // User State
    const [showAddUserForm, setShowAddUserForm] = useState(false);
    const [newUser, setNewUser] = useState<User>(userInitial);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);

    // Credit Modal State
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [creditAmount, setCreditAmount] = useState<number>(0);
    const [creditUserId, setCreditUserId] = useState<number | null>(null);

    const openCreditModal = (userId: number) => {
        setCreditUserId(userId);
        setCreditAmount(0);
        setShowCreditModal(true);
    };

    const handleAddCredits = async () => {
        if (creditUserId && creditAmount > 0) {
            try {
                // Assuming BackendService is imported (it might not be in this file, need to check imports)
                // If not, I'll add the import in the next tool call.
                // For now, let's use the window alert to confirm flow
                await BackendService.addCredits(creditUserId, creditAmount);
                alert(`Sucesso! Adicionado R$ ${creditAmount} ao usuário ${creditUserId}`);
                setShowCreditModal(false);
            } catch (error: any) {
                console.error(error);
                alert(`Erro ao adicionar créditos: ${error.message}`);
            }
        }
    };

    const [editingUser, setEditingUser] = useState<User>(userInitial);

    // Settings State
    const [apiKey, setApiKey] = useState<string>(localStorage.getItem('apiKey') || '');
    const [showApiKey, setShowApiKey] = useState(false);
    const [assistantApiKey, setAssistantApiKey] = useState<string>(localStorage.getItem('assistantApiKey') || '');
    const [showAssistantApiKey, setShowAssistantApiKey] = useState(false);
    const [googleClientId, setGoogleClientId] = useState<string>(localStorage.getItem('googleClientId') || '');
    const [showGoogleClientId, setShowGoogleClientId] = useState(false);
    const [assistantInstructions, setAssistantInstructions] = useState<string>(localStorage.getItem('assistantInstructions') || '');

    const handleSaveAssistantInstructions = () => {
        localStorage.setItem('assistantInstructions', assistantInstructions);
        alert('Instruções do assistente salvas com sucesso!');
    };

    const DEFAULT_SPECIALIST_PROMPT = `Você é um Especialista em Copywriting e Roteiros para Áudio (Rádio e Locução Digital). Sua tarefa é transformar o input do usuário em um texto otimizado para ser lido por uma Inteligência Artificial de voz (TTS).

Siga rigorosamente este fluxo de pensamento e execução:

1. ANÁLISE DE CONTEXTO
Primeiro, identifique o tipo de conteúdo:
- TIPO A: Varejo/Promocional (Se contiver lista de produtos, preços, "oferta", "promoção").
  -> Tom de voz: Alegre, energético, dinâmico e com senso de urgência.
- TIPO B: Institucional/Corporativo (Se contiver "missão", "história", comunicados internos, avisos).
  -> Tom de voz: Sóbrio, confiável, calmo e profissional.

2. ESTRUTURAÇÃO OBRIGATÓRIA
O seu output deve conter SEMPRE, independentemente do tamanho do texto original:
- Abertura (Hook): Uma frase curta e engajadora para prender a atenção (ex: "Atenção para as ofertas...", "Olá, equipe...").
- Corpo do Texto: O conteúdo principal reescrito para fluidez.
- Fechamento (CTA): Uma despedida ou chamada para ação (ex: "Venha conferir!", "Contamos com você.").

3. REGRAS DE REDAÇÃO PARA TTS (Text-to-Speech)
- Converta abreviações para extenso (ex: escreva "quilogramas" em vez de "kg", "reais" em vez de "R$").
- Use pontuação estratégica (vírgulas e pontos) para criar pausas de respiração naturais para o locutor.
- Evite frases excessivamente longas.

4. RESTRIÇÕES CRÍTICAS (DEATH RULES)
- PROIBIDO usar Emojis (🚫).
- PROIBIDO incluir instruções de palco ou efeitos sonoros entre parênteses ou colchetes (ex: NÃO escreva [música animada], [risos]).
- O output deve conter APENAS o texto falado. Nada mais.`;

    const [specialistPrompt, setSpecialistPrompt] = useState<string>(localStorage.getItem('specialistPrompt') || DEFAULT_SPECIALIST_PROMPT);

    // Handlers
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setNewVoice(prev => ({ ...prev, imageUrl: String(reader.result) }));
        reader.readAsDataURL(file);
    };

    const handleDemoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setNewVoice(prev => ({ ...prev, demoUrl: String(reader.result) }));
        reader.readAsDataURL(file);
    };

    const handleDefaultTrackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setNewVoice(prev => ({ ...prev, defaultTrackUrl: String(reader.result) }));
        reader.readAsDataURL(file);
    };

    const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setEditingVoice(prev => ({ ...prev, imageUrl: String(reader.result) }));
        reader.readAsDataURL(file);
    };

    const handleEditDemoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setEditingVoice(prev => ({ ...prev, demoUrl: String(reader.result) }));
        reader.readAsDataURL(file);
    };

    const handleEditDefaultTrackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setEditingVoice(prev => ({ ...prev, defaultTrackUrl: String(reader.result) }));
        reader.readAsDataURL(file);
    };

    const startEditVoice = (v: Voice) => {
        setEditingVoiceId(v.id);
        setEditingVoice(v);
    };

    const saveEditVoice = () => {
        if (!editingVoiceId) return;
        if (editingVoice.id !== editingVoiceId && voices.some(v => v.id === editingVoice.id)) {
            alert('Erro: Já existe uma voz com este ID. Escolha outro ou remova a voz existente.');
            return;
        }
        setVoices(voices.map(v => v.id === editingVoiceId ? editingVoice : v));
        setEditingVoiceId(null);
        setEditingVoice(newVoiceInitialState);
    };

    const cancelEditVoice = () => {
        setEditingVoiceId(null);
        setEditingVoice(newVoiceInitialState);
    };

    const handleTrackFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result);
            setNewTrack(prev => ({ ...prev, name: prev.name || file.name, url: dataUrl }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveApiKey = () => { localStorage.setItem('apiKey', apiKey); alert('Chave de API salva com sucesso!'); };
    const handleSaveAssistantApiKey = () => { localStorage.setItem('assistantApiKey', assistantApiKey); alert('Chave do Assistente salva com sucesso!'); };
    const handleSaveGoogleClientId = () => { localStorage.setItem('googleClientId', googleClientId); alert('Client ID salvo com sucesso!'); };
    const handleSaveSpecialistPrompt = () => { localStorage.setItem('specialistPrompt', specialistPrompt); alert('Prompt do Especialista salvo com sucesso!'); };

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

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.email || !newUser.password || !newUser.name) return;
        if (users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
            alert('Erro: Já existe um usuário com este e-mail.');
            return;
        }
        const nextId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
        const toAdd = { ...newUser, id: nextId };
        setUsers([...users, toAdd]);
        setNewUser(userInitial);
        setShowAddUserForm(false);
    };

    const handleDeleteUser = (id: number) => {
        if (window.confirm('Tem certeza que deseja remover este usuário?')) {
            setUsers(users.filter(u => u.id !== id));
        }
    };

    const handleToggleStatus = (id: number) => {
        setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'Ativo' ? 'Inativo' : 'Ativo' } : u));
    };

    const startEditUser = (u: User) => {
        setEditingUserId(u.id);
        setEditingUser(u);
    };

    const saveEditUser = () => {
        if (editingUserId === null) return;
        setUsers(users.map(u => u.id === editingUserId ? editingUser : u));
        setEditingUserId(null);
        setEditingUser(userInitial);
    };

    const cancelEditUser = () => {
        setEditingUserId(null);
        setEditingUser(userInitial);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'users':
                return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold">Usuários</h3>
                            <button onClick={() => setShowAddUserForm(!showAddUserForm)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700">
                                {showAddUserForm ? 'Cancelar' : 'Adicionar Usuário'}
                            </button>
                        </div>
                        {showAddUserForm && (
                            <form onSubmit={handleAddUser} className="p-4 border rounded-lg bg-gray-50 space-y-4 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="Nome" required className="p-2 border rounded" />
                                    <input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="E-mail" required className="p-2 border rounded" />
                                    <select value={newUser.plan} onChange={e => setNewUser({ ...newUser, plan: e.target.value as User['plan'] })} className="p-2 border rounded">
                                        <option value="Básico">Básico</option>
                                        <option value="Profissional">Profissional</option>
                                        <option value="Empresarial">Empresarial</option>
                                    </select>
                                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as User['role'] })} className="p-2 border rounded">
                                        <option value="user">Usuário</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Senha" required className="p-2 border rounded md:col-span-2" />
                                </div>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar Usuário</button>
                            </form>
                        )}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-mail</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Papel</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.plan}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.status}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.role === 'admin' ? 'Admin' : 'Usuário'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                <button onClick={() => handleToggleStatus(u.id)} className={`${u.status === 'Ativo' ? 'text-green-600 hover:text-green-900' : 'text-gray-400 hover:text-gray-600'}`}>
                                                    {u.status === 'Ativo' ? 'Desativar' : 'Ativar'}
                                                </button>
                                                <button onClick={() => startEditUser(u)} className="text-indigo-600 hover:text-indigo-900">Editar</button>
                                                <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-300 transition-colors" title="Excluir">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => openCreditModal(u.id)} className="text-green-500 hover:text-green-400 transition-colors" title="Adicionar Créditos">
                                                    <CreditCardIcon className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Credit Modal */}
                        {showCreditModal && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                <div className="bg-white p-6 rounded-lg w-96 text-gray-800 shadow-xl border border-gray-200">
                                    <h3 className="text-lg font-bold mb-4">Adicionar Créditos</h3>
                                    <p className="text-sm text-gray-600 mb-2">Usuário ID: {creditUserId}</p>
                                    <div className="relative mb-6">
                                        <span className="absolute left-3 top-2 text-gray-500 text-lg">R$</span>
                                        <input
                                            type="number"
                                            value={creditAmount}
                                            onChange={(e) => setCreditAmount(Number(e.target.value))}
                                            className="w-full pl-10 p-2 border rounded-lg text-lg"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setShowCreditModal(false)}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleAddCredits}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors shadow-sm"
                                        >
                                            Confirmar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {editingUserId !== null && (
                            <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                                <h4 className="font-semibold">Editar Usuário</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} placeholder="Nome" className="p-2 border rounded" />
                                    <input value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} placeholder="E-mail" className="p-2 border rounded" />
                                    <select value={editingUser.plan} onChange={e => setEditingUser({ ...editingUser, plan: e.target.value as User['plan'] })} className="p-2 border rounded">
                                        <option value="Básico">Básico</option>
                                        <option value="Profissional">Profissional</option>
                                        <option value="Empresarial">Empresarial</option>
                                    </select>
                                    <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value as User['role'] })} className="p-2 border rounded">
                                        <option value="user">Usuário</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <input type="password" value={editingUser.password} onChange={e => setEditingUser({ ...editingUser, password: e.target.value })} placeholder="Senha" className="p-2 border rounded md:col-span-2" />
                                </div>
                                <div className="space-x-2">
                                    <button onClick={saveEditUser} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar</button>
                                    <button onClick={cancelEditUser} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancelar</button>
                                </div>
                            </div>
                        )}
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
                                    <select value={newVoice.id} onChange={(e) => setNewVoice({ ...newVoice, id: e.target.value, name: e.target.value })} className="p-2 border rounded" required>
                                        {ALLOWED_VOICE_NAMES.map(v => (<option key={v} value={v}>{v}</option>))}
                                    </select>
                                    <input value={newVoice.displayName} onChange={(e) => setNewVoice({ ...newVoice, displayName: e.target.value })} placeholder="Nome de Exibição (ex: Ana Silva)" required className="p-2 border rounded" />
                                    <textarea value={newVoice.description} onChange={(e) => setNewVoice({ ...newVoice, description: e.target.value })} placeholder="Descrição" required className="p-2 border rounded md:col-span-2" />
                                    <textarea value={newVoice.prompt} onChange={(e) => setNewVoice({ ...newVoice, prompt: e.target.value })} placeholder="Prompt de Comportamento da Voz" className="p-2 border rounded md:col-span-2" />
                                    <div className="space-y-1">
                                        <label htmlFor="voice-image-upload" className="block text-sm font-medium text-gray-700">Foto do Locutor</label>
                                        <input id="voice-image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="p-2 border rounded w-full" required />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="voice-demo-upload" className="block text-sm font-medium text-gray-700">Demo de Voz (áudio)</label>
                                        <input id="voice-demo-upload" type="file" accept="audio/*" onChange={handleDemoUpload} className="p-2 border rounded w-full" required />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <label htmlFor="voice-default-track-upload" className="block text-sm font-medium text-gray-700">Trilha Padrão (Turbo)</label>
                                        <input id="voice-default-track-upload" type="file" accept="audio/*" onChange={handleDefaultTrackUpload} className="p-2 border rounded w-full" />
                                    </div>
                                </div>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar Voz</button>
                            </form>
                        )}
                        {editingVoiceId && (
                            <div className="p-4 border rounded-lg bg-gray-50 mb-6 space-y-4 animate-fade-in">
                                <h4 className="font-semibold">Editar Voz</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <select value={editingVoice.id} onChange={(e) => setEditingVoice({ ...editingVoice, id: e.target.value, name: e.target.value })} className="p-2 border rounded">
                                        {ALLOWED_VOICE_NAMES.map(v => (<option key={v} value={v}>{v}</option>))}
                                    </select>
                                    <input value={editingVoice.displayName} onChange={(e) => setEditingVoice({ ...editingVoice, displayName: e.target.value })} placeholder="Nome de Exibição" className="p-2 border rounded" />
                                    <textarea value={editingVoice.description} onChange={(e) => setEditingVoice({ ...editingVoice, description: e.target.value })} placeholder="Descrição" className="p-2 border rounded md:col-span-2" />
                                    <textarea value={editingVoice.prompt} onChange={(e) => setEditingVoice({ ...editingVoice, prompt: e.target.value })} placeholder="Prompt de Comportamento da Voz" className="p-2 border rounded md:col-span-2" />
                                    <div className="space-y-1">
                                        <label htmlFor="edit-voice-image-upload" className="block text-sm font-medium text-gray-700">Foto do Locutor</label>
                                        <input id="edit-voice-image-upload" type="file" accept="image/*" onChange={handleEditImageUpload} className="p-2 border rounded w-full" />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="edit-voice-demo-upload" className="block text-sm font-medium text-gray-700">Demo de Voz (áudio)</label>
                                        <input id="edit-voice-demo-upload" type="file" accept="audio/*" onChange={handleEditDemoUpload} className="p-2 border rounded w-full" />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <label htmlFor="edit-voice-default-track-upload" className="block text-sm font-medium text-gray-700">Trilha Padrão (Turbo)</label>
                                        <input id="edit-voice-default-track-upload" type="file" accept="audio/*" onChange={handleEditDefaultTrackUpload} className="p-2 border rounded w-full" />
                                    </div>
                                </div>
                                <div className="space-x-2">
                                    <button onClick={saveEditVoice} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar</button>
                                    <button onClick={cancelEditVoice} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancelar</button>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {voices.map(voice => (
                                <div key={voice.id} className="border p-4 rounded-lg bg-white shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-lg">{voice.displayName}</p>
                                            <p className="text-sm text-gray-500">{voice.id}</p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button onClick={() => startEditVoice(voice)} className="text-gray-400 hover:text-indigo-600">
                                                <EditIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleRemoveVoice(voice.id)} className="text-gray-400 hover:text-red-600">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
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
                                    <input value={newTrack.name} onChange={(e) => setNewTrack({ ...newTrack, name: e.target.value })} placeholder="Nome da Trilha" required className="p-2 border rounded" />
                                    <input type="file" accept="audio/mpeg,audio/mp3,audio/wav" onChange={handleTrackFileUpload} className="p-2 border rounded" />
                                </div>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar Trilha</button>
                            </form>
                        )}
                        <div className="space-y-2">
                            {tracks.map(track => (
                                <div key={track.name} className="border p-3 rounded-lg bg-white shadow-sm flex justify-between items-center">
                                    <p className="font-semibold">{track.name}</p>
                                    <button onClick={() => handleRemoveTrack(track.name)} className="text-gray-400 hover:text-red-600">
                                        <TrashIcon className="w-5 h-5" />
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
                        <div>
                            <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-700 mb-2">Chave de API do Google AI</label>
                            <div className="relative">
                                <input
                                    id="api-key-input"
                                    type={showApiKey ? "text" : "password"}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Insira sua chave de API aqui"
                                    className="w-full p-3 pr-10 bg-gray-50 border border-gray-300 rounded-lg shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showApiKey ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            <button onClick={handleSaveApiKey} className="mt-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar Chave</button>
                            <p className="text-xs text-gray-500 mt-1">Essa chave é necessária para o assistente de IA funcionar corretamente no dashboard do cliente.</p>
                        </div>
                        <div>
                            <label htmlFor="google-client-id-input" className="block text-sm font-medium text-gray-700 mb-2">Google Client ID (para Drive)</label>
                            <div className="relative">
                                <input
                                    id="google-client-id-input"
                                    type={showGoogleClientId ? "text" : "password"}
                                    value={googleClientId}
                                    onChange={(e) => setGoogleClientId(e.target.value)}
                                    placeholder="Insira seu Google Client ID"
                                    className="w-full p-3 pr-10 bg-gray-50 border border-gray-300 rounded-lg shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowGoogleClientId(!showGoogleClientId)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showGoogleClientId ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            <button onClick={handleSaveGoogleClientId} className="mt-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar Client ID</button>
                            <p className="text-xs text-gray-500 mt-1">Necessário para integração com Google Drive. <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Obter Client ID</a></p>
                        </div>
                        <div>
                            <label htmlFor="specialist-prompt-input" className="block text-sm font-medium text-gray-700 mb-2">Prompt do Especialista em Roteiros</label>
                            <textarea
                                id="specialist-prompt-input"
                                value={specialistPrompt}
                                onChange={(e) => setSpecialistPrompt(e.target.value)}
                                placeholder="Insira o prompt do especialista aqui..."
                                className="w-full h-64 p-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm font-mono text-sm"
                            />
                            <div className="flex space-x-2 mt-2">
                                <button onClick={handleSaveSpecialistPrompt} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar Prompt</button>
                                <button onClick={() => setSpecialistPrompt(DEFAULT_SPECIALIST_PROMPT)} className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300">Restaurar Padrão</button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Este prompt define como a IA deve reescrever os roteiros na opção "Especialista".</p>
                        </div>
                        <div>
                            <label htmlFor="assistant-api-key-input" className="block text-sm font-medium text-gray-700 mb-2">Chave de API do Assistente Virtual (Opcional)</label>
                            <div className="relative">
                                <input
                                    id="assistant-api-key-input"
                                    type={showAssistantApiKey ? "text" : "password"}
                                    value={assistantApiKey}
                                    onChange={(e) => setAssistantApiKey(e.target.value)}
                                    placeholder="Insira uma chave específica para o chat (ou deixe em branco para usar a geral)"
                                    className="w-full p-3 pr-10 bg-gray-50 border border-gray-300 rounded-lg shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowAssistantApiKey(!showAssistantApiKey)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showAssistantApiKey ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            <button onClick={handleSaveAssistantApiKey} className="mt-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Salvar Chave do Assistente</button>
                            <p className="text-xs text-gray-500 mt-1">Use esta chave se quiser separar o consumo do Assistente Virtual da chave principal.</p>
                        </div>

                        <div className="border-t border-gray-200 pt-6 mt-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Treinamento do Assistente</h4>
                            <label htmlFor="assistant-instructions-input" className="block text-sm font-medium text-gray-700 mb-2">Instruções do Sistema (Prompt)</label>
                            <textarea
                                id="assistant-instructions-input"
                                value={assistantInstructions}
                                onChange={(e) => setAssistantInstructions(e.target.value)}
                                placeholder="Ex: Você é um especialista em vendas agressivas. Sempre ofereça o plano Pro..."
                                className="w-full h-48 p-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm font-mono text-sm"
                            />
                            <button onClick={handleSaveAssistantInstructions} className="mt-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar Instruções</button>
                            <p className="text-xs text-gray-500 mt-1">Essas instruções serão adicionadas ao prompt do sistema do assistente virtual.</p>
                        </div>
                    </div>
                );
            case 'site':
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold mb-4">Site Builder (Página de Vendas)</h3>

                        <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
                            <h4 className="font-semibold text-lg">Hero Section</h4>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Título Principal</label>
                                <input
                                    value={config.hero.title}
                                    onChange={(e) => updateConfig({ hero: { ...config.hero, title: e.target.value } })}
                                    className="w-full p-2 border rounded mt-1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Subtítulo</label>
                                <textarea
                                    value={config.hero.subtitle}
                                    onChange={(e) => updateConfig({ hero: { ...config.hero, subtitle: e.target.value } })}
                                    className="w-full p-2 border rounded mt-1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Texto do Botão (CTA)</label>
                                    <input
                                        value={config.hero.ctaText}
                                        onChange={(e) => updateConfig({ hero: { ...config.hero, ctaText: e.target.value } })}
                                        className="w-full p-2 border rounded mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Link do Botão</label>
                                    <select
                                        value={config.hero.ctaLink}
                                        onChange={(e) => updateConfig({ hero: { ...config.hero, ctaLink: e.target.value as any } })}
                                        className="w-full p-2 border rounded mt-1"
                                    >
                                        <option value="login">Login / Cadastro</option>
                                        <option value="pricing">Preços</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
                            <h4 className="font-semibold text-lg">Funcionalidades (Features)</h4>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={config.features.showVoiceCloning}
                                        onChange={(e) => updateConfig({ features: { ...config.features, showVoiceCloning: e.target.checked } })}
                                        className="h-4 w-4 text-indigo-600"
                                    />
                                    <label>Mostrar Clonagem de Voz</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={config.features.showMultiLanguage}
                                        onChange={(e) => updateConfig({ features: { ...config.features, showMultiLanguage: e.target.checked } })}
                                        className="h-4 w-4 text-indigo-600"
                                    />
                                    <label>Mostrar Multi-idioma</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={config.features.showAPI}
                                        onChange={(e) => updateConfig({ features: { ...config.features, showAPI: e.target.checked } })}
                                        className="h-4 w-4 text-indigo-600"
                                    />
                                    <label>Mostrar API para Desenvolvedores</label>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'business':
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold mb-4">Configurações de Negócio</h3>

                        <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
                            <h4 className="font-semibold text-lg">Planos e Preços</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Preço Básico (R$)</label>
                                    <input
                                        type="number"
                                        value={config.pricing.basic}
                                        onChange={(e) => updateConfig({ pricing: { ...config.pricing, basic: Number(e.target.value) } })}
                                        className="w-full p-2 border rounded mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Preço Profissional (R$)</label>
                                    <input
                                        type="number"
                                        value={config.pricing.pro}
                                        onChange={(e) => updateConfig({ pricing: { ...config.pricing, pro: Number(e.target.value) } })}
                                        className="w-full p-2 border rounded mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Preço Empresarial (R$)</label>
                                    <input
                                        type="number"
                                        value={config.pricing.enterprise}
                                        onChange={(e) => updateConfig({ pricing: { ...config.pricing, enterprise: Number(e.target.value) } })}
                                        className="w-full p-2 border rounded mt-1"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
                            <h4 className="font-semibold text-lg">Contato e Suporte</h4>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">E-mail de Suporte</label>
                                <input
                                    value={config.contact.email}
                                    onChange={(e) => updateConfig({ contact: { ...config.contact, email: e.target.value } })}
                                    className="w-full p-2 border rounded mt-1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Telefone / WhatsApp</label>
                                <input
                                    value={config.contact.phone}
                                    onChange={(e) => updateConfig({ contact: { ...config.contact, phone: e.target.value } })}
                                    className="w-full p-2 border rounded mt-1"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 border p-4 rounded-lg bg-gray-50 opacity-50 pointer-events-none">
                            <h4 className="font-semibold text-lg flex items-center">
                                Gateway de Pagamento <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">Em Breve</span>
                            </h4>
                            <p className="text-sm text-gray-500">Integração com Stripe/MercadoPago para processamento automático de assinaturas.</p>
                        </div>
                    </div>
                );
        }
    };

    const TabButton: React.FC<{ tab: AdminTab, label: string, icon: React.ReactNode }> = ({ tab, label, icon }) => (
        <button onClick={() => setActiveTab(tab)} className={`flex items-center space-x-2 p-3 rounded-lg font-semibold transition-colors w-full text-left ${activeTab === tab ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}>
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
            {!isBackendOnline && (
                <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm">
                    <p className="font-bold">Backend Offline</p>
                    <p>O servidor não está respondendo na porta 8000. Certifique-se de iniciar o Django: <code>python manage.py runserver</code></p>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <aside className="md:col-span-1">
                    <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-200 space-y-2">
                        <TabButton tab="users" label="Usuários" icon={<UserIcon className="w-5 h-5" />} />
                        <TabButton tab="voices" label="Vozes" icon={<MicIcon className="w-5 h-5" />} />
                        <TabButton tab="tracks" label="Trilhas" icon={<MusicIcon className="w-5 h-5" />} />
                        <TabButton tab="site" label="Site Builder" icon={<WandIcon className="w-5 h-5" />} />
                        <TabButton tab="business" label="Negócios" icon={<CreditCardIcon className="w-5 h-5" />} />

                        <TabButton tab="settings" label="Configurações IA" icon={<SettingsIcon className="w-5 h-5" />} />
                        <TabButton tab="system" label="Sistema (Backend)" icon={<SlidersIcon className="w-5 h-5" />} />
                    </div>
                </aside>
                <div className="md:col-span-3 bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200">
                    {renderTabContent()}
                </div>
            </div>
        </main>
    );
};