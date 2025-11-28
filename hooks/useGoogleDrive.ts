import { useState, useEffect, useCallback } from 'react';

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

export const useGoogleDrive = () => {
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const clientId = localStorage.getItem('googleClientId');
        if (!clientId) return;

        const loadScripts = async () => {
            try {
                // Load GIS client
                if (!window.google) {
                    await new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://accounts.google.com/gsi/client';
                        script.async = true;
                        script.defer = true;
                        script.onload = resolve;
                        document.body.appendChild(script);
                    });
                }

                // Load GAPI
                if (!window.gapi) {
                    await new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://apis.google.com/js/api.js';
                        script.async = true;
                        script.defer = true;
                        script.onload = resolve;
                        document.body.appendChild(script);
                    });
                }

                // Initialize GAPI
                await new Promise<void>((resolve) => {
                    window.gapi.load('client', async () => {
                        await window.gapi.client.init({
                            apiKey: localStorage.getItem('apiKey') || '', // Optional for some calls, but good to have
                            discoveryDocs: [DISCOVERY_DOC],
                        });
                        resolve();
                    });
                });

                // Initialize GIS Token Client
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: SCOPES,
                    callback: (tokenResponse: any) => {
                        if (tokenResponse && tokenResponse.access_token) {
                            setAccessToken(tokenResponse.access_token);
                            // Store expiration if needed, but for now just in-memory
                        }
                    },
                });

                setTokenClient(client);
                setIsInitialized(true);
            } catch (err) {
                console.error('Failed to initialize Google Drive:', err);
                setError('Falha ao inicializar Google Drive');
            }
        };

        loadScripts();
    }, []);

    const login = useCallback(() => {
        if (tokenClient) {
            tokenClient.requestAccessToken();
        } else {
            const clientId = localStorage.getItem('googleClientId');
            if (!clientId) {
                alert('Configure o Google Client ID no Painel Administrativo primeiro.');
            }
        }
    }, [tokenClient]);

    const uploadFile = useCallback(async (blob: Blob, filename: string) => {
        if (!accessToken) {
            throw new Error('Not authenticated');
        }

        try {
            const metadata = {
                name: filename,
                mimeType: 'audio/mpeg',
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: form,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Upload error:', err);
            throw err;
        }
    }, [accessToken]);

    return {
        login,
        uploadFile,
        isAuthenticated: !!accessToken,
        isInitialized,
        error
    };
};
