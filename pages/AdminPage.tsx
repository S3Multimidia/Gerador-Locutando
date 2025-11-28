import React from 'react';
import { AdminPanel } from '../components/AdminPanel';
import { Voice, TrackInfo, User } from '../types';

interface AdminPageProps {
    availableVoices: Voice[];
    setAvailableVoices: React.Dispatch<React.SetStateAction<Voice[]>>;
    backgroundTracks: TrackInfo[];
    setBackgroundTracks: React.Dispatch<React.SetStateAction<TrackInfo[]>>;
    ttsModel: string;
    setTtsModel: (model: string) => void;
    chatModel: string;
    setChatModel: (model: string) => void;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

export const AdminPage: React.FC<AdminPageProps> = (props) => {
    return (
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-white mb-8">Painel Administrativo</h1>
            <AdminPanel
                voices={props.availableVoices}
                setVoices={props.setAvailableVoices}
                tracks={props.backgroundTracks}
                setTracks={props.setBackgroundTracks}
                ttsModel={props.ttsModel}
                setTtsModel={props.setTtsModel}
                chatModel={props.chatModel}
                setChatModel={props.setChatModel}
                users={props.users}
                setUsers={props.setUsers}
            />
        </main>
    );
};
