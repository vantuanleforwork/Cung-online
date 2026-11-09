/**
 * Đuổi Hình Bắt Chữ - Livestream Game Show Engine
 * Quản lý vòng đời trò chơi, đồng hồ đếm ngược trừ dần tiền thưởng,
 * gạch chân đáp án preview theo số từ, che phủ chống xem trước,
 * chấm điểm tự động & thủ công cho host, và màn hình tổng kết.
 */

(function () {
  'use strict';

  // Helper formatting currency
  function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  }

  // Remove accents for fuzzy check
  function normalizeStr(str) {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "a");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "e");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "i");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "o");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "u");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "y");
    str = str.replace(/Đ/g, "d");
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
    str = str.replace(/\u02C6|\u0306|\u031B/g, "");
    return str.replace(/[^a-zA-Z0-9]/g, "").trim().toLowerCase();
  }

  // Shuffle array utility
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
      // Game Configuration
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
      this.history = []; // { id, phrase, result: 'correct'|'unanswered', prize, timeUsed }

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

      // Controls & Input
      this.dom.answerInput = document.getElementById('answerInput');
      this.dom.btnSubmitAnswer = document.getElementById('btnSubmitAnswer');
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
    }

    bindEvents() {
      // Sound Toggle
      if (this.dom.btnSoundToggle) {
        this.dom.btnSoundToggle.addEventListener('click', () => {
          const enabled = window.gameAudio ? window.gameAudio.toggleSound() : true;
          this.dom.btnSoundToggle.textContent = enabled ? '🔊 Âm thanh: BẬT' : '🔇 Âm thanh: TẮT';
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

      // Submit Input Answer
      if (this.dom.btnSubmitAnswer) {
        this.dom.btnSubmitAnswer.addEventListener('click', () => this.checkInputAnswer());
      }
      if (this.dom.answerInput) {
        this.dom.answerInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.checkInputAnswer();
          }
        });
      }

      // Host Quick Actions
      if (this.dom.btnHostCorrect) {
        this.dom.btnHostCorrect.addEventListener('click', () => this.resolveQuestion(true, 'Host duyệt đúng'));
      }
      if (this.dom.btnHostSkip) {
        this.dom.btnHostSkip.addEventListener('click', () => this.resolveQuestion(false, 'Host bỏ qua / Hết giờ'));
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
        // If typing in input, let normal typing happen (except shortcuts when not focused)
        const isInputFocused = document.activeElement === this.dom.answerInput || 
                               document.activeElement === this.dom.inputPlayerName ||
                               document.activeElement === this.dom.inputPrizePerQ;

        if (this.dom.viewGameplay.classList.contains('active')) {
          // Space to unlock curtain if not running
          if (e.code === 'Space' && !this.isCurtainOpen && !isInputFocused) {
            e.preventDefault();
            this.unlockAndStartClock();
            return;
          }

          // Hotkey D: Accept Correct (only if clock running or curtain open, and not currently typing text)
          if ((e.key === 'd' || e.key === 'D') && !isInputFocused && !this.isQuestionResolved && this.isCurtainOpen) {
            e.preventDefault();
            this.resolveQuestion(true, 'Host phím tắt [D]');
            return;
          }

          // Hotkey S: Skip / Show answer
          if ((e.key === 's' || e.key === 'S') && !isInputFocused && !this.isQuestionResolved && this.isCurtainOpen) {
            e.preventDefault();
            this.resolveQuestion(false, 'Host phím tắt [S]');
            return;
          }

          // Hotkey N or Enter: Next Question if already resolved
          if ((e.key === 'n' || e.key === 'N' || (e.key === 'Enter' && !isInputFocused)) && this.isQuestionResolved) {
            e.preventDefault();
            this.nextQuestion();
            return;
          }
        }
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
      // Read setup values
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
      // Prepare pool from DHBC_QUESTIONS
      const allQuestions = window.DHBC_QUESTIONS || [];
      if (!allQuestions.length) {
        alert('Không tìm thấy dữ liệu câu hỏi!');
        return;
      }

      const shuffled = shuffle(allQuestions);
      const chosenCount = Math.min(this.questionCount, shuffled.length);
      this.pool = shuffled.slice(0, chosenCount);

      // Reset match state
      this.currentIndex = 0;
      this.totalWon = 0;
      this.correctCount = 0;
      this.unansweredCount = 0;
      this.history = [];

      // Update Top Bar
      this.dom.headerPlayerName.textContent = this.playerName;
      this.dom.matchPlayerName.textContent = this.playerName;
      this.dom.headerTotalPrize.textContent = formatMoney(0);
      this.dom.totalQNumber.textContent = this.pool.length;

      // Show gameplay view & load first question
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

      // Reset timers
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

      // Insert SVG Artwork
      this.dom.svgArtContainer.innerHTML = this.currentQuestion.svg || '';

      // Render Word Underline Slots (Preview)
      this.renderWordSlots(this.currentQuestion);

      // Reset controls
      this.dom.answerInput.value = '';
      this.dom.answerInput.disabled = true;
      this.dom.btnSubmitAnswer.disabled = true;
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
        // Underline blanks for each letter
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

      // Sound
      if (window.gameAudio) {
        window.gameAudio.playStart();
      }

      // Hide Curtain
      this.dom.arenaCurtain.classList.add('hidden');

      // Enable Controls
      this.dom.answerInput.disabled = false;
      this.dom.btnSubmitAnswer.disabled = false;
      this.dom.btnHostCorrect.disabled = false;
      this.dom.btnHostSkip.disabled = false;
      this.dom.answerInput.focus();

      // Start countdown timer
      this.isClockRunning = true;
      const stepMs = 50; // Smooth tick
      const startTime = performance.now();
      const initialRemaining = this.remainingMs;

      this.timerInterval = setInterval(() => {
        if (!this.isClockRunning) return;

        const elapsed = performance.now() - startTime;
        this.remainingMs = Math.max(0, initialRemaining - elapsed);

        // Calculate running prize: currentPrize = Math.round(basePrize * (remainingMs / totalMs))
        const ratio = this.remainingMs / this.totalMs;
        this.currentRunningPrize = Math.max(0, Math.round(this.basePrizePerQuestion * ratio));
        this.dom.prizeAmount.textContent = formatMoney(this.currentRunningPrize);

        // Update Clock seconds display
        const secondsLeft = Math.ceil(this.remainingMs / 1000);
        this.dom.clockNumber.textContent = secondsLeft;

        // Progress bar width
        const pct = Math.max(0, (this.remainingMs / this.totalMs) * 100);
        this.dom.timeBarFill.style.width = pct + '%';

        // Warning & Urgent color changes
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

        // Tick sound every integer second
        if (secondsLeft !== this.lastTickSecond && secondsLeft > 0) {
          this.lastTickSecond = secondsLeft;
          if (window.gameAudio) {
            window.gameAudio.playTick(secondsLeft <= 5);
          }
        }

        // Time's up!
        if (this.remainingMs <= 0) {
          clearInterval(this.timerInterval);
          this.resolveQuestion(false, 'HẾT GIỜ!');
        }
      }, stepMs);
    }

    checkInputAnswer() {
      if (!this.isCurtainOpen || this.isQuestionResolved) return;
      const userText = this.dom.answerInput.value.trim();
      if (!userText) return;

      const normUser = normalizeStr(userText);
      const acceptedList = this.currentQuestion.accepted || [];
      const exactMatch = acceptedList.some(acc => normalizeStr(acc) === normUser);

      if (exactMatch) {
        this.resolveQuestion(true, 'Chính xác tuyệt vời!');
      } else {
        // Shake feedback alert
        if (window.gameAudio) window.gameAudio.playWrong();
        this.dom.feedbackAlert.className = 'feedback-alert wrong';
        this.dom.feedbackAlert.textContent = '❌ Chưa chính xác, hãy tiếp tục đoán nhanh!';
        this.dom.feedbackAlert.style.display = 'block';

        // Clear input for another attempt
        this.dom.answerInput.value = '';
        this.dom.answerInput.focus();
      }
    }

    resolveQuestion(isCorrect, reason) {
      if (this.isQuestionResolved) return;
      this.isQuestionResolved = true;
      this.isClockRunning = false;
      clearInterval(this.timerInterval);

      // Disable inputs
      this.dom.answerInput.disabled = true;
      this.dom.btnSubmitAnswer.disabled = true;
      this.dom.btnHostCorrect.disabled = true;
      this.dom.btnHostSkip.disabled = true;

      // Reveal all word slots
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
        this.dom.feedbackAlert.textContent = `🎉 CHÍNH XÁC! Bạn nhận được +${formatMoney(prizeEarned)} (${reason})`;
        this.dom.feedbackAlert.style.display = 'block';
      } else {
        this.unansweredCount++;
        if (window.gameAudio) window.gameAudio.playWrong();

        this.dom.feedbackAlert.className = 'feedback-alert wrong';
        this.dom.feedbackAlert.textContent = `❌ ${reason} • Đáp án chính xác là: "${this.currentQuestion.phrase}"`;
        this.dom.feedbackAlert.style.display = 'block';
      }

      // Record History
      this.history.push({
        index: this.currentIndex + 1,
        phrase: this.currentQuestion.phrase,
        category: this.currentQuestion.category,
        isCorrect: isCorrect,
        prizeEarned: prizeEarned,
        timeSpentSec: timeSpentSec
      });

      // Show cultural explanation / allusions card
      this.dom.explanationPhrase.textContent = this.currentQuestion.phrase;
      this.dom.explanationText.textContent = this.currentQuestion.explanation || 'Một câu nói mang ý nghĩa sâu sắc trong kho tàng dân gian Việt Nam.';
      this.dom.explanationCard.className = 'explanation-card active';
      this.dom.explanationCard.style.display = 'block';

      // Show Next Question action bar
      this.dom.postAnswerBar.style.display = 'flex';
      this.dom.btnNextQuestion.focus();
    }

    nextQuestion() {
      this.loadQuestion(this.currentIndex + 1);
    }

    finishGame() {
      // Victory fanfare
      if (window.gameAudio) window.gameAudio.playVictory();

      // Render Summary View
      this.dom.summaryPlayerName.textContent = this.playerName;
      this.dom.summaryTotalWon.textContent = formatMoney(this.totalWon);
      this.dom.summaryCorrectCount.textContent = `${this.correctCount} / ${this.pool.length}`;

      const pct = Math.round((this.correctCount / this.pool.length) * 100) || 0;
      this.dom.summaryCorrectPercent.textContent = `Đạt ${pct}%`;

      this.dom.summaryUnansweredCount.textContent = `${this.unansweredCount} câu`;

      // Calculate Average time
      const totalSec = this.history.reduce((acc, h) => acc + h.timeSpentSec, 0);
      const avgSec = this.history.length ? (totalSec / this.history.length).toFixed(1) : 0;
      this.dom.summaryAvgTime.textContent = `${avgSec}s / câu`;

      // Build Table
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

      // Show summary view
      this.showView('summary');
    }
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new DHBCGame();
    window.gameInstance.init();
  });
})();
