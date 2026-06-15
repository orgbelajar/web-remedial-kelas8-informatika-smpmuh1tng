// ============================================================
//  LOGIKA KUIS REMEDIAL INFORMATIKA KELAS 7
//  Phase 2: Authentication + Session + WhatsApp integration
// ------------------------------------------------------------
//  Tergantung pada: quizData (dari quiz-data.js)
// ============================================================

(function () {
  "use strict";

  // ---------- Constants ----------
  const STORAGE_KEY = "remedialSession";
  const PASSING_GRADE = 70;          // KKM
  const WA_NUMBER = "6281412397588"; // Kak Nabil
  const OPTION_LETTERS = ["A", "B", "C", "D"];

  // ---------- Quiz State ----------
  let currentQuestionIndex = 0;   // Indeks soal yang sedang ditampilkan
  let score = 0;                  // Jumlah jawaban benar (0..totalQuestions)
  const answers = [];             // Menyimpan indeks pilihan siswa per soal (untuk review)
  let isAnswered = false;         // Mencegah mengubah jawaban setelah memilih

  // ---------- DOM References ----------
  const screens = {
    login:     document.getElementById("login-screen"),
    dashboard: document.getElementById("dashboard-screen"),
    quiz:      document.getElementById("quiz-screen"),
    result:    document.getElementById("result-screen"),
  };

  const els = {
    // Login
    loginForm:    document.getElementById("login-form"),
    nameInput:    document.getElementById("name-input"),
    nameError:    document.getElementById("name-error"),
    loginBtn:     document.getElementById("login-btn"),
    // Dashboard
    greetingName:       document.getElementById("greeting-name"),
    dashboardBestScore: document.getElementById("dashboard-best-score"),
    statusBadge:        document.getElementById("status-badge"),
    historyList:        document.getElementById("history-list"),
    startRemedialBtn:   document.getElementById("start-remedial-btn"),
    waBtn:              document.getElementById("wa-btn"),
    // Quiz
    nextBtn:         document.getElementById("next-btn"),
    progressText:    document.getElementById("progress-text"),
    scoreText:       document.getElementById("score-text"),
    progressBar:     document.getElementById("progress-bar"),
    questionNumber:  document.getElementById("question-number"),
    questionText:    document.getElementById("question-text"),
    optionsContainer:document.getElementById("options-container"),
    explanationBox:  document.getElementById("explanation-box"),
    explanationText: document.getElementById("explanation-text"),
    // Result
    resultEmoji:           document.getElementById("result-emoji"),
    resultTitle:           document.getElementById("result-title"),
    resultStatusMessage:   document.getElementById("result-status-message"),
    finalScore:            document.getElementById("final-score"),
    correctCount:          document.getElementById("correct-count"),
    wrongCount:            document.getElementById("wrong-count"),
    reviewContainer:       document.getElementById("review-container"),
    backToDashboardBtn:    document.getElementById("back-to-dashboard-btn"),
  };

  // ============================================================
  //  DATA LAYER (localStorage)
  // ============================================================

  // Baca & validasi session. Return null kalau tidak ada / rusak.
  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Validasi struktur minimal
      if (typeof data !== "object" || data === null) return null;
      if (typeof data.name !== "string" || data.name.trim() === "") return null;
      if (!Array.isArray(data.history)) return null;
      // Sanitasi tiap entri history
      data.history = data.history
        .filter((h) => h && typeof h === "object")
        .map((h) => ({
          attempt: Number(h.attempt) || 0,
          score: clampScore(Number(h.score)),
          date: typeof h.date === "string" ? h.date : "",
        }));
      // bestScore selalu di-recompute dari history (self-healing)
      data.bestScore = computeBestScore(data.history);
      return data;
    } catch (e) {
      return null; // JSON rusak / localStorage diblokir
    }
  }

  function saveSession(session) {
    try {
      // bestScore ditulis ulang agar konsisten dengan history
      session.bestScore = computeBestScore(session.history);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      // localStorage penuh / diblokir — abaikan secara graceful
      console.warn("Tidak dapat menyimpan session:", e);
    }
  }

  // Sumber kebenaran bestScore: max dari seluruh history
  function computeBestScore(history) {
    if (!history || history.length === 0) return 0;
    return history.reduce((max, h) => Math.max(max, h.score), 0);
  }

  function clampScore(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  // Tanggal format DD-MM-YYYY (Indonesia, leading zero)
  function todayID() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // ============================================================
  //  HELPERS
  // ============================================================

  // Escape karakter HTML agar aman dimasukkan ke innerHTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Title Case + normalisasi spasi: "nabil  ihsan" -> "Nabil Ihsan"
  function toTitleCase(str) {
    return str
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  // ============================================================
  //  SCREEN NAVIGATION
  // ============================================================

  function showScreen(name) {
    Object.values(screens).forEach((el) => {
      el.classList.add("hidden");
      el.classList.remove("fade-in");
    });
    const target = screens[name];
    if (!target) return;
    target.classList.remove("hidden");
    void target.offsetWidth; // reflow agar animasi ulang
    target.classList.add("fade-in");
    // Scroll ke atas tiap ganti layar
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ============================================================
  //  LOGIN
  // ============================================================

  function handleLogin(e) {
    e.preventDefault();
    const raw = els.nameInput.value;
    if (raw.trim() === "") {
      els.nameError.classList.remove("hidden");
      els.nameInput.focus();
      return;
    }
    const name = toTitleCase(raw);
    const session = { name: name, bestScore: 0, history: [] };
    saveSession(session);
    showDashboard();
  }

  // Real-time Title Case preview + toggle tombol Masuk
  function handleNameInput() {
    const raw = els.nameInput.value;
    const isValid = raw.trim() !== "";
    // Sembunyikan error saat mulai mengetik ulang
    els.nameError.classList.add("hidden");
    els.loginBtn.disabled = !isValid;
    // Preview Title Case live (hanya tampilan; nilai akhir diformat ulang saat submit)
    // Tidak mengganggu kursor: hanya format saat spasi ganda
    if (/\s{2,}/.test(raw)) {
      els.nameInput.value = raw.replace(/\s+/g, " ");
    }
  }

  // ============================================================
  //  DASHBOARD
  // ============================================================

  function showDashboard() {
    const session = loadSession();
    if (!session) {
      // Fallback safety: kalau session hilang, balik ke login
      showLogin();
      return;
    }

    const bestScore = computeBestScore(session.history);
    const hasPassed = bestScore >= PASSING_GRADE;

    // Greeting (nama di-truncate via CSS, tooltip penuh)
    els.greetingName.textContent = session.name;
    els.greetingName.setAttribute("title", session.name);

    // Best score
    els.dashboardBestScore.textContent = bestScore;

    // Status badge
    if (bestScore === 0) {
      els.statusBadge.textContent = "BELUM MENCOBA";
      els.statusBadge.className =
        "inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600";
    } else if (hasPassed) {
      els.statusBadge.textContent = "LULUS ✓";
      els.statusBadge.className =
        "inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700";
    } else {
      els.statusBadge.textContent = "BELUM LULUS";
      els.statusBadge.className =
        "inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700";
    }

    renderHistory(session);

    // Tombol aksi dinamis
    if (hasPassed) {
      els.startRemedialBtn.classList.add("hidden");
      els.waBtn.classList.remove("hidden");
      els.waBtn.href = buildWhatsAppUrl(session.name, bestScore);
    } else {
      els.startRemedialBtn.classList.remove("hidden");
      els.waBtn.classList.add("hidden");
    }

    showScreen("dashboard");
  }

  function renderHistory(session) {
    if (!session.history || session.history.length === 0) {
      els.historyList.innerHTML =
        '<li class="text-sm text-gray-400 italic text-center py-2">Belum ada percobaan</li>';
      return;
    }
    // Tampilkan terbaru di atas
    const items = session.history
      .slice()
      .reverse()
      .map((h) => {
        const passed = h.score >= PASSING_GRADE;
        const color = passed ? "text-green-600" : "text-gray-700";
        const badge = passed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600";
        return (
          `<li class="flex items-center justify-between bg-card rounded-lg px-3 py-2">` +
            `<div class="text-sm">` +
              `<span class="font-medium text-gray-800">Percobaan ${escapeHtml(String(h.attempt))}</span>` +
              `<span class="block text-xs text-gray-400">${escapeHtml(h.date || "")}</span>` +
            `</div>` +
            `<span class="text-lg font-bold ${color}">${h.score}` +
              `<span class="text-xs font-normal ${badge} ml-1 px-2 py-0.5 rounded-full">${passed ? "Lulus" : "Belum"}</span>` +
            `</span>` +
          `</li>`
        );
      })
      .join("");
    els.historyList.innerHTML = items;
  }

  // ============================================================
  //  WHATSAPP
  // ============================================================

  function buildWhatsAppUrl(name, bestScore) {
    const text =
      `Halo Kak Nabil, saya ${name} telah berhasil menyelesaikan remedial Informatika ` +
      `dengan nilai akhir ${bestScore}. Berikut saya lampirkan screenshot hasilnya.`;
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  }

  // ============================================================
  //  QUIZ (render, answer, next)
  // ============================================================

  function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    answers.length = 0;
    isAnswered = false;
    renderQuestion();
    showScreen("quiz");
  }

  function renderQuestion() {
    const q = quizData[currentQuestionIndex];
    const total = quizData.length;
    isAnswered = false;

    // Progress bar & teks
    const progressPercent = (currentQuestionIndex / total) * 100;
    els.progressBar.style.width = progressPercent + "%";
    els.progressText.textContent = `Soal ${currentQuestionIndex + 1} dari ${total}`;
    els.scoreText.textContent = `Skor: ${currentScoreScaled()}`;

    // Nomor & teks soal
    els.questionNumber.textContent = `Soal ${currentQuestionIndex + 1}`;
    els.questionText.textContent = q.question;

    // Render opsi
    els.optionsContainer.innerHTML = "";
    q.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.index = idx;
      btn.className =
        "option-btn w-full text-left p-4 rounded-xl border-2 border-gray-200 bg-white " +
        "flex items-center gap-3 transition-all duration-200 " +
        "hover:border-blue-400 hover:bg-blue-50 active:scale-[0.99] " +
        "disabled:cursor-default disabled:hover:border-gray-200 disabled:hover:bg-white";

      btn.innerHTML =
        `<span class="option-letter shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 font-semibold text-sm transition-colors">` +
        `${OPTION_LETTERS[idx]}</span>` +
        `<span class="option-text flex-1 text-base sm:text-lg text-gray-700">${escapeHtml(opt)}</span>`;

      btn.addEventListener("click", () => selectAnswer(idx));
      els.optionsContainer.appendChild(btn);
    });

    // Sembunyikan penjelasan & tombol selanjutnya (state awal tiap soal)
    els.explanationBox.classList.add("hidden");
    els.nextBtn.classList.add("hidden");
  }

  // Skor real-time dalam skala 0-100 (berdasar jumlah benar saat ini)
  function currentScoreScaled() {
    const total = quizData.length || 1;
    return Math.round((score / total) * 100);
  }

  function selectAnswer(index) {
    if (isAnswered) return; // Kunci: tidak bisa mengubah jawaban
    isAnswered = true;

    const q = quizData[currentQuestionIndex];
    const correct = q.correctAnswerIndex;
    answers[currentQuestionIndex] = index;

    const buttons = els.optionsContainer.querySelectorAll(".option-btn");
    buttons.forEach((btn) => {
      const idx = Number(btn.dataset.index);
      btn.disabled = true; // kunci semua tombol

      if (idx === correct) {
        // Tandai jawaban BENAR dengan hijau
        btn.classList.remove("border-gray-200", "bg-white");
        btn.classList.add("border-green-500", "bg-green-50");
        btn.querySelector(".option-letter").classList.remove("bg-gray-100", "text-gray-600");
        btn.querySelector(".option-letter").classList.add("bg-green-500", "text-white");
        btn.querySelector(".option-text").classList.add("text-green-700", "font-medium");
        appendMark(btn, "✓", "text-green-600");
      } else if (idx === index) {
        // Tandai pilihan siswa yang SALAH dengan merah
        btn.classList.remove("border-gray-200", "bg-white");
        btn.classList.add("border-red-400", "bg-red-50");
        btn.querySelector(".option-letter").classList.remove("bg-gray-100", "text-gray-600");
        btn.querySelector(".option-letter").classList.add("bg-red-500", "text-white");
        btn.querySelector(".option-text").classList.add("text-red-700");
        appendMark(btn, "✗", "text-red-500");
      } else {
        // Opsi lain dikaburkan sedikit
        btn.classList.add("opacity-60");
      }
    });

    // Update skor langsung jika benar
    if (index === correct) {
      score++;
      els.scoreText.textContent = `Skor: ${currentScoreScaled()}`;
    }

    // Tampilkan penjelasan
    els.explanationText.textContent = q.explanation;
    els.explanationBox.classList.remove("hidden");
    void els.explanationBox.offsetWidth; // re-trigger animasi
    els.explanationBox.classList.add("slide-in");

    // Tampilkan & ubah label tombol selanjutnya
    const isLast = currentQuestionIndex === quizData.length - 1;
    els.nextBtn.textContent = isLast ? "Lihat Hasil" : "Soal Selanjutnya";
    els.nextBtn.classList.remove("hidden");
    void els.nextBtn.offsetWidth;
    els.nextBtn.classList.add("slide-in");
  }

  // Tambah tanda centang/silang di kanan tombol opsi
  function appendMark(btn, symbol, colorClass) {
    const mark = document.createElement("span");
    mark.className = `shrink-0 font-bold text-xl ${colorClass}`;
    mark.textContent = symbol;
    btn.appendChild(mark);
  }

  function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizData.length) {
      renderQuestion();
    } else {
      showResult();
    }
  }

  // ============================================================
  //  RESULT
  // ============================================================

  function showResult() {
    // Penuhkan progress bar
    els.progressBar.style.width = "100%";

    const total = quizData.length;
    const correct = score;
    const wrong = total - correct;
    const finalScore = clampScore((correct / (total || 1)) * 100);

    // ---- Simpan attempt ke session ----
    const session = loadSession();
    if (session) {
      const attemptNumber = session.history.length + 1;
      session.history.push({
        attempt: attemptNumber,
        score: finalScore,
        date: todayID(),
      });
      saveSession(session); // bestScore di-recompute di sini
    }

    const hasPassed = finalScore >= PASSING_GRADE;

    // ---- Ucapan dinamis berdasarkan skor ----
    let emoji, title, statusMsg;
    if (hasPassed) {
      emoji = "🎉";
      title = "Selamat!";
      statusMsg =
        `Selamat! Nilai kamu <strong class="text-green-600">${finalScore}</strong>. ` +
        `Kamu berhasil lulus remedial.`;
    } else {
      emoji = "💪";
      title = "Belum Lulus";
      statusMsg =
        `Maaf, nilai kamu <strong class="text-red-500">${finalScore}</strong>. ` +
        `Kamu belum memenuhi KKM (${PASSING_GRADE}). Silakan coba lagi.`;
    }

    els.resultEmoji.textContent = emoji;
    els.resultTitle.textContent = title;
    els.resultStatusMessage.innerHTML = statusMsg;
    els.finalScore.textContent = finalScore;
    els.correctCount.textContent = correct;
    els.wrongCount.textContent = wrong;

    // Render review jawaban (dari Phase 1)
    renderReview();

    showScreen("result");
  }

  function renderReview() {
    els.reviewContainer.innerHTML = "";
    quizData.forEach((q, i) => {
      const userAns = answers[i];
      const correctIdx = q.correctAnswerIndex;
      const isCorrect = userAns === correctIdx;

      const item = document.createElement("div");
      item.className =
        `flex items-start gap-2 p-3 rounded-lg border ` +
        (isCorrect
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200");

      const mark = isCorrect ? "✓" : "✗";
      const markColor = isCorrect ? "text-green-600" : "text-red-500";

      let detail = "";
      if (isCorrect) {
        detail = `<span class="font-medium text-green-700">Jawabanmu benar</span>`;
      } else {
        const userLetter = (userAns !== undefined) ? OPTION_LETTERS[userAns] : "-";
        const correctLetter = OPTION_LETTERS[correctIdx];
        detail =
          `<span class="text-red-700">Jawabanmu: ${escapeHtml(userLetter)}. </span>` +
          `<span class="text-green-700">Benar: ${escapeHtml(correctLetter)}. ${escapeHtml(q.options[correctIdx])}</span>`;
      }

      item.innerHTML =
        `<span class="font-bold ${markColor} shrink-0">${mark}</span>` +
        `<div class="text-sm leading-snug">` +
          `<span class="font-medium text-gray-700">Soal ${i + 1}: </span>` +
          detail +
        `</div>`;

      els.reviewContainer.appendChild(item);
    });
  }

  // ============================================================
  //  ENTRY POINT / WIRING
  // ============================================================

  function showLogin() {
    // Reset form saat masuk login
    if (els.nameInput) {
      els.nameInput.value = "";
      els.loginBtn.disabled = true;
      els.nameError.classList.add("hidden");
    }
    showScreen("login");
    // Fokus input setelah animasi singkat
    setTimeout(() => els.nameInput && els.nameInput.focus(), 200);
  }

  // Event bindings
  els.loginForm.addEventListener("submit", handleLogin);
  els.nameInput.addEventListener("input", handleNameInput);
  els.startRemedialBtn.addEventListener("click", startQuiz);
  els.nextBtn.addEventListener("click", nextQuestion);
  els.backToDashboardBtn.addEventListener("click", showDashboard);

  // Tampilan awal: dashboard kalau sudah ada session, kalau tidak login
  if (loadSession()) {
    showDashboard();
  } else {
    showLogin();
  }
})();
