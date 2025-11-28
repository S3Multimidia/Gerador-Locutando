import React from 'react';

interface ErrorBoundaryProps {
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
                    <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-xl border border-red-500/50">
                        <h2 className="text-2xl font-bold text-red-400 mb-4">Ops! Algo deu errado.</h2>
                        <p className="text-slate-300 mb-6">
                            Ocorreu um erro inesperado na aplicação.
                        </p>
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-700 mb-6 overflow-auto max-h-40">
                            <code className="text-xs text-red-300 font-mono">
                                {this.state.error?.message || 'Erro desconhecido'}
                            </code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
                        >
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
