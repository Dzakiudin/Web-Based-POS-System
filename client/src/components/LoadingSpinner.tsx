const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-screen bg-background-dark">
        <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_15px_rgba(19,236,91,0.2)]" />
            <span className="text-text-subtle text-xs font-bold uppercase tracking-widest animate-pulse">Memuat...</span>
        </div>
    </div>
);

export default LoadingSpinner;
