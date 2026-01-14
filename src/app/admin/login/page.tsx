'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (response.ok) {
                router.push('/admin');
                router.refresh();
            } else {
                const data = await response.json();
                setError(data.error || 'Inloggning misslyckades');
            }
        } catch {
            setError('Ett fel uppstod. Försök igen.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-[#161b22] border border-white/10 rounded-2xl p-8">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                            <Lock className="w-8 h-8 text-emerald-400" />
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-white text-center mb-2">
                        Admin Dashboard
                    </h1>
                    <p className="text-white/50 text-center mb-8">
                        Logga in för att se registreringar
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-2">
                                Lösenord
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                placeholder="Ange lösenord"
                                required
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-semibold rounded-xl transition-all"
                        >
                            {isLoading ? 'Loggar in...' : 'Logga in'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-white/30 text-sm mt-6">
                    Konverteramera Admin
                </p>
            </div>
        </main>
    );
}
