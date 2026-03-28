import { Link } from 'react-router-dom';

const Unauthorized = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
            <div className="size-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-5xl text-red-500">lock</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Akses Ditolak</h1>
            <p className="text-text-subtle max-w-md mb-8">
                Anda tidak memiliki izin (permission) yang cukup untuk mengakses halaman ini. Silakan hubungi Owner atau Administrator Anda.
            </p>
            <Link
                to="/"
                className="px-6 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 font-semibold transition-colors flex items-center gap-2"
            >
                <span className="material-symbols-outlined">arrow_back</span>
                Kembali ke Beranda
            </Link>
        </div>
    );
};

export default Unauthorized;
