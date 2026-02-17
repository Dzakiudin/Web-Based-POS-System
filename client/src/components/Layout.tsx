import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import KineticMarquee from './KineticMarquee';

const Layout = () => {
    return (
        <div className="flex h-screen overflow-hidden text-slate-200">
            <Sidebar />
            <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
                <KineticMarquee />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;


