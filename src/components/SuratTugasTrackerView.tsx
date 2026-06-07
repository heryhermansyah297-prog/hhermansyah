// 1. Ganti bagian inisialisasi awal di SuratTugasTrackerView.tsx

export default function SuratTugasTrackerView({ requests }: SuratTugasTrackerViewProps) {
  // Pastikan inisialisasi assignment mengambil data dari localStorage dengan lebih aman
  const [assignments, setAssignments] = useState<Record<string, SuratTugas>>(() => {
    const saved = localStorage.getItem('surat_tugas_assignments');
    return saved ? JSON.parse(saved) : {};
  });
  
  // ... state lainnya tetap sama

  // 2. Perbarui useEffect untuk memuat data saat sinkronisasi terjadi
  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('surat_tugas_assignments');
      if (saved) setAssignments(JSON.parse(saved));
    };

    window.addEventListener('suratTugasUpdated', handleUpdate);
    return () => window.removeEventListener('suratTugasUpdated', handleUpdate);
  }, []);
