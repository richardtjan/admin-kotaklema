import React, { useState, useEffect, useCallback } from 'react';
import { User, Clock, Users, Send, Loader2, AlertCircle, ChevronsRight, Phone, X, Play, Pause, CheckCircle, Copy, ThumbsUp, ThumbsDown, GripVertical, Trash2 } from 'lucide-react';

// --- Constants ---
const TURN_DURATION_MINUTES = 7;
const TURN_DURATION_MS = TURN_DURATION_MINUTES * 60 * 1000;
const RESPONSE_WAIT_MS = 3 * 60 * 1000; // 3 minutes for response

// --- Custom SVG Logo (Comic Style) ---
const KotaklemaLogo = () => (
    <div className="flex flex-col items-center">
        <svg width="450" height="120" viewBox="0 0 450 120">
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
                <rect x="10" y="10" width="430" height="90" rx="20" ry="20" fill="#F3F4F6" stroke="#000000" strokeWidth="4" filter="url(#comic-shadow)" />
                <text x="225" y="78" fontFamily="Bangers, cursive" fontSize="75" fill="#F97316" textAnchor="middle" stroke="#000000" strokeWidth="3" letterSpacing="2">
                    KOTAKLEMA
                </text>
            </g>
        </svg>
        <p className="font-['Bangers'] text-2xl text-zinc-800 tracking-wider mt-2">Admin KOTAKLEMA PhotoBox</p>
    </div>
);

// --- WhatsApp Icon ---
const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.731 6.086l.001.004 1.443 2.542-1.575 5.45z" /></svg>
);

// --- Message Templates with Status Logic ---
const messageTemplates = {
    initial: [
        { id: 'cf1', title: 'Notifikasi Panggilan (Minta Konfirmasi)', text: `Hai Kak [NAME],\n\nGiliran Kakak sudah dekat! Mohon balas "YA" jika sudah siap menuju lokasi, atau "TIDAK" jika belum bisa.\n\nDitunggu konfirmasinya dalam 3 menit ke depan ya. 😊\n\nMakasih banyak atas pengertiannya, Kak! 🙏`, updatesStatusTo: 'notified' },
        { id: 'fc1', title: 'Giliran Dimajukan', text: `Hai Kak [NAME], ada kabar baik nih! 😊\n\nKebetulan ada slot yang kosong, jadi giliran Kakak bisa kami majukan SEKARANG.\n\nBoleh langsung ke BOOTH KOTAKLEMA ya. Ditunggu kedatangannya, Kak! ✨` },
        { id: 'sn1', title: 'Info Giliran Terlewat', text: "Halo Kak [NAME], terima kasih atas konfirmasinya.\nKarena Kakak belum hadir saat giliran tiba tadi, kami sudah mempersilakan pelanggan berikutnya untuk menjaga alur antrian.\nTapi jangan khawatir, giliran Kakak tidak hangus. Kakak akan kami layani di urutan berikutnya yang tersedia. Mohon ditunggu sebentar ya. Terima kasih atas pengertiannya. 🙏" }
    ],
    reply_yes: { id: 'resp_yes', title: 'Balasan untuk "YA"', text: `Terima kasih atas konfirmasinya, Kak [NAME]! Kami tunggu kedatangannya di [LOKASI].`, updatesStatusTo: 'confirmed' },
    reply_no: { id: 'resp_no', title: 'Balasan untuk "TIDAK"', text: `Baik, Kak [NAME], terima kasih informasinya. Kami akan memberitahu Anda kembali jika sudah ada giliran yang tersedia.`, updatesStatusTo: 'waiting' }
};

// --- Main App Component ---
export default function App() {
    const [queue, setQueue] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState({ person: null, templates: [], updateStatus: null, actionType: 'whatsapp' });

    const fetchQueue = useCallback(async () => {
        setError(null);
        try {
            const response = await fetch('/api/getQueue');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
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
        fetchQueue();
         // Tambahkan polling untuk refresh data setiap 15 detik
        const intervalId = setInterval(fetchQueue, 15000);
        return () => clearInterval(intervalId);
    }, [fetchQueue]);

    const handleUpdateStatus = useCallback(async (personId, newStatus) => {
        try {
            await fetch('/api/updateQueue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', payload: { id: personId, newStatus } }),
            });
            fetchQueue(); // Refresh data setelah update
        } catch (error) {
            console.error("Error updating status:", error);
            setError("Gagal memperbarui status.");
        }
    }, [fetchQueue]);

    const handleOpenModal = useCallback((person, templates, actionType = 'whatsapp') => {
        setModalData({
            person,
            templates: Array.isArray(templates) ? templates : [templates],
            updateStatus: handleUpdateStatus,
            actionType: actionType
        });
        setIsModalOpen(true);
    }, [handleUpdateStatus]);

    const nowServing = queue.length > 0 ? queue[0] : null;
    const upNext = queue.length > 1 ? queue.slice(1) : [];

    return (
        <div
            className="bg-white text-zinc-800 min-h-screen font-['Bangers'] flex flex-col items-center p-4 sm:p-6 lg:p-8"
            style={{
                backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
                backgroundSize: '10px 10px'
            }}
        >
            <div className="w-full max-w-6xl mx-auto">
                <header className="text-center mb-10">
                    <KotaklemaLogo />
                </header>

                {error && <ErrorDisplay message={error} />}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-10 text-gray-500">
                        <Loader2 className="animate-spin h-12 w-12 mb-4 text-orange-500" />
                        <p className="text-2xl tracking-wider">LOADING...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        <div className="lg:col-span-2"><JoinQueueForm queue={queue} onQueueUpdate={fetchQueue} /></div>
                        <div className="lg:col-span-3"><QueueDisplay nowServing={nowServing} upNext={upNext} onQueueUpdate={fetchQueue} onOpenModal={handleOpenModal} /></div>
                    </div>
                )}
            </div>
            <NotificationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={modalData} />
        </div>
    );
}

// --- Join Queue Form ---
function JoinQueueForm({ queue, onQueueUpdate }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) {
            setSubmitStatus({ type: 'error', message: 'Harap isi semua kolom.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const highestOrder = queue.reduce((max, p) => p.order > max ? p.order : max, 0);
            const response = await fetch('/api/addToQueue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    phone: phone.trim(),
                    order: highestOrder + 1000,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Gagal menambahkan antrian.');
            }
            
            setSubmitStatus({ type: 'success', message: `${name.trim()} berhasil ditambahkan.` });
            setName(''); setPhone('');
            onQueueUpdate(); // Panggil fungsi untuk refresh data
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
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812..." className="block w-full bg-white border-2 border-black rounded-lg py-3 px-6 text-zinc-900 focus:outline-none focus:ring-4 focus:ring-orange-500/50 transition-all font-sans"/>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center px-6 py-4 border-2 border-black rounded-lg text-black font-bold text-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 shadow-[8px_8px_0_0_#000] hover:shadow-[4px_4px_0_0_#000] transform hover:translate-x-1 hover:translate-y-1 transition-all">
                    {isSubmitting ? <Loader2 className="animate-spin h-6 w-6 mr-3" /> : <Send className="h-6 w-6 mr-3" />}GAS!
                </button>
            </form>
            {submitStatus.message && <div className={`mt-4 p-3 rounded-lg text-sm text-center font-sans flex items-center justify-center ${submitStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}><AlertCircle className="mr-2" /> {submitStatus.message}</div>}
        </div>
    );
}

// --- Queue Display and Controls ---
function QueueDisplay({ nowServing, upNext, onQueueUpdate, onOpenModal }) {
    const [timeLeft, setTimeLeft] = useState(TURN_DURATION_MS);
    const [timerState, setTimerState] = useState('idle');
    const [draggedItem, setDraggedItem] = useState(null);
    const [dropTargetId, setDropTargetId] = useState(null);

    useEffect(() => {
        if (timerState !== 'running') return;
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1000) { clearInterval(interval); setTimerState('paused'); return 0; }
                return prev - 1000;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timerState]);

    useEffect(() => {
        setTimeLeft(TURN_DURATION_MS);
        setTimerState('idle');
    }, [nowServing?.id]);

    const handleStart = () => { if (timeLeft > 0) setTimerState('running'); };
    const handlePause = () => setTimerState('paused');
    
    const handleFinish = async () => {
        if (!nowServing) return;
        await fetch('/api/updateQueue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', payload: { id: nowServing.id } }),
        });
        onQueueUpdate();
    };

    const handleFinishAndServe = async (personToServe) => {
        if (!personToServe) return;
        
        // Hapus yang sedang dilayani (jika ada)
        if (nowServing) {
            await fetch('/api/updateQueue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', payload: { id: nowServing.id } }),
            });
        }
        
        // Jadikan orang berikutnya sebagai yang pertama dengan order lebih kecil
        await fetch('/api/updateQueue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', payload: { id: personToServe.id, newOrder: nowServing ? nowServing.order - 1 : Date.now() - 1000 } }),
        });
        
        onQueueUpdate();
    };

    const handleDelete = async (personId) => {
        if (!personId) return;
        await fetch('/api/updateQueue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', payload: { id: personId } }),
        });
        onQueueUpdate();
    };

    const handleDragEnd = async () => {
        if (!draggedItem || !dropTargetId) {
            setDraggedItem(null);
            setDropTargetId(null);
            return;
        }

        const targetItem = upNext.find(item => item.id === dropTargetId);
        const targetIndex = upNext.indexOf(targetItem);
        const prevItem = upNext[targetIndex - 1];
        const newOrder = prevItem ? (prevItem.order + targetItem.order) / 2 : targetItem.order / 2;

        await fetch('/api/updateQueue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', payload: { id: draggedItem.id, newOrder } }),
        });
        
        onQueueUpdate();
        setDraggedItem(null);
        setDropTargetId(null);
    };

    const getStatusIndicator = (status) => {
        switch (status) {
            case 'confirmed':
                return <span className="flex items-center gap-1 text-xs text-green-600 font-sans"><CheckCircle size={14}/> DIKONFIRMASI</span>;
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
                        <TimerDisplay timeLeft={timeLeft} />
                        <div className="mt-6 grid grid-cols-3 gap-3">
                            <button onClick={handleStart} className="flex items-center justify-center gap-2 px-4 py-3 text-xl text-white bg-green-600 rounded-lg shadow-[4px_4px_0_0_#000] hover:shadow-none transform hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50" disabled={timeLeft === 0 || timerState === 'running'}><Play size={16}/>MULAI</button>
                            <button onClick={handlePause} className="flex items-center justify-center gap-2 px-4 py-3 text-xl text-white bg-yellow-500 rounded-lg shadow-[4px_4px_0_0_#000] hover:shadow-none transform hover:translate-x-1 hover:translate-y-1 transition-all"><Pause size={16}/>JEDA</button>
                            <button onClick={handleFinish} className="flex items-center justify-center gap-2 px-4 py-3 text-xl text-white bg-red-600 rounded-lg shadow-[4px_4px_0_0_#000] hover:shadow-none transform hover:translate-x-1 hover:translate-y-1 transition-all"><CheckCircle size={16} />SELESAI</button>
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
                                <React.Fragment key={person.id}>
                                    {dropTargetId === person.id && <div className="h-1.5 my-1 bg-yellow-400 rounded-full" />}
                                    <li 
                                        data-id={person.id}
                                        className={`bg-white p-4 rounded-lg cursor-grab transition-all duration-300 border-2 border-black ${draggedItem?.id === person.id ? 'opacity-30' : ''}`}
                                        draggable
                                        onDragStart={() => setDraggedItem(person)}
                                        onDragEnd={handleDragEnd}
                                        onDragEnter={() => setDropTargetId(person.id)}
                                        onDragLeave={() => setDropTargetId(null)}
                                        onDragOver={(e) => e.preventDefault()}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <GripVertical className="text-gray-400 mr-3" />
                                                <span className="text-2xl font-bold text-zinc-800">{person.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleDelete(person.id)} className="p-2 text-white bg-red-600 rounded-full border-2 border-black shadow-[2px_2px_0_0_#000] hover:shadow-none transform hover:translate-x-0.5 hover:translate-y-0.5 transition-all"><Trash2 size={14} /></button>
                                                <button onClick={() => handleFinishAndServe(person)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-white bg-green-500 rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000] hover:shadow-none transform hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                                                    <ChevronsRight size={14} /> LANJUT
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-300 flex items-center justify-between min-h-[34px]">
                                            {/* Logika status notifikasi bisa ditambahkan kembali di sini jika diperlukan */}
                                            {getStatusIndicator(person.status)}
                                        </div>
                                    </li>
                                </React.Fragment>
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

// --- Timer Components (No changes needed) ---
function TimerDisplay({ timeLeft }) {
    const minutes = Math.floor((timeLeft / 1000) / 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);
    return (
        <div className="flex items-center justify-center gap-2 text-5xl bg-white p-3 rounded-lg border-4 border-black shadow-inner">
            <Clock className="h-10 w-10 text-yellow-500" />
            <span className={timeLeft <= 60000 ? 'text-red-500' : 'text-zinc-800'}>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
        </div>
    );
}

// --- Notification Modal (No significant changes needed, logic stays on client) ---
function NotificationModal({ isOpen, onClose, data }) {
    const [copySuccess, setCopySuccess] = useState('');
    if (!isOpen || !data.person) return null;

    const handleAction = (template) => {
        const message = template.text.replace(/\[NAME\]/g, data.person.name).replace(/\[LOKASI\]/g, "Photobooth");
        
        if (data.actionType === 'whatsapp') {
            window.open(`https://wa.me/${data.person.phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
        } else { // 'copy'
            const textArea = document.createElement("textarea");
            textArea.value = message;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopySuccess('Pesan berhasil disalin!');
            } catch (err) {
                setCopySuccess('Gagal menyalin pesan.');
            }
            document.body.removeChild(textArea);
        }

        if (template.updatesStatusTo && data.updateStatus) {
            data.updateStatus(data.person.id, template.updatesStatusTo);
        }
        
        if (data.actionType === 'copy') {
             setTimeout(() => {
                onClose();
                setCopySuccess('');
            }, 1000);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-4 border-black">
                <div className="p-6 border-b-4 border-black flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-black tracking-wider">KIRIM NOTIFIKASI KE {data.person.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-black rounded-full p-1 hover:bg-gray-200 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {data.templates.map(template => (
                        <div key={template.id} className="bg-gray-50 p-4 rounded-lg border-2 border-black">
                            <h3 className="font-semibold text-orange-600 text-xl tracking-wide">{template.title}</h3>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap font-sans mt-2">{template.text.replace(/\[NAME\]/g, data.person.name).replace(/\[LOKASI\]/g, "Photobooth")}</p>
                            <button onClick={() => handleAction(template)} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 font-bold text-white bg-orange-500 rounded-lg border-2 border-black shadow-[4px_4px_0_0_#000] hover:shadow-none transform hover:translate-x-1 hover:translate-y-1 transition-all">
                                {data.actionType === 'copy' ? <Copy size={16} /> : <WhatsAppIcon />}
                                {data.actionType === 'copy' ? 'COPY PESAN' : 'KIRIM VIA WHATSAPP'}
                            </button>
                        </div>
                    ))}
                    {copySuccess && <p className="text-center text-sm text-green-600 pt-2 font-sans">{copySuccess}</p>}
                </div>
            </div>
        </div>
    );
}

function ErrorDisplay({ message }) {
    return <div className="bg-red-100 border-2 border-black text-red-800 px-4 py-3 rounded-lg mb-6"><strong className="font-bold">ERROR: </strong><span>{message}</span></div>;
}

