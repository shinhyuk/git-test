/**
 * WiFi 위치 추적 대시보드 - 실시간 시각화
 */

(function () {
  'use strict';

  const canvas = document.getElementById('trackingMap');
  const ctx = canvas.getContext('2d');

  let envConfig = null;
  let apConfig = [];
  let showTrail = true;
  let history = [];
  let currentPos = null;
  let rawPos = null;
  let apSignals = [];
  let lastUpdate = 0;

  // ============================================
  // Config
  // ============================================
  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      envConfig = data.environment;
      apConfig = data.access_points;
      document.getElementById('envName').textContent =
        `${envConfig.name} (${envConfig.width}x${envConfig.height}m)`;
      resizeCanvas();
    } catch {
      console.error('설정 로드 실패');
    }
  }

  // ============================================
  // Canvas Resize
  // ============================================
  function resizeCanvas() {
    if (!envConfig) return;
    const wrap = canvas.parentElement;
    const maxW = wrap.clientWidth * 0.92;
    const maxH = wrap.clientHeight * 0.92;
    const ratio = envConfig.width / envConfig.height;

    if (maxW / ratio <= maxH) {
      canvas.width = Math.floor(maxW);
      canvas.height = Math.floor(maxW / ratio);
    } else {
      canvas.height = Math.floor(maxH);
      canvas.width = Math.floor(maxH * ratio);
    }
  }

  window.addEventListener('resize', resizeCanvas);

  // ============================================
  // Coordinate Transform
  // ============================================
  function toCanvas(x, y) {
    if (!envConfig) return { cx: 0, cy: 0 };
    const padding = 40;
    const drawW = canvas.width - padding * 2;
    const drawH = canvas.height - padding * 2;
    return {
      cx: padding + (x / envConfig.width) * drawW,
      cy: padding + (1 - y / envConfig.height) * drawH  // Y축 반전
    };
  }

  // ============================================
  // Drawing
  // ============================================
  function draw() {
    if (!envConfig) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const padding = 40;
    const drawW = canvas.width - padding * 2;
    const drawH = canvas.height - padding * 2;

    // 배경 그리드
    drawGrid(padding, drawW, drawH);

    // AP 범위 원 (신호 도달 범위)
    drawAPRanges();

    // 이동 궤적
    if (showTrail && history.length > 1) {
      drawTrail();
    }

    // AP 표시
    drawAPs();

    // 현재 위치 (원시)
    if (rawPos) {
      const { cx, cy } = toCanvas(rawPos[0], rawPos[1]);
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 171, 0, 0.4)';
      ctx.fill();
    }

    // 현재 위치 (필터링)
    if (currentPos) {
      drawCurrentPosition(currentPos);
    }

    // 축 레이블
    drawLabels(padding, drawW, drawH);
  }

  function drawGrid(padding, drawW, drawH) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // 수직선
    const xStep = envConfig.width <= 20 ? 2 : 5;
    for (let x = 0; x <= envConfig.width; x += xStep) {
      const { cx } = toCanvas(x, 0);
      ctx.beginPath();
      ctx.moveTo(cx, padding);
      ctx.lineTo(cx, padding + drawH);
      ctx.stroke();
    }

    // 수평선
    const yStep = envConfig.height <= 15 ? 2 : 5;
    for (let y = 0; y <= envConfig.height; y += yStep) {
      const { cy } = toCanvas(0, y);
      ctx.beginPath();
      ctx.moveTo(padding, cy);
      ctx.lineTo(padding + drawW, cy);
      ctx.stroke();
    }

    // 외곽선
    ctx.strokeStyle = 'rgba(0, 115, 230, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, padding, drawW, drawH);
  }

  function drawAPRanges() {
    apSignals.forEach(sig => {
      const { cx, cy } = toCanvas(sig.ap_x, sig.ap_y);
      const dist = sig.distance;
      const { cx: cx2 } = toCanvas(dist, 0);
      const { cx: cx0 } = toCanvas(0, 0);
      const radius = Math.abs(cx2 - cx0);

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 115, 230, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  function drawAPs() {
    apConfig.forEach(ap => {
      const { cx, cy } = toCanvas(ap.x, ap.y);

      // AP 아이콘 (WiFi 심볼)
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#0073E6';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 115, 230, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // AP 이름
      ctx.fillStyle = '#6b7589';
      ctx.font = '11px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ap.ssid, cx, cy - 18);
    });
  }

  function drawTrail() {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 230, 118, 0.3)';
    ctx.lineWidth = 2;

    for (let i = 0; i < history.length; i++) {
      const { cx, cy } = toCanvas(history[i].x, history[i].y);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // 궤적 점
    history.forEach((pt, i) => {
      const alpha = 0.1 + (i / history.length) * 0.5;
      const { cx, cy } = toCanvas(pt.x, pt.y);
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 230, 118, ${alpha})`;
      ctx.fill();
    });
  }

  function drawCurrentPosition(pos) {
    const { cx, cy } = toCanvas(pos[0], pos[1]);

    // 글로우 효과
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
    glow.addColorStop(0, 'rgba(0, 230, 118, 0.3)');
    glow.addColorStop(1, 'rgba(0, 230, 118, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 30, cy - 30, 60, 60);

    // 외부 링
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 230, 118, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 내부 원
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#00e676';
    ctx.fill();

    // 좌표 텍스트
    ctx.fillStyle = '#e0e6f0';
    ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`(${pos[0]}, ${pos[1]})`, cx, cy + 28);
  }

  function drawLabels(padding, drawW, drawH) {
    ctx.fillStyle = '#4a5568';
    ctx.font = '10px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';

    // X축
    const xStep = envConfig.width <= 20 ? 5 : 10;
    for (let x = 0; x <= envConfig.width; x += xStep) {
      const { cx } = toCanvas(x, 0);
      ctx.fillText(`${x}m`, cx, padding + drawH + 16);
    }

    // Y축
    ctx.textAlign = 'right';
    const yStep = envConfig.height <= 15 ? 5 : 10;
    for (let y = 0; y <= envConfig.height; y += yStep) {
      const { cy } = toCanvas(0, y);
      ctx.fillText(`${y}m`, padding - 8, cy + 4);
    }
  }

  // ============================================
  // Data Polling
  // ============================================
  async function fetchStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();

      if (data.position) {
        currentPos = data.position;
        document.getElementById('posX').innerHTML = `${data.position[0]}<span class="unit">m</span>`;
        document.getElementById('posY').innerHTML = `${data.position[1]}<span class="unit">m</span>`;
      }

      rawPos = data.raw_position;
      apSignals = data.ap_signals || [];
      history = data.history || [];

      document.getElementById('apCount').textContent = apSignals.length;
      document.getElementById('speed').textContent = (data.speed || 0).toFixed(1);

      if (data.timestamp) {
        const elapsed = ((Date.now() / 1000) - data.timestamp).toFixed(1);
        document.getElementById('updateRate').textContent = `${elapsed}s ago`;
      }

      // AP 신호 목록 업데이트
      updateAPList(apSignals);

      draw();
    } catch {
      // 서버 연결 실패 시 무시
    }
  }

  function updateAPList(signals) {
    const container = document.getElementById('apList');

    if (signals.length === 0) {
      container.innerHTML = '<div style="color:#6b7589;font-size:13px;text-align:center;padding:20px;">신호 없음</div>';
      return;
    }

    container.innerHTML = signals.map(sig => {
      const strength = sig.rssi > -50 ? 'strong' : sig.rssi > -70 ? 'medium' : 'weak';
      const barWidth = Math.max(5, Math.min(100, (100 + sig.rssi)));
      const barColor = strength === 'strong' ? '#00e676' : strength === 'medium' ? '#ffab00' : '#ff5252';
      const dotColor = barColor;

      return `
        <div class="ap-item">
          <div class="ap-dot" style="background:${dotColor}"></div>
          <div class="ap-info">
            <div class="ap-name">${sig.ssid || sig.bssid}</div>
            <div class="ap-detail">${sig.distance}m</div>
            <div class="rssi-bar">
              <div class="rssi-bar-fill" style="width:${barWidth}%;background:${barColor}"></div>
            </div>
          </div>
          <div class="ap-rssi signal-${strength}">${sig.rssi.toFixed(0)} dBm</div>
        </div>
      `;
    }).join('');
  }

  // ============================================
  // Controls
  // ============================================
  document.getElementById('toggleTrail').addEventListener('click', function () {
    showTrail = !showTrail;
    this.textContent = showTrail ? '궤적 숨기기' : '궤적 표시';
    draw();
  });

  document.getElementById('resetBtn').addEventListener('click', async function () {
    try {
      await fetch('/api/reset');
      history = [];
      currentPos = null;
      rawPos = null;
      draw();
    } catch {
      // 무시
    }
  });

  // ============================================
  // Init
  // ============================================
  async function init() {
    await loadConfig();
    draw();
    // 500ms 간격으로 데이터 폴링
    setInterval(fetchStatus, 500);
  }

  init();
})();
