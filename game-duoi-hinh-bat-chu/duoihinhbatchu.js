/**
 * Đuổi Hình Bắt Chữ - Livestream Game Show Engine
 * Cơ chế: Chỉ dùng 2 nút ĐÚNG / SAI cho Host, có thanh soi đáp án trước (mờ/rõ)
 * kèm Modal danh sách toàn bộ đáp án để Host tra cứu.
 */

(function () {
  'use strict';

  function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  }

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  class DHBCGame {
    constructor() {
      // Config
      this.playerName = 'Khách Mời';
      this.questionCount = 10;
      this.basePrizePerQuestion = 10000;
      this.questionDurationSeconds = 30;

      // Runtime State
      this.pool = [];
      this.currentIndex = 0;
      this.currentQuestion = null;
      this.totalWon = 0;
      this.correctCount = 0;
      this.unansweredCount = 0;
      this.history = [];

      // Timer & Clock
      this.timerInterval = null;
      this.totalMs = 30000;
      this.remainingMs = 30000;
      this.currentRunningPrize = 10000;
      this.isClockRunning = false;
      this.isCurtainOpen = false;
      this.isQuestionResolved = false;
      this.lastTickSecond = -1;

      // DOM Elements Cache
      this.dom = {};
    }

    init() {
      this.cacheDom();
      this.bindEvents();
      this.renderFullAnswerModal();
      this.showView('setup');
    }

    cacheDom() {
      // Views
      this.dom.viewSetup = document.getElementById('viewSetup');
      this.dom.viewGameplay = document.getElementById('viewGameplay');
      this.dom.viewSummary = document.getElementById('viewSummary');

      // Setup inputs
      this.dom.inputPlayerName = document.getElementById('inputPlayerName');
      this.dom.inputPrizePerQ = document.getElementById('inputPrizePerQ');
      this.dom.btnStartGame = document.getElementById('btnStartGame');

      // Top Stats
      this.dom.headerTotalPrize = document.getElementById('headerTotalPrize');
      this.dom.headerPlayerName = document.getElementById('headerPlayerName');
      this.dom.btnSoundToggle = document.getElementById('btnSoundToggle');
      this.dom.btnOpenAnswerList = document.getElementById('btnOpenAnswerList');

      // Host Spy Bar
      this.dom.hostCheatBox = document.getElementById('hostCheatBox');
      this.dom.hostCheatAnswer = document.getElementById('hostCheatAnswer');
      this.dom.chkAlwaysShowCheat = document.getElementById('chkAlwaysShowCheat');

      // Match Bar
      this.dom.matchPlayerName = document.getElementById('matchPlayerName');
      this.dom.clockNumber = document.getElementById('clockNumber');
      this.dom.prizeAmount = document.getElementById('prizeAmount');
      this.dom.currentQNumber = document.getElementById('currentQNumber');
      this.dom.totalQNumber = document.getElementById('totalQNumber');
      this.dom.questionCategory = document.getElementById('questionCategory');
      this.dom.timeBarFill = document.getElementById('timeBarFill');

      // Arena & Curtain
      this.dom.arenaCurtain = document.getElementById('arenaCurtain');
      this.dom.btnCurtainStart = document.getElementById('btnCurtainStart');
      this.dom.svgArtContainer = document.getElementById('svgArtContainer');

      // Answer preview slots
      this.dom.previewWordSlots = document.getElementById('previewWordSlots');
      this.dom.previewBadge = document.getElementById('previewBadge');

      // Host Direct Buttons
      this.dom.btnHostCorrect = document.getElementById('btnHostCorrect');
      this.dom.btnHostSkip = document.getElementById('btnHostSkip');
      this.dom.feedbackAlert = document.getElementById('feedbackAlert');

      // Explanation & Post Answer
      this.dom.explanationCard = document.getElementById('explanationCard');
      this.dom.explanationPhrase = document.getElementById('explanationPhrase');
      this.dom.explanationText = document.getElementById('explanationText');
      this.dom.postAnswerBar = document.getElementById('postAnswerBar');
      this.dom.btnNextQuestion = document.getElementById('btnNextQuestion');

      // Summary
      this.dom.summaryPlayerName = document.getElementById('summaryPlayerName');
      this.dom.summaryTotalWon = document.getElementById('summaryTotalWon');
      this.dom.summaryCorrectCount = document.getElementById('summaryCorrectCount');
      this.dom.summaryCorrectPercent = document.getElementById('summaryCorrectPercent');
      this.dom.summaryUnansweredCount = document.getElementById('summaryUnansweredCount');
      this.dom.summaryAvgTime = document.getElementById('summaryAvgTime');
      this.dom.summaryTableBody = document.getElementById('summaryTableBody');
      this.dom.btnPlayAgain = document.getElementById('btnPlayAgain');
      this.dom.btnNewSetup = document.getElementById('btnNewSetup');

      // Modal
      this.dom.hostAnswersModal = document.getElementById('hostAnswersModal');
      this.dom.btnCloseAnswerList = document.getElementById('btnCloseAnswerList');
      this.dom.modalSearchAnswer = document.getElementById('modalSearchAnswer');
      this.dom.answersGridList = document.getElementById('answersGridList');
    }

    bindEvents() {
      // Sound Toggle
      if (this.dom.btnSoundToggle) {
        this.dom.btnSoundToggle.addEventListener('click', () => {
          const enabled = window.gameAudio ? window.gameAudio.toggleSound() : true;
          this.dom.btnSoundToggle.textContent = enabled ? '🔊 Âm thanh: BẬT' : '🔇 Âm thanh: TẮT';
        });
      }

      // Host Spy Toggle always reveal
      if (this.dom.chkAlwaysShowCheat) {
        this.dom.chkAlwaysShowCheat.addEventListener('change', (e) => {
          if (e.target.checked) {
            this.dom.hostCheatBox.classList.remove('blur-mode');
            this.dom.hostCheatBox.classList.add('peek-always');
          } else {
            this.dom.hostCheatBox.classList.remove('peek-always');
            this.dom.hostCheatBox.classList.add('blur-mode');
          }
        });
      }

      // Open / Close Answers Modal
      if (this.dom.btnOpenAnswerList) {
        this.dom.btnOpenAnswerList.addEventListener('click', () => {
          this.dom.hostAnswersModal.classList.add('open');
          this.dom.modalSearchAnswer.focus();
        });
      }
      if (this.dom.btnCloseAnswerList) {
        this.dom.btnCloseAnswerList.addEventListener('click', () => {
          this.dom.hostAnswersModal.classList.remove('open');
        });
      }
      if (this.dom.modalSearchAnswer) {
        this.dom.modalSearchAnswer.addEventListener('input', (e) => {
          const query = e.target.value.toLowerCase().trim();
          this.filterModalAnswers(query);
        });
      }

      // Start Game
      if (this.dom.btnStartGame) {
        this.dom.btnStartGame.addEventListener('click', () => this.handleStartGame());
      }

      // Lift Curtain & Start Clock
      if (this.dom.btnCurtainStart) {
        this.dom.btnCurtainStart.addEventListener('click', () => this.unlockAndStartClock());
      }

      // Host Fast Actions: ĐÚNG / SAI
      if (this.dom.btnHostCorrect) {
        this.dom.btnHostCorrect.addEventListener('click', () => this.resolveQuestion(true, 'Khách trả lời ĐÚNG'));
      }
      if (this.dom.btnHostSkip) {
        this.dom.btnHostSkip.addEventListener('click', () => this.resolveQuestion(false, 'Khách trả lời SAI / Bỏ qua'));
      }

      // Next Question
      if (this.dom.btnNextQuestion) {
        this.dom.btnNextQuestion.addEventListener('click', () => this.nextQuestion());
      }

      // Summary Restart Buttons
      if (this.dom.btnPlayAgain) {
        this.dom.btnPlayAgain.addEventListener('click', () => this.restartGameSameSettings());
      }
      if (this.dom.btnNewSetup) {
        this.dom.btnNewSetup.addEventListener('click', () => this.showView('setup'));
      }

      // Global Keyboard Shortcuts for Streamer
      window.addEventListener('keydown', (e) => {
        // If modal open, Escape to close
        if (this.dom.hostAnswersModal.classList.contains('open')) {
          if (e.key === 'Escape') {
            this.dom.hostAnswersModal.classList.remove('open');
          }
          return;
        }

        const isInputFocused = document.activeElement === this.dom.inputPlayerName ||
                               document.activeElement === this.dom.inputPrizePerQ ||
                               document.activeElement === this.dom.modalSearchAnswer;

        if (this.dom.viewGameplay.classList.contains('active') && !isInputFocused) {
          // Space: Mở hình & tính giờ
          if (e.code === 'Space' && !this.isCurtainOpen) {
            e.preventDefault();
            this.unlockAndStartClock();
            return;
          }

          // D: Chấp nhận ĐÚNG
          if ((e.key === 'd' || e.key === 'D') && !this.isQuestionResolved && this.isCurtainOpen) {
            e.preventDefault();
            this.resolveQuestion(true, 'Khách trả lời ĐÚNG [D]');
            return;
          }

          // S: Đánh SAI / Bỏ qua
          if ((e.key === 's' || e.key === 'S') && !this.isQuestionResolved && this.isCurtainOpen) {
            e.preventDefault();
            this.resolveQuestion(false, 'Khách trả lời SAI [S]');
            return;
          }

          // N or Enter: Câu tiếp theo sau khi câu đã xong
          if ((e.key === 'n' || e.key === 'N' || e.key === 'Enter') && this.isQuestionResolved) {
            e.preventDefault();
            this.nextQuestion();
            return;
          }
        }
      });
    }

    renderFullAnswerModal() {
      const list = window.DHBC_QUESTIONS || [];
      let html = '';
      list.forEach(q => {
        html += `
          <div class="answer-item-card" data-phrase="${q.phrase.toLowerCase()}">
            <span class="num">#${q.id}</span>
            <span class="phrase">${q.phrase}</span>
            <span class="cat">(${q.category})</span>
          </div>
        `;
      });
      this.dom.answersGridList.innerHTML = html;
    }

    filterModalAnswers(query) {
      const cards = this.dom.answersGridList.querySelectorAll('.answer-item-card');
      cards.forEach(card => {
        const text = card.getAttribute('data-phrase') || '';
        card.style.display = text.includes(query) ? 'block' : 'none';
      });
    }

    showView(viewName) {
      this.dom.viewSetup.classList.remove('active');
      this.dom.viewGameplay.classList.remove('active');
      this.dom.viewSummary.classList.remove('active');

      if (viewName === 'setup') {
        this.dom.viewSetup.classList.add('active');
      } else if (viewName === 'gameplay') {
        this.dom.viewGameplay.classList.add('active');
      } else if (viewName === 'summary') {
        this.dom.viewSummary.classList.add('active');
      }
    }

    handleStartGame() {
      const name = this.dom.inputPlayerName.value.trim();
      this.playerName = name || 'Khách Mời';

      const countRadio = document.querySelector('input[name="qCount"]:checked');
      this.questionCount = countRadio ? parseInt(countRadio.value, 10) : 10;

      const timeRadio = document.querySelector('input[name="qTime"]:checked');
      this.questionDurationSeconds = timeRadio ? parseInt(timeRadio.value, 10) : 30;

      const prizeVal = parseInt(this.dom.inputPrizePerQ.value, 10);
      this.basePrizePerQuestion = (!isNaN(prizeVal) && prizeVal > 0) ? prizeVal : 10000;

      this.startGame();
    }

    startGame() {
      const allQuestions = window.DHBC_QUESTIONS || [];
      if (!allQuestions.length) {
        alert('Không tìm thấy dữ liệu câu hỏi!');
        return;
      }

      const shuffled = shuffle(allQuestions);
      const chosenCount = Math.min(this.questionCount, shuffled.length);
      this.pool = shuffled.slice(0, chosenCount);

      this.currentIndex = 0;
      this.totalWon = 0;
      this.correctCount = 0;
      this.unansweredCount = 0;
      this.history = [];

      this.dom.headerPlayerName.textContent = this.playerName;
      this.dom.matchPlayerName.textContent = this.playerName;
      this.dom.headerTotalPrize.textContent = formatMoney(0);
      this.dom.totalQNumber.textContent = this.pool.length;

      this.showView('gameplay');
      this.loadQuestion(0);
    }

    restartGameSameSettings() {
      this.startGame();
    }

    loadQuestion(index) {
      if (index >= this.pool.length) {
        this.finishGame();
        return;
      }

      this.currentIndex = index;
      this.currentQuestion = this.pool[index];
      this.isClockRunning = false;
      this.isCurtainOpen = false;
      this.isQuestionResolved = false;

      clearInterval(this.timerInterval);

      this.totalMs = this.questionDurationSeconds * 1000;
      this.remainingMs = this.totalMs;
      this.currentRunningPrize = this.basePrizePerQuestion;
      this.lastTickSecond = -1;

      // Update Header info
      this.dom.currentQNumber.textContent = (this.currentIndex + 1);
      this.dom.questionCategory.textContent = this.currentQuestion.category.toUpperCase();
      this.dom.clockNumber.textContent = this.questionDurationSeconds;
      this.dom.clockNumber.className = 'clock-number';
      this.dom.prizeAmount.textContent = formatMoney(this.basePrizePerQuestion);
      this.dom.timeBarFill.style.width = '100%';
      this.dom.timeBarFill.className = 'time-bar-fill';

      // CẬP NHẬT THANH SOI ĐÁP ÁN CHO HOST (Biết trước đáp án ngay lập tức)
      this.dom.hostCheatAnswer.textContent = `${this.currentQuestion.phrase} (${this.currentQuestion.category})`;

      // Insert SVG Artwork
      this.dom.svgArtContainer.innerHTML = this.currentQuestion.svg || '';

      // Render Word Underline Slots
      this.renderWordSlots(this.currentQuestion);

      // Disable Host judge buttons until curtain opens
      this.dom.btnHostCorrect.disabled = true;
      this.dom.btnHostSkip.disabled = true;

      this.dom.feedbackAlert.className = 'feedback-alert';
      this.dom.feedbackAlert.style.display = 'none';

      // Hide Explanation & Next button
      this.dom.explanationCard.className = 'explanation-card';
      this.dom.explanationCard.style.display = 'none';
      this.dom.postAnswerBar.style.display = 'none';

      // Lock Arena with Secret Curtain!
      this.dom.arenaCurtain.classList.remove('hidden');
    }

    renderWordSlots(q) {
      const words = q.words || q.phrase.split(/\s+/);
      this.dom.previewBadge.textContent = `💡 Gợi ý: ${words.length} từ • ${q.phrase.length} ký tự`;

      let html = '';
      words.forEach((w, idx) => {
        let blanks = '';
        for (let i = 0; i < w.length; i++) {
          blanks += `<div class="letter-blank"></div>`;
        }

        html += `
          <div class="word-slot" id="wordSlot_${idx}">
            <div class="letters-underline">${blanks}</div>
            <div class="word-text">${w}</div>
            <div class="letter-count">${w.length} chữ</div>
          </div>
        `;
      });

      this.dom.previewWordSlots.innerHTML = html;
    }

    unlockAndStartClock() {
      if (this.isCurtainOpen) return;
      this.isCurtainOpen = true;

      if (window.gameAudio) {
        window.gameAudio.playStart();
      }

      this.dom.arenaCurtain.classList.add('hidden');

      // Enable Host judge buttons
      this.dom.btnHostCorrect.disabled = false;
      this.dom.btnHostSkip.disabled = false;

      this.isClockRunning = true;
      const stepMs = 50;
      const startTime = performance.now();
      const initialRemaining = this.remainingMs;

      this.timerInterval = setInterval(() => {
        if (!this.isClockRunning) return;

        const elapsed = performance.now() - startTime;
        this.remainingMs = Math.max(0, initialRemaining - elapsed);

        // Deduct prize linearly: prize = Math.round(basePrize * (remainingMs / totalMs))
        const ratio = this.remainingMs / this.totalMs;
        this.currentRunningPrize = Math.max(0, Math.round(this.basePrizePerQuestion * ratio));
        this.dom.prizeAmount.textContent = formatMoney(this.currentRunningPrize);

        const secondsLeft = Math.ceil(this.remainingMs / 1000);
        this.dom.clockNumber.textContent = secondsLeft;

        const pct = Math.max(0, (this.remainingMs / this.totalMs) * 100);
        this.dom.timeBarFill.style.width = pct + '%';

        if (secondsLeft <= 5) {
          this.dom.clockNumber.className = 'clock-number urgent';
          this.dom.timeBarFill.className = 'time-bar-fill urgent';
        } else if (secondsLeft <= 10) {
          this.dom.clockNumber.className = 'clock-number warning';
          this.dom.timeBarFill.className = 'time-bar-fill warning';
        } else {
          this.dom.clockNumber.className = 'clock-number';
          this.dom.timeBarFill.className = 'time-bar-fill';
        }

        if (secondsLeft !== this.lastTickSecond && secondsLeft > 0) {
          this.lastTickSecond = secondsLeft;
          if (window.gameAudio) {
            window.gameAudio.playTick(secondsLeft <= 5);
          }
        }

        if (this.remainingMs <= 0) {
          clearInterval(this.timerInterval);
          this.resolveQuestion(false, 'HẾT THỜI GIAN 30S!');
        }
      }, stepMs);
    }

    resolveQuestion(isCorrect, reason) {
      if (this.isQuestionResolved) return;
      this.isQuestionResolved = true;
      this.isClockRunning = false;
      clearInterval(this.timerInterval);

      this.dom.btnHostCorrect.disabled = true;
      this.dom.btnHostSkip.disabled = true;

      // Reveal words in underline slots
      const wordSlots = this.dom.previewWordSlots.querySelectorAll('.word-slot');
      wordSlots.forEach(slot => slot.classList.add('revealed'));

      const prizeEarned = isCorrect ? this.currentRunningPrize : 0;
      const timeSpentSec = Math.round((this.totalMs - this.remainingMs) / 1000);

      if (isCorrect) {
        this.correctCount++;
        this.totalWon += prizeEarned;
        this.dom.headerTotalPrize.textContent = formatMoney(this.totalWon);

        if (window.gameAudio) window.gameAudio.playCorrect();

        this.dom.feedbackAlert.className = 'feedback-alert correct';
        this.dom.feedbackAlert.textContent = `🎉 CHÍNH XÁC! Nhận được +${formatMoney(prizeEarned)} (${reason})`;
        this.dom.feedbackAlert.style.display = 'block';
      } else {
        this.unansweredCount++;
        if (window.gameAudio) window.gameAudio.playWrong();

        this.dom.feedbackAlert.className = 'feedback-alert wrong';
        this.dom.feedbackAlert.textContent = `❌ ${reason} • Đáp án chính xác: "${this.currentQuestion.phrase}"`;
        this.dom.feedbackAlert.style.display = 'block';
      }

      this.history.push({
        index: this.currentIndex + 1,
        phrase: this.currentQuestion.phrase,
        category: this.currentQuestion.category,
        isCorrect: isCorrect,
        prizeEarned: prizeEarned,
        timeSpentSec: timeSpentSec
      });

      // Show explanation card
      this.dom.explanationPhrase.textContent = this.currentQuestion.phrase;
      this.dom.explanationText.textContent = this.currentQuestion.explanation || 'Ý nghĩa sâu sắc trong văn học dân gian Việt Nam.';
      this.dom.explanationCard.className = 'explanation-card active';
      this.dom.explanationCard.style.display = 'block';

      // Next button
      this.dom.postAnswerBar.style.display = 'flex';
      this.dom.btnNextQuestion.focus();
    }

    nextQuestion() {
      this.loadQuestion(this.currentIndex + 1);
    }

    finishGame() {
      if (window.gameAudio) window.gameAudio.playVictory();

      this.dom.summaryPlayerName.textContent = this.playerName;
      this.dom.summaryTotalWon.textContent = formatMoney(this.totalWon);
      this.dom.summaryCorrectCount.textContent = `${this.correctCount} / ${this.pool.length}`;

      const pct = Math.round((this.correctCount / this.pool.length) * 100) || 0;
      this.dom.summaryCorrectPercent.textContent = `Đạt ${pct}%`;

      this.dom.summaryUnansweredCount.textContent = `${this.unansweredCount} câu`;

      const totalSec = this.history.reduce((acc, h) => acc + h.timeSpentSec, 0);
      const avgSec = this.history.length ? (totalSec / this.history.length).toFixed(1) : 0;
      this.dom.summaryAvgTime.textContent = `${avgSec}s / câu`;

      let tableHtml = '';
      this.history.forEach(h => {
        tableHtml += `
          <tr>
            <td><strong>#${h.index}</strong></td>
            <td><strong>${h.phrase}</strong> <span style="font-size: 11px; color: var(--text-secondary);">(${h.category})</span></td>
            <td>
              <span class="tag-res ${h.isCorrect ? 'win' : 'fail'}">
                ${h.isCorrect ? '✓ Đúng' : '✗ Chưa trả lời'}
              </span>
            </td>
            <td>${h.timeSpentSec}s</td>
            <td style="font-weight: 800; color: ${h.isCorrect ? 'var(--accent-lime)' : 'var(--text-secondary)'};">
              +${formatMoney(h.prizeEarned)}
            </td>
          </tr>
        `;
      });
      this.dom.summaryTableBody.innerHTML = tableHtml;

      this.showView('summary');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new DHBCGame();
    window.gameInstance.init();
  });
})();
