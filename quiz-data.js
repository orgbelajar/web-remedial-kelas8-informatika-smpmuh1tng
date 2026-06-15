// ============================================================
//  DATA SOAL KUIS REMEDIAL INFORMATIKA KELAS 7
// ------------------------------------------------------------
//  Cara menambah soal baru:
//    Salin satu blok objek di bawah (dari tanda { hingga }),
//    tempel sebelum tanda tutup array ], lalu ubah isinya.
//
//  Struktur tiap soal:
//    {
//      question:            "Teks pertanyaan di sini",
//      options:             ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
//      correctAnswerIndex:  0,            // 0=A, 1=B, 2=C, 3=D
//      explanation:         "Penjelasan jawaban di sini"
//    }
//
//  Catatan: Tiap soal bernilai 5 poin (20 soal x 5 = 100).
// ============================================================

const quizData = [
  {
    question: "Manakah yang merupakan aplikasi pengolah lembar kerja (spreadsheet)?",
    options: ["Microsoft Word", "Microsoft PowerPoint", "Microsoft Excel", "Adobe Photoshop"],
    correctAnswerIndex: 2,
    explanation: "Microsoft Excel adalah aplikasi yang dirancang khusus untuk mengolah lembar kerja (spreadsheet) berupa baris dan kolom."
  },
  {
    question: "Perangkat keras (hardware) yang berfungsi sebagai 'otak' komputer adalah ...",
    options: ["Hard Disk", "Processor (CPU)", "Monitor", "Keyboard"],
    correctAnswerIndex: 1,
    explanation: "Processor atau CPU (Central Processing Unit) adalah otak komputer yang memproses semua instruksi dan perhitungan data."
  },
  {
    question: "Aplikasi di bawah ini yang digunakan untuk menjelajah internet adalah ...",
    options: ["Microsoft Excel", "CorelDRAW", "Google Chrome", "VLC Media Player"],
    correctAnswerIndex: 2,
    explanation: "Google Chrome adalah contoh peramban (web browser) yang digunakan untuk membuka dan menjelajah halaman situs di internet."

  // ============================================================
  //  TAMBAHKAN SOAL KE-4 SAMPAI KE-20 DI BAWAH INI
  //  (Salin blok objek di atas, tempel di sini, lalu ubah.)
  //  Pastikan tanda koma (,) ada di akhir tiap objek kecuali yang
  //  terakhir sebelum ] di bawah.
  // ============================================================
  }
];
