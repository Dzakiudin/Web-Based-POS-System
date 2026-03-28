import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', { username, password });
            login(response.data.token, response.data.user);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-screen flex flex-row overflow-hidden bg-background-dark">
            {/* Left Side: Branding / Illustration */}
            <div className="hidden lg:flex w-1/2 relative bg-surface-dark items-center justify-center overflow-hidden">
                {/* Background with Overlay */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-background-dark/90 via-surface-dark/80 to-primary/20"></div>
                </div>
                {/* Content */}
                <div className="relative z-10 p-12 max-w-lg flex flex-col gap-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-background-dark">
                            <span className="material-symbols-outlined text-2xl">point_of_sale</span>
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-white">RetailOS</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-white">
                        Manage your store <br />
                        <span className="text-primary">smarter, not harder.</span>
                    </h1>
                    <p className="text-lg text-slate-300 font-medium leading-relaxed">
                        The all-in-one POS platform designed for modern retailers. Track inventory, manage staff, and grow customer loyalty in one place.
                    </p>
                    {/* Feature Cards */}
                    <div className="grid grid-cols-2 gap-4 mt-8 opacity-80">
                        <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                            <span className="material-symbols-outlined text-primary mb-2 text-3xl">analytics</span>
                            <p className="text-sm font-semibold text-white">Real-time Analytics</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                            <span className="material-symbols-outlined text-primary mb-2 text-3xl">inventory_2</span>
                            <p className="text-sm font-semibold text-white">Smart Inventory</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 bg-background-dark flex flex-col items-center justify-center p-6 sm:p-12 relative">
                {/* Mobile Logo */}
                <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-background-dark">
                        <span className="material-symbols-outlined text-xl">point_of_sale</span>
                    </div>
                    <span className="text-xl font-bold text-white">RetailOS</span>
                </div>

                <div className="w-full max-w-[420px] flex flex-col gap-8">
                    {/* Header */}
                    <div className="flex flex-col gap-2">
                        <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
                        <p className="text-slate-400">Please enter your credentials to access your dashboard.</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {/* Username */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-300" htmlFor="username">
                                Email or Username
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                    <span className="material-symbols-outlined text-[20px]">person</span>
                                </div>
                                <input
                                    className="w-full h-12 pl-11 pr-4 bg-input-dark border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                                    id="username"
                                    placeholder="Enter your email or username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-300" htmlFor="password">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                    <span className="material-symbols-outlined text-[20px]">lock</span>
                                </div>
                                <input
                                    className="w-full h-12 pl-11 pr-12 bg-input-dark border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                                    id="password"
                                    placeholder="Enter your password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Login Button */}
                        <button
                            className="mt-4 w-full h-12 bg-primary hover:bg-[#0fd650] text-background-dark font-bold text-base rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Log In</span>
                                    <span className="material-symbols-outlined text-[20px]">login</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="text-center mt-4">
                        <p className="text-sm text-slate-400">
                            Don't have an account?{' '}
                            <span className="font-bold text-white hover:text-primary transition-colors cursor-pointer">Contact Support</span>
                        </p>
                    </div>
                </div>

                {/* Bottom Links */}
                <div className="absolute bottom-6 w-full flex justify-center gap-6 text-xs text-slate-600">
                    <span>Privacy Policy</span>
                    <span>Terms of Service</span>
                    <span>© 2024 RetailOS Inc.</span>
                </div>
            </div>
        </div>
    );
};

export default Login;
