/**
 * Full visual scenes generator for 62 DHBC Questions
 */
const fs = require('fs');
const path = require('path');

// Read the base question definitions
const scriptPath = path.join(__dirname, 'build-dhbc-data.js');
let scriptCode = fs.readFileSync(scriptPath, 'utf8');

// Replace the renderSpecificScene function with full implementations for 1..62
const renderSceneCode = `
function renderSpecificScene(q) {
  switch(q.id) {
    case 1: // Ếch ngồi đáy giếng
      return \`
        <ellipse cx="300" cy="85" rx="90" ry="22" fill="#29445c" stroke="#c5f467" stroke-width="4" />
        <ellipse cx="300" cy="85" rx="70" ry="16" fill="#38bdf8" />
        <path d="M 210 85 L 170 270 L 430 270 L 390 85 Z" fill="#152637" stroke="#3a5268" stroke-width="3" />
        <ellipse cx="300" cy="270" rx="130" ry="22" fill="#0e1b27" />
        <circle cx="300" cy="235" r="38" fill="#22c55e" stroke="#15803d" stroke-width="3" />
        <circle cx="282" cy="205" r="14" fill="#22c55e" stroke="#15803d" stroke-width="2" />
        <circle cx="318" cy="205" r="14" fill="#22c55e" stroke="#15803d" stroke-width="2" />
        <circle cx="282" cy="205" r="7" fill="#fff" /><circle cx="318" cy="205" r="7" fill="#fff" />
        <circle cx="282" cy="201" r="3.5" fill="#000" /><circle cx="318" cy="201" r="3.5" fill="#000" />
        <path d="M 285 242 Q 300 252 315 242" stroke="#14532d" stroke-width="3" fill="none" />
        <path d="M 300 185 L 300 130" stroke="#ffd084" stroke-width="3" stroke-dasharray="6,4" />
        <polygon points="295,130 305,130 300,118" fill="#ffd084" />
      \`;
    case 2: // Nước đổ đầu vịt
      return \`
        <ellipse cx="280" cy="230" rx="65" ry="45" fill="#facc15" stroke="#ca8a04" stroke-width="3" />
        <circle cx="330" cy="180" r="35" fill="#facc15" stroke="#ca8a04" stroke-width="3" />
        <circle cx="340" cy="172" r="6" fill="#000" /><circle cx="342" cy="170" r="2" fill="#fff" />
        <path d="M 360 178 L 410 188 L 360 198 Z" fill="#f97316" stroke="#c2410c" stroke-width="2" />
        <path d="M 280 80 L 360 80 L 345 125 L 295 125 Z" fill="#64748b" stroke="#94a3b8" stroke-width="3" transform="rotate(25, 320, 100)" />
        <path d="M 345 105 Q 350 150 335 170" stroke="#38bdf8" stroke-width="12" fill="none" stroke-linecap="round" />
        <circle cx="370" cy="165" r="5" fill="#38bdf8" /><circle cx="385" cy="178" r="6" fill="#38bdf8" />
        <circle cx="365" cy="210" r="7" fill="#38bdf8" /><circle cx="310" cy="155" r="5" fill="#38bdf8" />
        <path d="M 320 160 Q 338 175 315 200" stroke="#c5f467" stroke-width="4" fill="none" stroke-linecap="round" />
      \`;
    case 3: // Đàn gảy tai trâu
      return \`
        <ellipse cx="370" cy="210" rx="85" ry="60" fill="#334155" stroke="#1e293b" stroke-width="3" />
        <circle cx="410" cy="160" r="45" fill="#334155" stroke="#1e293b" stroke-width="3" />
        <ellipse cx="400" cy="125" rx="18" ry="32" fill="#475569" stroke="#1e293b" stroke-width="3" transform="rotate(-20, 400, 125)" />
        <path d="M 430 145 Q 490 100 440 85" stroke="#cbd5e1" stroke-width="8" fill="none" stroke-linecap="round" />
        <circle cx="430" cy="155" r="5" fill="#000" />
        <path d="M 445 175 L 490 195 M 445 180 L 485 185 M 445 185 L 495 175" stroke="#22c55e" stroke-width="4" stroke-linecap="round" />
        <ellipse cx="190" cy="220" rx="38" ry="55" fill="#b45309" stroke="#78350f" stroke-width="4" />
        <rect x="183" y="100" width="14" height="80" rx="4" fill="#d97706" stroke="#78350f" stroke-width="3" />
        <circle cx="190" cy="95" r="14" fill="#b45309" />
        <path d="M 190 100 L 190 260" stroke="#fef08a" stroke-width="2" />
        <text x="245" y="160" fill="#c5f467" font-size="28">🎵</text>
        <text x="295" y="130" fill="#ffd084" font-size="28">🎶</text>
        <path d="M 320 135 L 380 125" stroke="#c5f467" stroke-width="3" stroke-dasharray="4,4" />
      \`;
    case 4: // Môi hở răng lạnh
      return \`
        <path d="M 180 170 Q 300 110 420 170 Q 300 150 180 170 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="3" />
        <path d="M 180 190 Q 300 210 420 190 Q 300 270 180 190 Z" fill="#dc2626" stroke="#991b1b" stroke-width="3" />
        <rect x="230" y="160" width="140" height="42" rx="4" fill="#0f172a" />
        <rect x="240" y="163" width="22" height="18" rx="3" fill="#f8fafc" stroke="#cbd5e1" />
        <rect x="265" y="163" width="22" height="18" rx="3" fill="#f8fafc" stroke="#cbd5e1" />
        <rect x="290" y="163" width="22" height="18" rx="3" fill="#f8fafc" stroke="#cbd5e1" />
        <rect x="315" y="163" width="22" height="18" rx="3" fill="#f8fafc" stroke="#cbd5e1" />
        <rect x="340" y="163" width="22" height="18" rx="3" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="235" y="145" fill="#38bdf8" font-size="34">❄</text>
        <text x="350" y="235" fill="#38bdf8" font-size="30">❄</text>
        <path d="M 140 180 Q 200 170 230 180" stroke="#38bdf8" stroke-width="4" stroke-dasharray="6,4" />
      \`;
    case 5: // Cõng rắn cắn gà nhà
      return \`
        <rect x="380" y="120" width="160" height="140" rx="8" fill="#1e293b" stroke="#475569" stroke-width="3" />
        <polygon points="370,120 460,70 550,120" fill="#b45309" stroke="#78350f" stroke-width="3" />
        <text x="460" y="145" fill="#ffd084" font-size="14" font-weight="bold" text-anchor="middle">NHÀ</text>
        <circle cx="460" cy="200" r="24" fill="#f59e0b" stroke="#d97706" stroke-width="2" />
        <text x="448" y="208" font-size="24">🐔</text>
        <circle cx="210" cy="150" r="22" fill="#cbd5e1" />
        <path d="M 210 172 L 210 240 L 180 280 M 210 240 L 235 280" stroke="#cbd5e1" stroke-width="6" stroke-linecap="round" />
        <path d="M 160 210 Q 200 170 240 180 Q 320 160 380 180 Q 420 190 450 195" stroke="#22c55e" stroke-width="12" fill="none" stroke-linecap="round" />
        <polygon points="448,188 465,195 448,202" fill="#15803d" />
      \`;
    case 6: // Vỏ quýt dày có móng tay nhọn
      return \`
        <circle cx="240" cy="190" r="90" fill="#f97316" stroke="#c2410c" stroke-width="4" />
        <circle cx="240" cy="190" r="70" fill="#fdba74" stroke="#ea580c" stroke-width="14" />
        <circle cx="240" cy="190" r="56" fill="#ffedd5" />
        <path d="M 240 190 L 275 160 M 240 190 L 275 220 M 240 190 L 220 230" stroke="#f97316" stroke-width="3" />
        <path d="M 460 140 L 350 170 L 320 175" stroke="#cbd5e1" stroke-width="18" stroke-linecap="round" />
        <polygon points="325,160 275,175 325,188" fill="#c5f467" stroke="#84cc16" stroke-width="2" />
      \`;
    case 7: // Cá chép hoá rồng
      return \`
        <rect x="180" y="160" width="240" height="120" rx="8" fill="#0284c7" stroke="#38bdf8" stroke-width="3" opacity="0.6" />
        <path d="M 190 200 Q 240 220 300 200 Q 360 180 410 200" stroke="#bae6fd" stroke-width="5" fill="none" />
        <ellipse cx="230" cy="170" rx="45" ry="25" fill="#f97316" stroke="#c2410c" stroke-width="3" transform="rotate(-30, 230, 170)" />
        <polygon points="175,190 150,170 150,210" fill="#ea580c" />
        <path d="M 270 150 Q 330 110 390 120" stroke="#eab308" stroke-width="22" fill="none" stroke-linecap="round" />
        <polygon points="390,105 430,120 390,135" fill="#ca8a04" />
        <path d="M 405 105 Q 415 80 435 75" stroke="#c5f467" stroke-width="5" fill="none" />
        <circle cx="460" cy="120" r="14" fill="#ffd084" stroke="#f59e0b" stroke-width="3" />
      \`;
    case 8: // Lá lành đùm lá rách
      return \`
        <path d="M 150 200 C 150 110 300 90 440 180 C 420 280 260 290 150 200 Z" fill="#22c55e" stroke="#15803d" stroke-width="4" />
        <path d="M 150 200 Q 290 180 440 180" stroke="#166534" stroke-width="3" fill="none" />
        <path d="M 220 200 C 230 160 310 150 370 190 C 350 230 280 230 220 200 Z" fill="#eab308" stroke="#a16207" stroke-width="2" />
        <polygon points="280,165 295,185 285,185" fill="#22c55e" />
        <rect x="290" y="125" width="16" height="140" rx="4" fill="#ffd084" stroke="#d97706" stroke-width="2" opacity="0.8" />
      \`;
    case 9: // Đục nước béo cò
      return \`
        <rect x="120" y="180" width="360" height="110" rx="10" fill="#78350f" stroke="#92400e" stroke-width="3" opacity="0.85" />
        <ellipse cx="220" cy="205" rx="18" ry="9" fill="#94a3b8" />
        <ellipse cx="370" cy="150" rx="42" ry="32" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3" />
        <polygon points="425,95 495,115 425,108" fill="#f59e0b" stroke="#d97706" stroke-width="2" />
        <circle cx="360" cy="165" r="24" fill="#e2e8f0" />
        <line x1="360" y1="180" x2="360" y2="250" stroke="#f59e0b" stroke-width="4" />
      \`;
    case 10: // Gắp lửa bỏ tay người
      return \`
        <line x1="160" y1="110" x2="280" y2="180" stroke="#b45309" stroke-width="6" stroke-linecap="round" />
        <line x1="160" y1="130" x2="280" y2="195" stroke="#b45309" stroke-width="6" stroke-linecap="round" />
        <circle cx="295" cy="188" r="22" fill="#dc2626" stroke="#b91c1c" stroke-width="3" />
        <path d="M 440 250 L 370 230 L 330 220 L 320 195" stroke="#cbd5e1" stroke-width="14" stroke-linecap="round" />
        <text x="360" y="160" fill="#ef4444" font-size="28">🔥</text>
      \`;
    case 11: // Bút sa gà chết
      return \`
        <!-- Cây bút máy sa xuống -->
        <path d="M 190 70 L 230 190 L 210 215 L 180 180 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="3" />
        <polygon points="210,215 200,245 220,225" fill="#facc15" stroke="#b45309" />
        <circle cx="200" cy="250" r="12" fill="#000" />
        <!-- Tờ giấy có chữ ký -->
        <rect x="150" y="240" width="130" height="40" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
        <path d="M 165 260 Q 185 245 210 260 T 260 260" stroke="#000" stroke-width="2" fill="none" />
        <!-- Con gà lăn đùng ngã ngửa -->
        <ellipse cx="400" cy="230" rx="55" ry="35" fill="#f97316" stroke="#c2410c" stroke-width="3" />
        <circle cx="350" cy="225" r="24" fill="#f97316" />
        <text x="342" y="232" font-size="20">✖‿✖</text>
        <line x1="410" y1="210" x2="410" y2="160" stroke="#f59e0b" stroke-width="4" />
        <line x1="390" y1="210" x2="390" y2="160" stroke="#f59e0b" stroke-width="4" />
      \`;
    case 12: // Tre già măng mọc
      return \`
        <!-- Thân tre già cong che chở -->
        <path d="M 220 280 C 220 180 240 100 290 70" stroke="#15803d" stroke-width="24" fill="none" stroke-linecap="round" />
        <line x1="208" y1="220" x2="232" y2="220" stroke="#052e16" stroke-width="3" />
        <line x1="218" y1="160" x2="242" y2="160" stroke="#052e16" stroke-width="3" />
        <line x1="238" y1="110" x2="262" y2="110" stroke="#052e16" stroke-width="3" />
        <!-- Búp măng non nhọn hoắt nhú lên -->
        <polygon points="360,280 430,280 395,150" fill="#84cc16" stroke="#4d7c0f" stroke-width="3" />
        <polygon points="370,250 420,250 395,170" fill="#a3e635" />
        <polygon points="380,210 410,210 395,180" fill="#c5f467" />
        <text x="395" y="130" fill="#c5f467" font-size="24" text-anchor="middle">🌱</text>
      \`;
    case 13: // Khắc cốt ghi tâm
      return \`
        <!-- Khúc xương trắng -->
        <path d="M 180 180 L 420 180" stroke="#e2e8f0" stroke-width="26" stroke-linecap="round" />
        <circle cx="180" cy="165" r="16" fill="#e2e8f0" /><circle cx="180" cy="195" r="16" fill="#e2e8f0" />
        <circle cx="420" cy="165" r="16" fill="#e2e8f0" /><circle cx="420" cy="195" r="16" fill="#e2e8f0" />
        <!-- Trái tim đỏ ở giữa -->
        <path d="M 300 220 C 230 160 250 110 300 145 C 350 110 370 160 300 220 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="3" />
        <!-- Mũi dao khắc chữ ƠN sáng rực -->
        <polygon points="300,165 330,120 315,115" fill="#facc15" stroke="#ca8a04" stroke-width="2" />
        <text x="300" y="180" fill="#ffffff" font-family="'Segoe UI', Arial" font-size="20" font-weight="900" text-anchor="middle">ƠN</text>
      \`;
    case 14: // Cờ bạc là bác thằng bần
      return \`
        <!-- Cặp xúc xắc đỏ đen -->
        <rect x="180" y="120" width="60" height="60" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3" />
        <circle cx="210" cy="150" r="8" fill="#ef4444" />
        <rect x="230" y="150" width="60" height="60" rx="8" fill="#ef4444" stroke="#b91c1c" stroke-width="3" />
        <circle cx="245" cy="165" r="5" fill="#fff" /><circle cx="275" cy="195" r="5" fill="#fff" />
        <!-- Mũi tên chỉ lối đến bần hàn -->
        <path d="M 310 170 L 370 170" stroke="#ffd084" stroke-width="6" stroke-linecap="round" />
        <polygon points="370,160 395,170 370,180" fill="#ffd084" />
        <!-- Anh chàng ăn mày rách rưới cầm gậy -->
        <circle cx="440" cy="140" r="20" fill="#cbd5e1" />
        <path d="M 440 160 L 440 230 L 420 270 M 440 230 L 460 270" stroke="#94a3b8" stroke-width="6" stroke-linecap="round" />
        <line x1="465" y1="180" x2="475" y2="270" stroke="#b45309" stroke-width="4" />
        <text x="410" y="220" font-size="24">🏚️</text>
      \`;
    case 15: // Ngưu tầm ngưu mã tầm mã
      return \`
        <!-- Bên trái: 2 chú trâu bên nhau -->
        <g transform="translate(140, 140)">
          <ellipse cx="40" cy="50" rx="35" ry="25" fill="#475569" />
          <ellipse cx="85" cy="50" rx="35" ry="25" fill="#334155" />
          <text x="60" y="55" font-size="32" text-anchor="middle">🐂🐂</text>
          <text x="60" y="95" fill="#ffd084" font-weight="bold" font-size="14" text-anchor="middle">NGƯU TẦM NGƯU</text>
        </g>
        <!-- Bên phải: 2 chú ngựa sát cánh -->
        <g transform="translate(340, 140)">
          <ellipse cx="40" cy="50" rx="35" ry="25" fill="#b45309" />
          <ellipse cx="85" cy="50" rx="35" ry="25" fill="#92400e" />
          <text x="60" y="55" font-size="32" text-anchor="middle">🐎🐎</text>
          <text x="60" y="95" fill="#c5f467" font-weight="bold" font-size="14" text-anchor="middle">MÃ TẦM MÃ</text>
        </g>
      \`;
    case 16: // Há miệng chờ sung
      return \`
        <!-- Người nằm ngửa há mồm -->
        <path d="M 180 260 L 260 260 L 320 230" stroke="#cbd5e1" stroke-width="12" stroke-linecap="round" />
        <circle cx="340" cy="220" r="26" fill="#fed7aa" />
        <!-- Miệng mở tròn xoe -->
        <ellipse cx="340" cy="205" rx="14" ry="12" fill="#991b1b" stroke="#7f1d1d" stroke-width="2" />
        <!-- Cành sung trĩu quả phía trên -->
        <path d="M 240 70 Q 330 90 440 60" stroke="#78350f" stroke-width="10" stroke-linecap="round" />
        <circle cx="330" cy="100" r="16" fill="#a855f7" stroke="#7e22ce" stroke-width="2" />
        <circle cx="360" cy="105" r="16" fill="#9333ea" stroke="#7e22ce" stroke-width="2" />
        <!-- Quả sung đang rụng rơi thẳng mồm -->
        <circle cx="340" cy="155" r="14" fill="#a855f7" stroke="#ffd084" stroke-width="3" />
        <line x1="340" y1="120" x2="340" y2="140" stroke="#ffd084" stroke-width="2" stroke-dasharray="3,3" />
      \`;
    case 17: // Mèo mù vớ cá rán
      return \`
        <!-- Mèo đeo kính râm đen -->
        <ellipse cx="230" cy="200" rx="55" ry="45" fill="#fb923c" stroke="#c2410c" stroke-width="3" />
        <polygon points="190,165 210,130 225,165" fill="#ea580c" />
        <polygon points="235,165 250,130 270,165" fill="#ea580c" />
        <!-- Cặp kính râm đen thui -->
        <rect x="200" y="185" width="26" height="18" rx="4" fill="#000" stroke="#38bdf8" stroke-width="2" />
        <rect x="235" y="185" width="26" height="18" rx="4" fill="#000" stroke="#38bdf8" stroke-width="2" />
        <line x1="226" y1="194" x2="235" y2="194" stroke="#38bdf8" stroke-width="2" />
        <!-- Đĩa cá rán vàng giòn bốc khói thơm -->
        <ellipse cx="390" cy="230" rx="75" ry="24" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3" />
        <ellipse cx="390" cy="225" rx="50" ry="18" fill="#eab308" stroke="#ca8a04" stroke-width="3" />
        <polygon points="440,225 465,215 465,235" fill="#eab308" />
        <path d="M 370 200 Q 380 170 370 150 M 400 200 Q 410 170 400 150" stroke="#ffd084" stroke-width="3" fill="none" />
      \`;
    case 18: // Nuôi ong tay áo
      return \`
        <!-- Ống tay áo lụa rộng -->
        <path d="M 180 120 L 320 140 L 290 270 L 150 250 Z" fill="#b91c1c" stroke="#7f1d1d" stroke-width="4" />
        <ellipse cx="220" cy="260" rx="70" ry="22" fill="#7f1d1d" />
        <!-- Tổ ong ẩn bên trong nếp áo -->
        <circle cx="210" cy="200" r="32" fill="#f59e0b" stroke="#b45309" stroke-width="3" />
        <!-- Bầy ong vàng đen bay túa ra từ cổ tay -->
        <text x="240" y="275" font-size="28">🐝</text>
        <text x="310" y="250" font-size="28">🐝</text>
        <text x="360" y="280" font-size="34">🐝</text>
        <path d="M 370 260 L 410 240" stroke="#ef4444" stroke-width="3" stroke-dasharray="3,3" />
        <text x="420" y="240" fill="#ef4444" font-size="20">⚡</text>
      \`;
    case 19: // Ném đá giấu tay
      return \`
        <!-- Hòn đá vút bay bên phải -->
        <circle cx="430" cy="140" r="28" fill="#64748b" stroke="#334155" stroke-width="3" />
        <path d="M 330 180 Q 380 150 400 140" stroke="#38bdf8" stroke-width="4" stroke-dasharray="5,4" />
        <!-- Bàn tay giấu tịt sau lưng -->
        <circle cx="230" cy="140" r="26" fill="#cbd5e1" />
        <path d="M 230 166 L 230 250 L 200 285" stroke="#cbd5e1" stroke-width="8" stroke-linecap="round" />
        <path d="M 230 190 Q 200 210 180 230" stroke="#cbd5e1" stroke-width="8" stroke-linecap="round" />
        <!-- Bàn tay quặt sau lưng -->
        <rect x="160" y="215" width="28" height="24" rx="6" fill="#cbd5e1" stroke="#94a3b8" />
        <text x="270" y="145" font-size="26">😇❓</text>
      \`;
    case 20: // Thùng rỗng kêu to
      return \`
        <!-- Chiếc thùng phuy gỗ rỗng ruột mở nắp -->
        <ellipse cx="240" cy="130" rx="65" ry="24" fill="#0f172a" stroke="#b45309" stroke-width="4" />
        <path d="M 175 130 L 175 250 A 65 24 0 0 0 305 250 L 305 130 Z" fill="#b45309" stroke="#78350f" stroke-width="3" />
        <line x1="175" y1="180" x2="305" y2="180" stroke="#000" stroke-width="4" />
        <!-- Rỗng tuếch bên trong -->
        <text x="240" y="170" fill="#a6b5c6" font-size="12" font-weight="bold" text-anchor="middle">RỖNG KHÔNG</text>
        <!-- Sóng âm thanh cực lớn bùng nổ -->
        <path d="M 330 150 Q 380 180 330 210" stroke="#c5f467" stroke-width="6" fill="none" />
        <path d="M 355 130 Q 425 180 355 230" stroke="#c5f467" stroke-width="8" fill="none" />
        <path d="M 380 110 Q 470 180 380 250" stroke="#ffd084" stroke-width="10" fill="none" />
        <text x="440" y="185" fill="#ffd084" font-weight="900" font-size="22">BOONG!</text>
      \`;
    case 21: // Đao to búa lớn
      return \`
        <!-- Cây đại đao sáng loáng bắt chéo -->
        <path d="M 170 270 L 390 100 L 420 80 L 390 130 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="4" />
        <line x1="140" y1="290" x2="200" y2="240" stroke="#b45309" stroke-width="12" stroke-linecap="round" />
        <!-- Cây búa tạ sấm sét tày đình -->
        <line x1="420" y1="280" x2="210" y2="100" stroke="#78350f" stroke-width="12" stroke-linecap="round" />
        <rect x="180" y="70" width="75" height="50" rx="8" fill="#64748b" stroke="#334155" stroke-width="4" transform="rotate(-35, 215, 95)" />
        <text x="300" y="190" fill="#ffd084" font-size="34">⚡</text>
      \`;
    case 22: // Uống nước nhớ nguồn
      return \`
        <!-- Người cúi uống nước bên bờ suối -->
        <ellipse cx="200" cy="240" rx="30" ry="18" fill="#cbd5e1" />
        <path d="M 220 235 L 240 245" stroke="#f59e0b" stroke-width="4" />
        <!-- Dòng suối uốn lượn -->
        <path d="M 230 250 Q 300 230 330 190 Q 360 150 410 130" stroke="#38bdf8" stroke-width="16" fill="none" stroke-linecap="round" />
        <!-- Đỉnh núi cao nguồn cội -->
        <polygon points="350,150 420,70 480,150" fill="#1e293b" stroke="#475569" stroke-width="3" />
        <polygon points="395,100 420,70 445,100" fill="#f8fafc" />
        <text x="420" y="60" fill="#ffd084" font-size="14" font-weight="bold" text-anchor="middle">NGUỒN NƯỚC</text>
      \`;
    case 23: // Ăn cháo đá bát
      return \`
        <!-- Bát cháo thơm ngon -->
        <ellipse cx="230" cy="180" rx="55" ry="24" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3" />
        <path d="M 175 180 Q 230 250 285 180 Z" fill="#fed7aa" stroke="#cbd5e1" stroke-width="3" />
        <!-- Bàn chân mang giày vung cú đá mạnh -->
        <path d="M 330 230 L 270 210 L 290 180" stroke="#ef4444" stroke-width="16" stroke-linecap="round" />
        <!-- Mảnh bát vỡ tung tóe -->
        <text x="320" y="150" font-size="28">💥</text>
        <polygon points="340,160 360,140 350,170" fill="#f8fafc" stroke="#000" />
      \`;
    case 24: // Cháy nhà ra mặt chuột
      return \`
        <!-- Mái nhà bốc cháy đỏ rực -->
        <polygon points="200,160 300,90 400,160" fill="#b45309" stroke="#78350f" stroke-width="3" />
        <rect x="230" y="160" width="140" height="90" fill="#1e293b" stroke="#334155" stroke-width="3" />
        <text x="300" y="125" font-size="40">🔥</text>
        <!-- Đàn chuột túa ra lộ mặt -->
        <ellipse cx="390" cy="230" rx="28" ry="16" fill="#64748b" stroke="#334155" stroke-width="2" />
        <ellipse cx="430" cy="245" rx="22" ry="12" fill="#64748b" />
        <text x="380" y="235" font-size="22">🐭</text>
        <text x="420" y="248" font-size="18">🐭</text>
      \`;
    case 25: // Tránh vỏ dưa gặp vỏ dừa
      return \`
        <!-- Vỏ dưa hấu bên trái -->
        <path d="M 170 220 A 45 45 0 0 1 250 220 Z" fill="#ef4444" stroke="#15803d" stroke-width="6" />
        <!-- Bàn chân nhảy tránh -->
        <path d="M 240 130 L 280 180 L 320 140" stroke="#cbd5e1" stroke-width="12" stroke-linecap="round" />
        <!-- Gáo dừa cứng đón sẵn bên phải -->
        <circle cx="390" cy="220" r="38" fill="#78350f" stroke="#451a03" stroke-width="4" />
        <circle cx="378" cy="212" r="6" fill="#000" /><circle cx="398" cy="212" r="6" fill="#000" />
        <text x="390" y="160" fill="#ef4444" font-size="26">⚠️</text>
      \`;
    case 26: // Đi guốc trong bụng
      return \`
        <!-- Dạ dày uốn cong -->
        <path d="M 230 100 C 170 120 160 220 230 260 C 330 290 380 200 340 120 Z" fill="#f43f5e" stroke="#be123c" stroke-width="4" opacity="0.4" />
        <!-- Đôi guốc mộc quai đỏ bước bên trong -->
        <rect x="220" y="170" width="60" height="16" rx="4" fill="#d97706" stroke="#b45309" stroke-width="2" />
        <path d="M 235 170 Q 250 150 265 170" stroke="#ef4444" stroke-width="4" fill="none" />
        <rect x="225" y="186" width="10" height="15" fill="#78350f" />
        <rect x="265" y="186" width="10" height="15" fill="#78350f" />
        <text x="290" y="225" fill="#c5f467" font-size="14" font-weight="bold">LỘC CỘC...</text>
      \`;
    case 27: // Đầu voi đuôi chuột
      return \`
        <!-- Đầu con voi đồ sộ có ngà -->
        <ellipse cx="250" cy="180" rx="75" ry="60" fill="#64748b" stroke="#334155" stroke-width="3" />
        <circle cx="210" cy="165" r="8" fill="#000" />
        <path d="M 190 190 Q 150 240 180 270" stroke="#64748b" stroke-width="18" fill="none" stroke-linecap="round" />
        <path d="M 220 220 Q 200 250 180 240" stroke="#f8fafc" stroke-width="6" fill="none" stroke-linecap="round" />
        <!-- Đuôi chuột teo tóp phía sau -->
        <path d="M 325 180 Q 420 185 450 160 Q 470 140 460 200" stroke="#f43f5e" stroke-width="4" fill="none" stroke-linecap="round" />
        <text x="460" y="230" fill="#ffd084" font-size="14" font-weight="bold">ĐUÔI CHUỘT</text>
      \`;
    case 28: // Tay làm hàm nhai
      return \`
        <!-- Đôi bàn tay gặt lúa -->
        <g transform="translate(160, 160)">
          <path d="M 20 60 L 50 20 L 70 30" stroke="#cbd5e1" stroke-width="10" stroke-linecap="round" />
          <text x="45" y="20" font-size="34">🌾</text>
          <text x="50" y="90" fill="#ffd084" font-weight="bold" font-size="14" text-anchor="middle">TAY LÀM</text>
        </g>
        <!-- Khuôn miệng nhai cơm -->
        <g transform="translate(340, 160)">
          <ellipse cx="50" cy="35" rx="35" ry="20" fill="#ef4444" stroke="#991b1b" stroke-width="3" />
          <rect x="35" y="28" width="12" height="12" rx="2" fill="#fff" />
          <rect x="53" y="28" width="12" height="12" rx="2" fill="#fff" />
          <text x="50" y="90" fill="#c5f467" font-weight="bold" font-size="14" text-anchor="middle">HÀM NHAI</text>
        </g>
      \`;
    case 29: // Giấu đầu hở đuôi
      return \`
        <!-- Con đà điểu / thú rúc đầu vào bao tải -->
        <rect x="180" y="160" width="80" height="90" rx="8" fill="#78350f" stroke="#451a03" stroke-width="3" />
        <text x="220" y="210" fill="#ffd084" font-weight="bold" font-size="12" text-anchor="middle">BAO TẢI</text>
        <ellipse cx="320" cy="200" rx="60" ry="40" fill="#475569" stroke="#1e293b" stroke-width="3" />
        <!-- Chiếc đuôi to xù lộ ra chỏng chơ -->
        <path d="M 380 190 Q 450 160 480 210" stroke="#f59e0b" stroke-width="18" fill="none" stroke-linecap="round" />
        <polygon points="460,200 485,210 470,225" fill="#d97706" />
        <text x="440" y="140" fill="#ef4444" font-size="28">👀</text>
      \`;
    case 30: // Gừng càng già càng cay
      return \`
        <!-- Củ gừng già cổ thụ -->
        <path d="M 200 210 Q 230 160 280 170 Q 320 140 370 190 Q 330 250 270 240 Z" fill="#d97706" stroke="#92400e" stroke-width="4" />
        <circle cx="230" cy="200" r="14" fill="#b45309" />
        <!-- Lửa cay xè bốc khói -->
        <text x="270" y="140" font-size="40">🔥</text>
        <text x="330" y="150" font-size="34">🌶️</text>
        <text x="300" y="275" fill="#ffd084" font-weight="bold" font-size="15" text-anchor="middle">CỰC CAY!</text>
      \`;
    case 31: // Treo đầu dê bán thịt chó
      return \`
        <!-- Đầu dê treo trên bảng -->
        <rect x="170" y="120" width="110" height="110" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="3" />
        <text x="225" y="180" font-size="42" text-anchor="middle">🐐</text>
        <text x="225" y="215" fill="#38bdf8" font-size="12" font-weight="bold" text-anchor="middle">TREO ĐẦU DÊ</text>
        <!-- Bàn bán thịt chó bên cạnh -->
        <rect x="330" y="160" width="130" height="70" rx="4" fill="#b45309" stroke="#78350f" stroke-width="3" />
        <text x="395" y="195" font-size="32" text-anchor="middle">🐕🥩</text>
        <text x="395" y="250" fill="#ef4444" font-size="12" font-weight="bold" text-anchor="middle">BÁN THỊT CHÓ</text>
      \`;
    case 32: // Mật ngọt chết ruồi
      return \`
        <!-- Hũ mật ong vàng óng -->
        <ellipse cx="250" cy="170" rx="50" ry="20" fill="#facc15" stroke="#ca8a04" stroke-width="3" />
        <path d="M 200 170 Q 200 260 250 260 Q 300 260 300 170 Z" fill="#eab308" stroke="#ca8a04" stroke-width="3" />
        <text x="250" y="225" fill="#78350f" font-weight="900" font-size="16" text-anchor="middle">MẬT ONG</text>
        <!-- Đàn ruồi dính chân chết chìm -->
        <circle cx="370" cy="180" r="16" fill="#1e293b" />
        <text x="355" y="190" font-size="28">🪰</text>
        <text x="400" y="220" font-size="28">🪰</text>
        <text x="430" y="180" fill="#ef4444" font-size="24">💀</text>
      \`;
    case 33: // Chó ngáp phải ruồi
      return \`
        <!-- Chú chó há to mồm ngáp -->
        <ellipse cx="250" cy="210" rx="60" ry="45" fill="#f59e0b" stroke="#b45309" stroke-width="3" />
        <circle cx="195" cy="190" r="5" fill="#000" />
        <!-- Cái miệng ngáp hết cỡ -->
        <ellipse cx="320" cy="200" rx="35" ry="30" fill="#7f1d1d" stroke="#991b1b" stroke-width="3" />
        <!-- Con ruồi bay tọt vào giữa họng -->
        <text x="305" y="210" font-size="24">🪰</text>
        <path d="M 430 160 Q 370 180 330 200" stroke="#38bdf8" stroke-width="3" stroke-dasharray="4,4" fill="none" />
      \`;
    case 34: // Lửa thử vàng gian nan thử sức
      return \`
        <!-- Thỏi vàng giữa ngọn lửa -->
        <polygon points="210,210 270,180 330,210 270,240" fill="#ffd084" stroke="#ca8a04" stroke-width="3" />
        <text x="270" y="218" fill="#78350f" font-weight="bold" font-size="12" text-anchor="middle">9999</text>
        <text x="270" y="160" font-size="44" text-anchor="middle">🔥</text>
        <!-- Người leo dốc đá hiểm trở -->
        <polygon points="380,260 440,150 490,260" fill="#334155" stroke="#1e293b" stroke-width="3" />
        <circle cx="420" cy="170" r="12" fill="#cbd5e1" />
        <line x1="420" y1="182" x2="430" y2="210" stroke="#cbd5e1" stroke-width="4" />
      \`;
    case 35: // Thừa nước đục thả câu
      return \`
        <!-- Vùng nước bùn đục xoáy cuộn -->
        <rect x="150" y="190" width="300" height="80" rx="10" fill="#78350f" stroke="#92400e" stroke-width="3" />
        <!-- Cần câu buông lưỡi -->
        <line x1="170" y1="90" x2="350" y2="120" stroke="#b45309" stroke-width="6" stroke-linecap="round" />
        <line x1="350" y1="120" x2="350" y2="230" stroke="#bae6fd" stroke-width="2" />
        <path d="M 350 230 Q 360 245 350 250" stroke="#cbd5e1" stroke-width="3" fill="none" />
        <!-- Cá to cắn câu giật lên -->
        <ellipse cx="350" cy="245" rx="18" ry="9" fill="#38bdf8" stroke="#0284c7" stroke-width="2" />
      \`;
    case 36: // Cá lớn nuốt cá bé
      return \`
        <!-- Con cá mập lớn ngoác mồm -->
        <path d="M 170 190 Q 230 110 320 160 L 320 220 Q 230 270 170 190 Z" fill="#0284c7" stroke="#0369a1" stroke-width="4" />
        <!-- Cá nhỡ -->
        <ellipse cx="360" cy="190" rx="30" ry="16" fill="#f59e0b" stroke="#d97706" stroke-width="2" />
        <!-- Đàn cá con tí xíu -->
        <ellipse cx="430" cy="190" rx="12" ry="6" fill="#22c55e" />
        <ellipse cx="460" cy="175" rx="10" ry="5" fill="#22c55e" />
      \`;
    case 37: // Tái ông thất mã
      return \`
        <!-- Ông lão râu bạc -->
        <circle cx="210" cy="180" r="30" fill="#fed7aa" stroke="#ea580c" stroke-width="2" />
        <path d="M 195 190 Q 210 230 225 190" fill="#f8fafc" />
        <!-- Con ngựa phi đi xa -->
        <text x="350" y="170" font-size="44">🐎</text>
        <path d="M 280 210 Q 340 180 400 210" stroke="#ffd084" stroke-width="4" stroke-dasharray="6,4" fill="none" />
        <text x="420" y="220" font-size="34">🐎🐎</text>
      \`;
    case 38: // Rút dây động rừng
      return \`
        <!-- Tay kéo sợi dây leo -->
        <path d="M 150 200 L 250 170" stroke="#22c55e" stroke-width="8" stroke-linecap="round" />
        <rect x="130" y="185" width="25" height="30" rx="6" fill="#cbd5e1" />
        <!-- Cả khu rừng rung chuyển chim bay -->
        <text x="360" y="190" font-size="44">🌲🌳</text>
        <text x="430" y="140" font-size="30">🐦🐦</text>
        <path d="M 320 230 L 460 230" stroke="#ef4444" stroke-width="3" stroke-dasharray="4,4" />
      \`;
    case 39: // Thọc gậy bánh xe
      return \`
        <!-- Bánh xe nan hoa đang quay -->
        <circle cx="270" cy="190" r="65" fill="none" stroke="#64748b" stroke-width="8" />
        <line x1="205" y1="190" x2="335" y2="190" stroke="#64748b" stroke-width="4" />
        <line x1="270" y1="125" x2="270" y2="255" stroke="#64748b" stroke-width="4" />
        <!-- Cây gậy chọc ngang gãy nan hoa -->
        <line x1="420" y1="120" x2="260" y2="190" stroke="#b45309" stroke-width="14" stroke-linecap="round" />
        <text x="240" y="180" font-size="28">💥</text>
      \`;
    case 40: // Đẽo cày giữa đường
      return \`
        <!-- Khúc gỗ cày bị gọt dở -->
        <path d="M 220 220 Q 280 180 340 230" stroke="#b45309" stroke-width="16" stroke-linecap="round" fill="none" />
        <!-- Rìu đẽo bên cạnh -->
        <rect x="270" y="160" width="30" height="20" rx="2" fill="#64748b" />
        <line x1="285" y1="160" x2="285" y2="120" stroke="#78350f" stroke-width="6" />
        <!-- Mũi tên bàn tán chỉ trỏ bốn phía -->
        <text x="170" y="180" font-size="28">👉</text>
        <text x="370" y="180" font-size="28">👈</text>
      \`;
    case 41: // Qua cầu rút ván
      return \`
        <!-- Chiếc cầu gỗ bắc qua sông -->
        <rect x="160" y="200" width="120" height="14" fill="#78350f" />
        <!-- Người sang bờ an toàn -->
        <circle cx="430" cy="150" r="18" fill="#cbd5e1" />
        <line x1="430" y1="168" x2="430" y2="210" stroke="#cbd5e1" stroke-width="6" />
        <!-- Tấm ván cầu bị rút ném rơi xuống nước -->
        <rect x="300" y="220" width="80" height="12" fill="#b45309" transform="rotate(35, 340, 225)" />
        <text x="330" y="270" fill="#38bdf8" font-size="18">🌊🌊</text>
      \`;
    case 42: // Miệng nam mô bụng một bồ dao găm
      return \`
        <!-- Miệng tụng niệm chuỗi hạt -->
        <ellipse cx="230" cy="140" rx="30" ry="14" fill="#ef4444" />
        <text x="230" y="115" fill="#facc15" font-size="20">📿</text>
        <!-- Bồ đầy ắp dao găm trong bụng -->
        <rect x="290" y="160" width="110" height="90" rx="10" fill="#78350f" stroke="#ca8a04" stroke-width="3" />
        <line x1="310" y1="180" x2="310" y2="120" stroke="#94a3b8" stroke-width="4" />
        <polygon points="307,120 313,120 310,105" fill="#e2e8f0" />
        <line x1="345" y1="180" x2="345" y2="115" stroke="#94a3b8" stroke-width="4" />
        <polygon points="342,115 348,115 345,100" fill="#e2e8f0" />
        <line x1="380" y1="180" x2="380" y2="125" stroke="#94a3b8" stroke-width="4" />
      \`;
    case 43: // Nước chảy đá mòn
      return \`
        <!-- Giọt nước rơi đều đặn -->
        <path d="M 270 90 Q 260 120 270 140 Q 280 120 270 90 Z" fill="#38bdf8" />
        <path d="M 270 150 Q 260 180 270 200 Q 280 180 270 150 Z" fill="#38bdf8" />
        <!-- Tảng đá lớn có vết lõm sâu -->
        <path d="M 180 260 Q 270 210 360 260 Z" fill="#64748b" stroke="#334155" stroke-width="4" />
        <ellipse cx="270" cy="235" rx="28" ry="12" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
        <text x="270" y="285" fill="#c5f467" font-size="13" font-weight="bold" text-anchor="middle">LÕM SÂU HOẮM</text>
      \`;
    case 44: // Gieo gió gặt bão
      return \`
        <!-- Gió nhẹ vờn tay -->
        <path d="M 180 200 Q 230 180 260 210" stroke="#bae6fd" stroke-width="4" fill="none" />
        <!-- Cơn bão sấm chớp cuồng nộ -->
        <ellipse cx="380" cy="140" rx="75" ry="35" fill="#334155" stroke="#1e293b" stroke-width="3" />
        <polygon points="370,175 350,215 380,215 360,265" fill="#facc15" stroke="#ca8a04" stroke-width="2" />
        <text x="430" y="220" font-size="34">🌪️</text>
      \`;
    case 45: // Đi một ngày đàng học một sàng khôn
      return \`
        <!-- Đôi chân bước trên đường -->
        <path d="M 150 250 Q 240 220 320 250" stroke="#ffd084" stroke-width="8" fill="none" />
        <!-- Chiếc sàng tre đựng ngọc trí tuệ -->
        <ellipse cx="380" cy="170" rx="65" ry="30" fill="#ca8a04" stroke="#78350f" stroke-width="4" />
        <text x="380" y="175" font-size="32" text-anchor="middle">💎📚💡</text>
      \`;
    case 46: // Mặt ủ mày chau
      return \`
        <!-- Khuôn mặt buồn rười rượi -->
        <circle cx="300" cy="180" r="70" fill="#fed7aa" stroke="#ea580c" stroke-width="3" />
        <!-- Đôi mày nhăn tít lại chau mày -->
        <path d="M 255 155 L 290 170" stroke="#000" stroke-width="5" stroke-linecap="round" />
        <path d="M 345 155 L 310 170" stroke="#000" stroke-width="5" stroke-linecap="round" />
        <!-- Mắt buồn & Miệng trĩu xuống -->
        <circle cx="270" cy="180" r="5" fill="#000" /><circle cx="330" cy="180" r="5" fill="#000" />
        <path d="M 270 225 Q 300 200 330 225" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round" />
      \`;
    case 47: // Chim sa cá lặn
      return \`
        <!-- Chim sà cánh -->
        <text x="210" y="160" font-size="44">🕊️</text>
        <path d="M 220 170 L 220 240" stroke="#ef4444" stroke-width="3" stroke-dasharray="4,4" />
        <!-- Cá lặn sâu -->
        <text x="360" y="240" font-size="44">🐟</text>
        <path d="M 370 170 L 370 230" stroke="#38bdf8" stroke-width="3" stroke-dasharray="4,4" />
        <!-- Nhan sắc tuyệt mỹ -->
        <circle cx="290" cy="130" r="28" fill="#fbcfe8" stroke="#f472b6" stroke-width="2" />
        <text x="290" y="140" font-size="24" text-anchor="middle">👸</text>
      \`;
    case 48: // Vụng chèo khéo chống
      return \`
        <!-- Mái chèo vụng về tuột tay -->
        <line x1="170" y1="120" x2="260" y2="240" stroke="#b45309" stroke-width="6" />
        <circle cx="215" cy="180" r="20" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4" />
        <!-- Cây sào tre chống vững chãi -->
        <line x1="390" y1="90" x2="310" y2="260" stroke="#84cc16" stroke-width="10" stroke-linecap="round" />
        <text x="360" y="260" font-size="28">🧗</text>
      \`;
    case 49: // Hoạ từ miệng mà ra
      return \`
        <!-- Miệng mở to phát ngôn -->
        <ellipse cx="230" cy="180" rx="45" ry="30" fill="#dc2626" stroke="#991b1b" stroke-width="3" />
        <!-- Ngọn lửa hoạ hoạn bùng cháy từ miệng -->
        <path d="M 270 180 Q 360 140 430 160" stroke="#f97316" stroke-width="12" fill="none" />
        <text x="410" y="170" font-size="44">🔥💀</text>
      \`;
    case 50: // Khẩu phật tâm xà
      return \`
        <!-- Hoa sen nơi miệng -->
        <ellipse cx="220" cy="180" rx="35" ry="18" fill="#f472b6" />
        <text x="220" y="150" font-size="36" text-anchor="middle">🪷</text>
        <!-- Rắn độc trong lồng ngực -->
        <circle cx="360" cy="180" r="45" fill="#1e293b" stroke="#334155" stroke-width="3" />
        <text x="360" y="195" font-size="40" text-anchor="middle">🐍</text>
      \`;
    case 51: // Nhất cử lưỡng tiện
      return \`
        <!-- Một mũi tên bay xuyên -->
        <line x1="160" y1="180" x2="430" y2="180" stroke="#c5f467" stroke-width="6" stroke-linecap="round" />
        <polygon points="430,172 455,180 430,188" fill="#c5f467" />
        <!-- Hai quả táo đỏ trúng cùng lúc -->
        <circle cx="280" cy="180" r="24" fill="#ef4444" stroke="#b91c1c" stroke-width="2" />
        <circle cx="370" cy="180" r="24" fill="#ef4444" stroke="#b91c1c" stroke-width="2" />
      \`;
    case 52: // Nhập gia tuỳ tục
      return \`
        <!-- Cổng nhà mái ngói -->
        <polygon points="170,140 250,90 330,140" fill="#b45309" stroke="#78350f" stroke-width="3" />
        <!-- Đôi guốc cởi ngay ngắn ngoài thềm -->
        <rect x="220" y="230" width="16" height="28" rx="4" fill="#ef4444" />
        <rect x="245" y="230" width="16" height="28" rx="4" fill="#ef4444" />
        <!-- Khách chắp tay cúi chào -->
        <text x="390" y="210" font-size="44">🙇‍♂️</text>
      \`;
    case 53: // Khổ tận cam lai
      return \`
        <!-- Chén thuốc đắng cạn đáy -->
        <ellipse cx="220" cy="180" rx="45" ry="22" fill="#451a03" stroke="#78350f" stroke-width="3" />
        <text x="220" y="235" fill="#cbd5e1" font-weight="bold" font-size="14" text-anchor="middle">ĐẮNG NGẮT</text>
        <!-- Cành cam vàng trĩu quả ngọt -->
        <circle cx="380" cy="170" r="32" fill="#f97316" stroke="#c2410c" stroke-width="3" />
        <text x="380" y="175" font-size="34" text-anchor="middle">🍊</text>
        <text x="380" y="235" fill="#c5f467" font-weight="bold" font-size="14" text-anchor="middle">NGỌT NGÀO</text>
      \`;
    case 54: // Tẩm ngẩm tầm ngầm mà đấm chết voi
      return \`
        <!-- Chú bé nhỏ bé tung nắm đấm -->
        <circle cx="190" cy="190" r="18" fill="#cbd5e1" />
        <line x1="190" y1="208" x2="230" y2="190" stroke="#c5f467" stroke-width="8" stroke-linecap="round" />
        <!-- Cú đấm uy lực -->
        <text x="250" y="195" font-size="32">🥊💥</text>
        <!-- Con voi to ngã chỏng gọng -->
        <text x="380" y="210" font-size="52">🐘💫</text>
      \`;
    case 55: // Đồng cam cộng khổ
      return \`
        <!-- Quả cam bẻ đôi -->
        <ellipse cx="230" cy="180" rx="30" ry="30" fill="#f97316" />
        <ellipse cx="270" cy="180" rx="30" ry="30" fill="#f97316" />
        <text x="250" y="185" font-size="32" text-anchor="middle">🍊</text>
        <!-- Đòn gánh chia đôi trên vai -->
        <line x1="330" y1="180" x2="430" y2="180" stroke="#b45309" stroke-width="8" stroke-linecap="round" />
        <text x="380" y="160" font-size="28" text-anchor="middle">🤝</text>
      \`;
    case 56: // Bách phát bách trúng
      return \`
        <!-- Bia bắn cung hồng tâm -->
        <circle cx="300" cy="180" r="75" fill="#ef4444" stroke="#fff" stroke-width="8" />
        <circle cx="300" cy="180" r="45" fill="#fff" />
        <circle cx="300" cy="180" r="20" fill="#ef4444" />
        <!-- Bó tên găm chính giữa hồng tâm -->
        <line x1="300" y1="180" x2="350" y2="130" stroke="#c5f467" stroke-width="4" />
        <line x1="300" y1="180" x2="360" y2="150" stroke="#ffd084" stroke-width="4" />
        <text x="300" y="275" fill="#ffd084" font-weight="900" font-size="22" text-anchor="middle">100 / 100</text>
      \`;
    case 57: // Thuận buồm xuôi gió
      return \`
        <!-- Thuyền buồm căng gió -->
        <polygon points="210,130 330,130 250,210" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3" />
        <path d="M 190 220 L 360 220 L 330 250 L 220 250 Z" fill="#b45309" stroke="#78350f" stroke-width="3" />
        <!-- Làn gió thổi xuôi -->
        <path d="M 140 150 Q 220 130 300 150" stroke="#38bdf8" stroke-width="5" fill="none" />
        <text x="380" y="160" font-size="34">💨🌊</text>
      \`;
    case 58: // Mã đáo thành công
      return \`
        <!-- Tuấn mã dũng mãnh trở về -->
        <text x="240" y="200" font-size="52">🐎</text>
        <text x="350" y="160" font-size="40">🚩🏆</text>
        <text x="300" y="270" fill="#ffd084" font-weight="bold" font-size="16" text-anchor="middle">CHIẾN THẮNG TRỞ VỀ</text>
      \`;
    case 59: // Giấy rách phải giữ lấy lề
      return \`
        <!-- Trang sách rách mép tả tơi -->
        <path d="M 220 110 L 350 110 L 330 150 L 350 190 L 320 250 L 220 250 Z" fill="#fef08a" stroke="#ca8a04" stroke-width="2" />
        <!-- Lề gáy sách khâu chỉ đỏ thẳng tắp -->
        <line x1="220" y1="100" x2="220" y2="260" stroke="#ef4444" stroke-width="10" stroke-linecap="round" />
        <text x="280" y="180" fill="#78350f" font-weight="bold" font-size="14">TIẾT HẠNH</text>
      \`;
    case 60: // Giậu đổ bìm leo
      return \`
        <!-- Hàng giậu tre xiêu ngã -->
        <line x1="170" y1="230" x2="350" y2="150" stroke="#78350f" stroke-width="8" stroke-linecap="round" />
        <line x1="220" y1="240" x2="380" y2="180" stroke="#78350f" stroke-width="8" stroke-linecap="round" />
        <!-- Dây hoa bìm bìm tím leo đè lên -->
        <path d="M 190 220 Q 280 160 360 170" stroke="#22c55e" stroke-width="8" fill="none" />
        <text x="240" y="190" font-size="24">🌺</text>
        <text x="320" y="165" font-size="24">🌺</text>
      \`;
    case 61: // Trứng khôn hơn vịt
      return \`
        <!-- Quả trứng nhỏ đội mũ tiến sĩ cầm thước -->
        <ellipse cx="230" cy="200" rx="30" ry="40" fill="#ffedd5" stroke="#ea580c" stroke-width="2" />
        <polygon points="205,160 255,160 230,140" fill="#1e293b" />
        <text x="230" y="195" font-size="16" text-anchor="middle">🎓👓</text>
        <line x1="255" y1="200" x2="295" y2="170" stroke="#b45309" stroke-width="4" />
        <!-- Con vịt mẹ to lớn há hốc mồm ngạc nhiên -->
        <ellipse cx="380" cy="190" rx="55" ry="45" fill="#facc15" stroke="#ca8a04" stroke-width="3" />
        <circle cx="340" cy="160" r="10" fill="#fff" /><circle cx="338" cy="160" r="4" fill="#000" />
        <polygon points="325,170 295,175 325,185" fill="#f97316" />
      \`;
    case 62: // Thêu dệt chuyện hoang đường
      return \`
        <!-- Cây kim thêu chỉ vàng -->
        <line x1="180" y1="120" x2="260" y2="180" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round" />
        <circle cx="185" cy="125" r="3" fill="#000" />
        <path d="M 180 120 Q 140 100 170 80" stroke="#ffd084" stroke-width="3" fill="none" />
        <!-- Con rồng bay kỳ dị hoang đường trên khung dệt -->
        <rect x="260" y="140" width="160" height="110" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="3" />
        <text x="340" y="200" font-size="44" text-anchor="middle">🐉✨</text>
        <text x="340" y="235" fill="#c084fc" font-size="12" font-weight="bold" text-anchor="middle">HOANG ĐƯỜNG</text>
      \`;
    default:
      return '';
  }
}
`;

// Insert the full scene generator
const regex = /function renderSpecificScene\(q\) \{[\s\S]*?\n\}/;
scriptCode = scriptCode.replace(regex, renderSceneCode.trim());

fs.writeFileSync(scriptPath, scriptCode, 'utf8');
console.log('Updated build-dhbc-data.js with full 62 scenes.');
