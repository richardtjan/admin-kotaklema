import React, { useState, useEffect, useCallback } from 'react';
// MODIFIKASI: Menambahkan ikon Instagram
import { User, Clock, Users, Send, Loader2, AlertCircle, ChevronsRight, Phone, X, Play, Pause, CheckCircle, Copy, GripVertical, Trash2, MessageSquarePlus, Tv, Instagram } from 'lucide-react';

// --- Constants ---
const TURN_DURATION_MINUTES = 7;
const TURN_DURATION_MS = TURN_DURATION_MINUTES * 60 * 1000;
const RESPONSE_WAIT_MS = 2 * 60 * 1000;

const SCRIPT_URL = process.env.REACT_APP_APPS_SCRIPT_URL;

// --- Custom SVG Logo (Comic Style) ---
const KotaklemaLogo = ({ size = 'normal' }) => {
    const isLarge = size === 'large';
    const svgWidth = isLarge ? 600 : 450;
    const svgHeight = isLarge ? 160 : 120;
    const textFontSize = isLarge ? 100 : 75;
    const rectHeight = isLarge ? 120 : 90;
    const textY = isLarge ? 105 : 78;

    return (
        <div className="flex flex-col items-center">
            {/* FIX: Memperluas viewBox untuk memberi ruang pada shadow agar tidak terpotong */}
            <svg width={svgWidth} height={svgHeight} viewBox={`-10 -10 ${svgWidth + 20} ${svgHeight + 20}`}>
                <defs>
                    <style>
                        {`
                            @import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');
                        `}
                    </style>
                    <filter id="comic-shadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feDropShadow dx="6" dy="6" stdDeviation="0" floodColor="#000" />
                    </filter>
                </defs>
                <g transform="skewX(-10)">
                    <rect x="10" y="10" width={svgWidth - 20} height={rectHeight} rx="20" ry="20" fill="#F3F4F6" stroke="#000000" strokeWidth="4" filter="url(#comic-shadow)" />
                    <text x={svgWidth / 2} y={textY} fontFamily="Bangers, cursive" fontSize={textFontSize} fill="#F97316" textAnchor="middle" stroke="#000000" strokeWidth="3" letterSpacing="2">
                        KOTAKLEMA
                    </text>
                </g>
            </svg>
        </div>
    );
};


const messageTemplates = {
    initial: { id: 'cf1', title: 'Notifikasi Panggilan (Minta Konfirmasi)', text: `Hai Kak [NAME],\n\nGiliran Kakak sudah dekat! Mohon balas "YA" jika sudah siap menuju lokasi, atau "TIDAK" jika belum bisa.\n\nDitunggu konfirmasinya dalam 2 menit ke depan ya. :)\n\nMakasih banyak atas pengertiannya, Kak!`, updatesStatusTo: 'notified' },
    reply_yes: { id: 'resp_yes', title: 'Balasan untuk "YA"', text: `Terima kasih atas konfirmasinya, Kak [NAME]! Mohon segera standby di Kotaklema yaa, agar giliran Kakak tidak terlewat. Kami tunggu kedatangannya di Kotaklema.`, updatesStatusTo: 'confirmed' },
    reply_no: { id: 'resp_no', title: 'Balasan untuk "TIDAK"', text: `Baik, Kak [NAME], terima kasih informasinya. Kami akan memberitahu Kakak kembali jika sudah ada giliran yang tersedia.`, updatesStatusTo: 'waiting' }
};

// --- Main App Component (Router) ---
export default function App() {
    const [page, setPage] = useState('');

    useEffect(() => {
        const path = window.location.pathname;
        if (path.startsWith('/display')) {
            setPage('display');
        } else if (path.startsWith('/join')) {
            setPage('join');
        } else {
            setPage('admin');
        }
    }, []);

    switch (page) {
        case 'display':
            return <CustomerDisplayView />;
        case 'join':
            return <CustomerJoinView />;
        case 'admin':
            return <AdminView />;
        default:
            return null;
    }
}

// --- Customer Join View Component (NEW) ---
function CustomerJoinView() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
    const [error, setError] = useState(null);

    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Hanya angka

        // Jika user menghapus semuanya, kosongkan state
        if (value === '') {
            setPhone('');
            return;
        }

        // Jika dimulai dengan 0, ganti dengan 62
        if (value.startsWith('0')) {
            value = '62' + value.substring(1);
        } 
        // Jika tidak dimulai dengan 62, tambahkan 62 di depan
        else if (!value.startsWith('62')) {
            value = '62' + value;
        }
        
        setPhone(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) {
            setSubmitStatus({ type: 'error', message: 'Harap isi nama dan nomor WhatsApp.' });
            return;
        }
        setIsSubmitting(true);
        setError(null);

        try {
            const queueResponse = await fetch(SCRIPT_URL);
            if (!queueResponse.ok) throw new Error("Gagal mendapatkan data antrian.");
            const currentQueue = await queueResponse.json();
            const highestOrder = currentQueue.reduce((max, p) => p.order > max ? p.order : max, 0);

            const payload = {
                action: 'add',
                payload: {
                    name: name.trim(),
                    phone: phone.trim(),
                    order: highestOrder + 1000,
                }
            };

            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });

            setSubmitStatus({ type: 'success', message: `Terima kasih, ${name.trim()}! Kamu berhasil masuk antrian.` });
            setName('');
            setPhone('');

        } catch (err) {
            console.error("Error joining queue:", err);
            setError("Terjadi kesalahan. Coba lagi nanti.");
            setSubmitStatus({ type: 'error', message: 'Gagal bergabung dengan antrian.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-orange-500 text-black min-h-screen font-['Bangers'] flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-md mx-auto bg-yellow-400 rounded-2xl shadow-lg p-8 border-4 border-black">
                <header className="text-center mb-6">
                    <KotaklemaLogo />
                </header>
                {error && <ErrorDisplay message={error} />}
                
                {submitStatus.type === 'success' ? (
                    <div className="text-center p-4">
                        <CheckCircle className="w-16 h-16 mx-auto text-green-600" />
                        <h2 className="text-3xl mt-4">BERHASIL!</h2>
                        <p className="font-sans mt-2">{submitStatus.message}</p>
                        <p className="font-sans mt-2 text-sm">Nanti kami akan menghubungi kembali via WhatsApp.</p>
                        <a href="/display" className="mt-6 w-full flex items-center justify-center px-6 py-4 border-2 border-black rounded-lg font-bold text-2xl bg-orange-500 hover:bg-orange-600 shadow-[8px_8px_0_0_#000] hover:shadow-[4px_4px_0_0_#000] transform hover:translate-x-1 hover:translate-y-1 transition-all">
                           <Tv className="h-6 w-6 mr-3" /> LIHAT LAYAR ANTRIAN
                        </a>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <h2 className="text-4xl text-center tracking-wider">GABUNG ANTRIAN</h2>
                        <div>
                            <label htmlFor="name" className="block text-lg mb-2 tracking-wide">NAMA KAMU</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="TULIS DI SINI..." className="block w-full bg-white border-2 border-black rounded-lg py-3 px-6 text-zinc-900 focus:outline-none focus:ring-4 focus:ring-orange-500/50 transition-all font-sans"/>
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-lg mb-2 tracking-wide">NOMOR WHATSAPP</label>
                            <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="62812..." className="block w-full bg-white border-2 border-black rounded-lg py-3 px-6 text-zinc-900 focus:outline-none focus:ring-4 focus:ring-orange-500/50 transition-all font-sans"/>
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center px-6 py-4 border-2 border-black rounded-lg font-bold text-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 shadow-[8px_8px_0_0_#000] hover:shadow-[4px_4px_0_0_#000] transform hover:translate-x-1 hover:translate-y-1 transition-all">
                            {isSubmitting ? <Loader2 className="animate-spin h-6 w-6 mr-3" /> : <Send className="h-6 w-6 mr-3" />}DAFTAR!
                        </button>
                        {submitStatus.message && submitStatus.type === 'error' && (
                            <div className="mt-4 p-3 rounded-lg text-sm text-center font-sans flex items-center justify-center bg-red-100 text-red-800">
                                <AlertCircle className="mr-2" /> {submitStatus.message}
                            </div>
                        )}
                    </form>
                )}
                <a href="https://www.instagram.com/kotaklemaphoto?igsh=cWJrajFwdTNubm1l" target="_blank" rel="noopener noreferrer" className="mt-8 flex items-center justify-center gap-2 text-black hover:text-orange-600 transition-colors font-sans" title="Follow us on Instagram">
                    <Instagram size={20} />
                    <span className="font-bold">@kotaklemaphoto</span>
                </a>
             </div>
        </div>
    );
}


// --- Customer Display View Component ---
function CustomerDisplayView() {
    const [queue, setQueue] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchQueue = useCallback(async () => {
        if (!SCRIPT_URL) {
            setError("URL Aplikasi tidak diatur.");
            setIsLoading(false);
            return;
        }
        try {
            const response = await fetch(SCRIPT_URL);
            if (!response.ok) throw new Error("Gagal mengambil data antrian.");
            const data = await response.json();
            setQueue(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQueue();
        const intervalId = setInterval(fetchQueue, 5000);
        return () => clearInterval(intervalId);
    }, [fetchQueue]);

    const nowServing = queue.length > 0 ? queue[0] : null;
    const upNext = queue.length > 1 ? queue.slice(1, 14) : []; 
    
    const upNextCol1 = upNext.slice(0, 7);
    const upNextCol2 = upNext.slice(7, 13);


    return (
        <div className="bg-gray-900 text-white min-h-screen w-full flex flex-col items-center p-4 md:p-6 font-['Bangers']">
            <header className="w-full max-w-7xl text-center pt-4">
                <KotaklemaLogo size="large" />
                <a href="https://www.instagram.com/kotaklemaphoto?igsh=cWJrajFwdTNubm1l" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-3 text-white hover:text-orange-500 transition-colors text-3xl tracking-wider" title="Follow us on Instagram">
                    <Instagram size={32} />
                    <span>@kotaklemaphoto</span>
                </a>
            </header>
            
            <main className="w-full max-w-7xl flex-grow flex flex-col lg:flex-row gap-6 mt-6">
                <div className="lg:w-2/5 bg-orange-500 text-black p-6 rounded-3xl border-8 border-black shadow-2xl flex flex-col justify-center items-center">
                    <h2 className="text-5xl md:text-6xl tracking-widest">SEKARANG GILIRAN</h2>
                    <div className="text-8xl md:text-9xl font-bold my-4 text-white flex-grow flex items-center justify-center text-center" style={{ WebkitTextStroke: '4px black' }}>
                        {nowServing ? nowServing.name.toUpperCase() : '---'}
                    </div>
                    {nowServing && <TimerDisplay person={nowServing} />}
                </div>

                <div className="lg:w-3/5 bg-gray-800 p-6 rounded-3xl border-8 border-black shadow-2xl flex flex-col">
                    <h2 className="text-5xl md:text-6xl tracking-widest text-yellow-400 mb-4 text-center">ANTRIAN BERIKUTNYA</h2>
                    {isLoading ? (
                         <div className="flex-grow flex justify-center items-center">
                            <Loader2 className="animate-spin h-12 w-12 text-yellow-400" />
                         </div>
                    ) : (
                        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                            <ul className="space-y-2">
                                {upNextCol1.map((person, index) => (
                                    <li key={person.id} className="text-3xl lg:text-4xl bg-gray-700 p-3 rounded-xl flex items-center">
                                        <span className="text-yellow-400 mr-4 w-10 text-right">{index + 2}.</span>
                                        <span>{person.name.toUpperCase()}</span>
                                    </li>
                                ))}
                            </ul>
                            <ul className="space-y-2">
                                {upNextCol2.map((person, index) => (
                                    <li key={person.id} className="text-3xl lg:text-4xl bg-gray-700 p-3 rounded-xl flex items-center">
                                        <span className="text-yellow-400 mr-4 w-10 text-right">{index + 9}.</span>
                                        <span>{person.name.toUpperCase()}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                     {upNext.length === 0 && !nowServing && !isLoading && (
                        <p className="text-4xl text-gray-400 text-center mt-12 flex-grow flex items-center justify-center">Antrian Masih Kosong</p>
                    )}
                </div>
            </main>
            {error && <div className="absolute bottom-4 left-4 bg-red-500 text-white p-4 rounded-xl">{error}</div>}
        </div>
    );
}

// --- Admin View Component ---
function AdminView() {
    const [queue, setQueue] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState({ person: null, updateQueue: null });

    const fetchQueue = useCallback(async () => {
        setError(null);
        try {
            const response = await fetch(SCRIPT_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setQueue(data);
        } catch (e) {
            console.error("Fetch Queue Error:", e);
            setError("Gagal memuat antrian dari Google Sheets.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!SCRIPT_URL) {
            setError("URL Apps Script belum diatur. (REACT_APP_APPS_SCRIPT_URL)");
            setIsLoading(false);
            return;
        }
        fetchQueue();
        const intervalId = setInterval(fetchQueue, 15000);
        return () => clearInterval(intervalId);
    }, [fetchQueue]);
    
    const handleUpdateQueue = useCallback(async (action, payload) => {
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action, payload }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            await fetchQueue();
        } catch (error) {
            console.error(`Error performing action ${action}:`, error);
            setError(`Gagal melakukan aksi: ${action}.`);
        }
    }, [fetchQueue]);

    const handleOpenModal = useCallback((person) => {
        setModalData({ person, updateQueue: handleUpdateQueue });
        setIsModalOpen(true);
    }, [handleUpdateQueue]);

    const nowServing = queue.length > 0 ? queue[0] : null;
    const upNext = queue.length > 1 ? queue.slice(1) : [];

    return (
        <div className="bg-white text-zinc-800 min-h-screen font-['Bangers'] flex flex-col items-center p-4 sm:p-6 lg:p-8"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
            <div className="w-full max-w-6xl mx-auto">
                <header className="text-center mb-10">
                    <KotaklemaLogo />
                     <p className="font-['Bangers'] text-2xl text-zinc-800 tracking-wider mt-2">Admin KOTAKLEMA PhotoBox</p>
                     <div className="flex justify-center gap-4 mt-4 font-['Bangers'] tracking-wider">
                        <a href="/display" target="_blank" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-black rounded-lg text-lg bg-gray-800 text-white shadow-[4px_4px_0_0_#000] hover:shadow-none transform hover:translate-x-1 hover:translate-y-1 transition-all">
                            <Tv size={20} /> Buka Layar Antrian
                        </a>
                         <a href="/join" target="_blank" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-black rounded-lg text-lg bg-blue-600 text-white shadow-[4px_4px_0_0_#000] hover:shadow-none transform hover:translate-x-1 hover:translate-y-1 transition-all">
                            <User size={20} /> Buka Form Pelanggan
                        </a>
                     </div>
                </header>
                {error && <ErrorDisplay message={error} />}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-10 text-gray-500">
                        <Loader2 className="animate-spin h-12 w-12 mb-4 text-orange-500" />
                        <p className="text-2xl tracking-wider">LOADING...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        <div className="lg:col-span-2"><JoinQueueForm queue={queue} onUpdateQueue={handleUpdateQueue} /></div>
                        <div className="lg:col-span-3"><QueueDisplay nowServing={nowServing} upNext={upNext} onUpdateQueue={handleUpdateQueue} onOpenModal={handleOpenModal} /></div>
                    </div>
                )}
            </div>
            <NotificationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={modalData} />
        </div>
    );
}

// --- Sisa komponen ---

function JoinQueueForm({ queue, onUpdateQueue }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });

    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');

        if (value === '') {
            setPhone('');
            return;
        }

        if (value.startsWith('0')) {
            value = '62' + value.substring(1);
        } 
        else if (!value.startsWith('62')) {
            value = '62' + value;
        }
        
        setPhone(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) {
            setSubmitStatus({ type: 'error', message: 'Harap isi semua kolom.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const highestOrder = queue.reduce((max, p) => p.order > max ? p.order : max, 0);
            await onUpdateQueue('add', {
                name: name.trim(),
                phone: phone.trim(),
                order: highestOrder + 1000,
            });
            setSubmitStatus({ type: 'success', message: `${name.trim()} berhasil ditambahkan.` });
            setName(''); setPhone('');
        } catch (error) {
            console.error("Error adding to queue: ", error);
            setSubmitStatus({ type: 'error', message: error.message });
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setSubmitStatus({ type: '', message: '' }), 4000);
        }
    };
    
    return (
        <div className="bg-yellow-400 rounded-2xl shadow-lg p-8 h-full border-4 border-black transform -rotate-1">
            <h2 className="text-4xl text-black mb-6 flex items-center tracking-wider"><User className="mr-3" />DAFTAR ANTRIAN</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="name" className="block text-lg text-black mb-2 tracking-wide">NAMA PELANGGAN</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="TULIS DI SINI..." className="block w-full bg-white border-2 border-black rounded-lg py-3 px-6 text-zinc-900 focus:outline-none focus:ring-4 focus:ring-orange-500/50 transition-all font-sans"/>
                </div>
                <div>
                    <label htmlFor="phone" className="block text-lg text-black mb-2 tracking-wide">NOMOR WHATSAPP</label>
                    <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="62812..." className="block w-full bg-white border-2 border-black rounded-lg py-3 px-6 text-zinc-900 focus:outline-none focus:ring-4 focus:ring-orange-500/50 transition-all font-sans"/>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center px-6 py-4 border-2 border-black rounded-lg text-black font-bold text-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 shadow-[8px_8px_0_0_#000] hover:shadow-[4px_4px_0_0_#000] transform hover:translate-x-1 hover:translate-y-1 transition-all">
                    {isSubmitting ? <Loader2 className="animate-spin h-6 w-6 mr-3" /> : <Send className="h-6 w-6 mr-3" />}GAS!
                </button>
            </form>
            {submitStatus.message && <div className={`mt-4 p-3 rounded-lg text-sm text-center font-sans flex items-center justify-center ${submitStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}><AlertCircle className="mr-2" /> {submitStatus.message}</div>}
        </div>
    );
}

function QueueDisplay({ nowServing, upNext, onUpdateQueue, onOpenModal }) {
    const [draggedItem, setDraggedItem] = useState(null);
    const [localTimeLeft, setLocalTimeLeft] = useState(TURN_DURATION_MS);

    const handleStart = () => {
        if (!nowServing) return;
        onUpdateQueue('updateTimer', {
            id: nowServing.id,
            timerState: 'running',
            timerStartTime: Date.now(),
            timePaused: localTimeLeft,
        });
    };

    const handlePause = () => {
        if (!nowServing) return;
        onUpdateQueue('updateTimer', {
            id: nowServing.id,
            timerState: 'paused',
            timerStartTime: nowServing.timerStartTime,
            timePaused: localTimeLeft,
        });
    };
    
    const handleFinish = () => {
        if (!nowServing) return;
        onUpdateQueue('delete', { id: nowServing.id });
    };

    const handleFinishAndServe = (personToServe) => {
        if (!personToServe) return;
        if (nowServing) {
            onUpdateQueue('delete', { id: nowServing.id });
        }
        onUpdateQueue('update', { id: personToServe.id, newOrder: nowServing ? nowServing.order - 1 : Date.now() - 1000 });
    };

    const handleDelete = (personId) => {
        if (!personId) return;
        onUpdateQueue('delete', { id: personId });
    };

    const handleDragStart = (e, person) => {
        setDraggedItem(person);
        e.currentTarget.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
        setDraggedItem(null);
    };

    const handleDrop = async (targetPerson) => {
        if (!draggedItem || draggedItem.id === targetPerson.id) return;
        
        const allItems = [nowServing, ...upNext].filter(Boolean);
        const draggedIndex = allItems.findIndex(p => p.id === draggedItem.id);
        const targetIndex = allItems.findIndex(p => p.id === targetPerson.id);

        let newOrder;
        if (draggedIndex < targetIndex) {
            const afterTarget = allItems[targetIndex + 1];
            newOrder = afterTarget ? (targetPerson.order + afterTarget.order) / 2 : targetPerson.order + 1000;
        } else {
            const beforeTarget = allItems[targetIndex - 1];
            newOrder = beforeTarget ? (targetPerson.order + beforeTarget.order) / 2 : targetPerson.order / 2;
        }

        await onUpdateQueue('update', { id: draggedItem.id, newOrder });
        setDraggedItem(null);
    };

    const handleNotify = (person) => {
        const template = messageTemplates.initial;
        const message = template.text.replace(/\[NAME\]/g, person.name);
        window.open(`https://wa.me/${person.phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
        
        onUpdateQueue('update', { 
            id: person.id, 
            newStatus: template.updatesStatusTo, 
            notifiedTimestamp: Date.now() 
        });
    };

    const getStatusIndicator = (status, notifiedTimestamp) => {
        switch (status) {
            case 'confirmed':
                return <span className="flex items-center gap-1 text-xs text-green-600 font-sans"><CheckCircle size={14}/> DIKONFIRMASI</span>;
            case 'notified':
                return <ResponseTimer notifiedTimestamp={notifiedTimestamp} />;
            default:
                return null;
        }
    };
    
    return (
        <div className="bg-orange-500 rounded-2xl shadow-lg p-8 flex flex-col h-full border-4 border-black transform rotate-1">
            <div className="text-center border-b-4 border-black pb-6 mb-6">
                <h3 className="text-2xl text-black uppercase tracking-widest">SEKARANG GILIRAN</h3>
                {nowServing ? (
                    <>
                        <p className="text-7xl font-bold text-white my-3 truncate" style={{ WebkitTextStroke: '2px black' }}>{nowServing.name}</p>
                        <TimerDisplay person={nowServing} onTimeUpdate={setLocalTimeLeft} />
                        <div className="mt-6 grid grid-cols-3 gap-3">
                            <button onClick={handleStart} className="flex items-center justify-center gap-2 px-4 py-3 text-xl text-white bg-green-600 rounded-lg shadow-[4px_4px_0_0_#000] hover:shadow-none transform hover:translate-x-1 hover:translate-y-1 transition-all" disabled={nowServing.timerState === 'running'}>
                                <Play size={16}/>MULAI
                            </button>
                            <button onClick={handlePause} className="flex items-center justify-center gap-2 px-4 py-3 text-xl text-white bg-yellow-500 rounded-lg shadow-[4px_4px_0_0_#000] hover:shadow-none transform hover:translate-x-1 hover:translate-y-1 transition-all" disabled={nowServing.timerState !== 'running'}>
                                <Pause size={16}/>JEDA
                            </button>
                            <button onClick={handleFinish} className="flex items-center justify-center gap-2 px-4 py-3 text-xl text-white bg-red-600 rounded-lg shadow-[4px_4px_0_0_#000] hover:shadow-none transform hover:translate-x-1 hover:translate-y-1 transition-all">
                                <CheckCircle size={16} />SELESAI
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="my-4 py-12"><p className="text-3xl text-black">ANTRIAN KOSONG!</p></div>
                )}
            </div>
            
            <div className="flex-grow flex flex-col min-h-0">
                <h3 className="text-3xl font-bold text-black mb-4 flex items-center tracking-wider"><Users className="mr-3"/>ANTRIAN BERIKUTNYA</h3>
                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    {upNext.length > 0 ? (
                        <ul className="space-y-2">
                            {upNext.map((person) => (
                                <li 
                                    key={person.id}
                                    className="bg-white p-4 rounded-lg border-2 border-black transition-all"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => handleDrop(person)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div 
                                                draggable 
                                                onDragStart={(e) => handleDragStart(e, person)}
                                                onDragEnd={handleDragEnd}
                                                className="cursor-grab p-2 -ml-2"
                                            >
                                                <GripVertical className="text-gray-400" />
                                            </div>
                                            <span className="text-2xl font-bold text-zinc-800 ml-1">{person.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleDelete(person.id)} className="p-2 text-white bg-red-600 rounded-full border-2 border-black shadow-[2px_2px_0_0_#000] hover:shadow-none transform hover:translate-x-0.5 hover:translate-y-0.5 transition-all"><Trash2 size={14} /></button>
                                            
                                            {person.status === 'waiting' && (
                                                <button onClick={() => handleNotify(person)} className="p-2 text-white bg-blue-500 rounded-full border-2 border-black shadow-[2px_2px_0_0_#000] hover:shadow-none transform hover:translate-x-0.5 hover:translate-y-0.5 transition-all" title="Kirim Notifikasi Panggilan">
                                                    <Phone size={14} />
                                                </button>
                                            )}
                                            {person.status === 'notified' && (
                                                <button onClick={() => onOpenModal(person)} className="p-2 text-white bg-purple-500 rounded-full border-2 border-black shadow-[2px_2px_0_0_#000] hover:shadow-none transform hover:translate-x-0.5 hover:translate-y-0.5 transition-all" title="Tandai Balasan Pelanggan">
                                                    <MessageSquarePlus size={14} />
                                                </button>
                                            )}

                                            <button onClick={() => handleFinishAndServe(person)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-white bg-green-500 rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000] hover:shadow-none transform hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                                                <ChevronsRight size={14} /> LANJUT
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-300 flex items-center justify-between min-h-[34px]">
                                        {getStatusIndicator(person.status, person.notifiedTimestamp)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-400 text-center py-4 font-sans">DAFTAR TUNGGU KOSONG</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function TimerDisplay({ person, onTimeUpdate }) {
    const { timerState, timerStartTime, timePaused } = person;
    const [timeLeft, setTimeLeft] = useState(TURN_DURATION_MS);

    useEffect(() => {
        let interval;

        const tick = () => {
            const startTime = Number(timerStartTime);
            const elapsed = Date.now() - startTime;
            const newTimeLeft = TURN_DURATION_MS - elapsed;
            setTimeLeft(Math.max(0, newTimeLeft));
            if (onTimeUpdate) {
                onTimeUpdate(Math.max(0, newTimeLeft));
            }
        };

        if (timerState === 'running') {
            tick();
            interval = setInterval(tick, 1000);
        } else if (timerState === 'paused') {
            setTimeLeft(Number(timePaused));
            if (onTimeUpdate) {
                onTimeUpdate(Number(timePaused));
            }
        } else { // idle
            setTimeLeft(TURN_DURATION_MS);
             if (onTimeUpdate) {
                onTimeUpdate(TURN_DURATION_MS);
            }
        }

        return () => clearInterval(interval);
    }, [timerState, timerStartTime, timePaused, onTimeUpdate]);

    const minutes = Math.floor((timeLeft / 1000) / 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);
    
    return (
        <div className="flex items-center justify-center gap-2 text-5xl bg-white p-3 rounded-lg border-4 border-black shadow-inner">
            <Clock className="h-10 w-10 text-yellow-500" />
            <span className={timeLeft <= 60000 ? 'text-red-500' : 'text-zinc-800'}>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
        </div>
    );
}

function ResponseTimer({ notifiedTimestamp }) {
    const [timeLeft, setTimeLeft] = useState(RESPONSE_WAIT_MS);

    useEffect(() => {
        const startTime = Number(notifiedTimestamp);
        if (isNaN(startTime)) return; 

        const calculateTimeLeft = () => {
            const elapsed = Date.now() - startTime;
            return Math.max(0, RESPONSE_WAIT_MS - elapsed);
        };
        
        setTimeLeft(calculateTimeLeft());

        const interval = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(interval);
    }, [notifiedTimestamp]);

    const minutes = Math.floor((timeLeft / 1000) / 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);

    if (timeLeft <= 0) {
        return <span className="flex items-center gap-1 text-xs text-red-600 font-sans"><AlertCircle size={14}/> WAKTU HABIS</span>;
    }

    return (
        <span className="flex items-center gap-1 text-xs text-blue-600 font-sans animate-pulse">
            <Clock size={14}/> Menunggu Konfirmasi: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
    );
}

function NotificationModal({ isOpen, onClose, data }) {
    const [view, setView] = useState('confirm');
    const [finalTemplate, setFinalTemplate] = useState(null);
    const [copySuccess, setCopySuccess] = useState('');

    useEffect(() => {
        if (isOpen) {
            setView('confirm');
            setFinalTemplate(null);
            setCopySuccess('');
        }
    }, [isOpen]);

    if (!isOpen || !data.person) return null;

    const handleConfirmAction = (replyType) => {
        const template = replyType === 'yes' ? messageTemplates.reply_yes : messageTemplates.reply_no;
        data.updateQueue('update', { id: data.person.id, newStatus: template.updatesStatusTo });
        setFinalTemplate(template);
        setView('final');
    };
    
    const handleCopyAction = (template) => {
        const message = template.text.replace(/\[NAME\]/g, data.person.name);
        navigator.clipboard.writeText(message).then(() => {
            setCopySuccess('Pesan berhasil disalin!');
            setTimeout(() => {
                onClose();
            }, 1200);
        }).catch(err => {
            console.error('Gagal menyalin: ', err);
            setCopySuccess('Gagal menyalin pesan.');
        });
    };

    const renderContent = () => {
        if (view === 'final') {
            return (
                 <div className="bg-gray-50 p-4 rounded-lg border-2 border-black">
                    <h3 className="font-semibold text-orange-600 text-xl tracking-wide">{finalTemplate.title}</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap font-sans mt-2">{finalTemplate.text.replace(/\[NAME\]/g, data.person.name)}</p>
                    <button onClick={() => handleCopyAction(finalTemplate)} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 font-bold text-white bg-blue-500 rounded-lg border-2 border-black shadow-[4px_4px_0_0_#000] hover:shadow-none transform hover:translate-x-1 hover:translate-y-1 transition-all">
                       <Copy size={16} /> COPY PESAN
                    </button>
                </div>
            );
        }

        return (
            <div className="text-center">
                <p className="font-sans text-gray-600 mb-4">Tandai respon dari pelanggan di bawah ini.</p>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleConfirmAction('yes')} className="w-full px-4 py-3 font-bold text-white bg-green-500 rounded-lg border-2 border-black shadow-[4px_4px_0_0_#000] hover:shadow-none transform hover:translate-x-1 hover:translate-y-1 transition-all">
                        BALAS "YA"
                    </button>
                    <button onClick={() => handleConfirmAction('no')} className="w-full px-4 py-3 font-bold text-white bg-red-500 rounded-lg border-2 border-black shadow-[4px_4px_0_0_#000] hover:shadow-none transform hover:translate-x-1 hover:translate-y-1 transition-all">
                        BALAS "TIDAK"
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-4 border-black">
                <div className="p-6 border-b-4 border-black flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-black tracking-wider">Tandai Respon: {data.person.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-black rounded-full p-1 hover:bg-gray-200 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {renderContent()}
                    {copySuccess && <p className="text-center text-sm text-green-600 pt-2 font-sans">{copySuccess}</p>}
                </div>
            </div>
        </div>
    );
}

function ErrorDisplay({ message }) {
    return <div className="bg-red-100 border-2 border-black text-red-800 px-4 py-3 rounded-lg mb-6"><strong className="font-bold">ERROR: </strong><span>{message}</span></div>;
}
