const actualAsset = 36_400_000;
const currentPrice = 184.42;
const basicDeduction = 2_500_000;
const taxRate = 0.22;
const feeRate = 0.0015;

const pricePoints = [
  { date: "2025.01.10", short: "1월", price: 92.1, checkpoint: 24_800_000 },
  { date: "2025.03.03", short: "3월", price: 104.8, checkpoint: 26_200_000 },
  { date: "2025.04.07", short: "4월", price: 88.8, checkpoint: 28_500_000 },
  { date: "2025.06.18", short: "6월", price: 126.4, checkpoint: 31_100_000 },
  { date: "2025.09.22", short: "9월", price: 151.2, checkpoint: 34_300_000 },
  { date: "현재", short: "현재", price: currentPrice, checkpoint: 36_400_000 }
];

const scenarioMap = {
  hold: {
    exitPrice: currentPrice,
    cashMultiplier: 1,
    timeline: ["NVDA 100% 매수", "현재 전량 매도 가정"]
  },
  sell: {
    exitPrice: 132.5,
    cashMultiplier: 1,
    timeline: ["NVDA 100% 매수", "2025.05.20 NVDA 전량 매도", "현금 보유"]
  },
  rebalance: {
    exitPrice: 132.5,
    cashMultiplier: 1.28,
    timeline: ["NVDA 100% 매수", "2025.05.20 NVDA 전량 매도", "2025.05.21 TSLA 60% · QQQ 40% 매수"]
  }
};

const state = {
  selectedIndex: 2,
  allocationMode: "100",
  allocation: 100,
  customAllocation: 70,
  scenario: "hold",
  otherGain: 0
};

const $ = (selector) => document.querySelector(selector);

function money(value, options = {}) {
  const rounded = Math.round(value);
  const prefix = rounded < 0 ? "-₩" : options.sign && rounded > 0 ? "+₩" : "₩";
  return `${prefix}${Math.abs(rounded).toLocaleString("ko-KR")}`;
}

function compactMoney(value) {
  const abs = Math.abs(value);
  const prefix = value < 0 ? "-₩" : value > 0 ? "+₩" : "₩";
  if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}${Math.round(abs / 1_000)}K`;
  return `${prefix}${Math.round(abs).toLocaleString("ko-KR")}`;
}

function selectedPoint() {
  return pricePoints[state.selectedIndex];
}

function scenarioValue(principal, buyPrice) {
  const scenario = scenarioMap[state.scenario];
  return principal * (scenario.exitPrice / buyPrice) * scenario.cashMultiplier;
}

function calculate() {
  const point = selectedPoint();
  const principal = point.checkpoint * (state.allocation / 100);
  const grossValue = scenarioValue(principal, point.price);
  const grossGain = grossValue - principal;
  const combinedGain = grossGain + state.otherGain;
  const taxableGain = Math.max(0, combinedGain - basicDeduction);
  const expectedTax = taxableGain * taxRate;
  const expectedFee = grossValue * feeRate;
  const taxAndFee = expectedTax + expectedFee;
  const afterTax = grossValue - taxAndFee;
  const gap = afterTax - actualAsset;

  return {
    point,
    principal,
    grossValue,
    grossGain,
    taxableGain,
    expectedTax,
    taxAndFee,
    afterTax,
    gap
  };
}

function renderChart() {
  const svg = $("#priceChart");
  const width = 760;
  const height = 340;
  const pad = { top: 34, right: 34, bottom: 48, left: 54 };
  const minPrice = Math.min(...pricePoints.map((point) => point.price)) * 0.9;
  const maxPrice = Math.max(...pricePoints.map((point) => point.price)) * 1.08;
  const x = (index) => pad.left + (index / (pricePoints.length - 1)) * (width - pad.left - pad.right);
  const y = (price) => pad.top + ((maxPrice - price) / (maxPrice - minPrice)) * (height - pad.top - pad.bottom);
  const line = pricePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(point.price).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(pricePoints.length - 1)} ${height - pad.bottom} L ${x(0)} ${height - pad.bottom} Z`;
  const selectedX = x(state.selectedIndex);
  const selectedY = y(selectedPoint().price);

  svg.innerHTML = `
    <path class="chart-area-fill" d="${area}"></path>
    <path class="chart-line" d="${line}"></path>
    <line class="chart-guide" x1="${selectedX}" y1="${pad.top}" x2="${selectedX}" y2="${height - pad.bottom}"></line>
    ${pricePoints.map((point, index) => `
      <g>
        <circle class="chart-point ${index === state.selectedIndex ? "selected" : ""}" data-index="${index}" cx="${x(index)}" cy="${y(point.price)}" r="8"></circle>
        <text class="chart-axis" x="${x(index)}" y="${height - 18}" text-anchor="middle">${point.short}</text>
      </g>
    `).join("")}
    <text class="chart-axis" x="${pad.left}" y="24">$${Math.round(maxPrice)}</text>
    <text class="chart-axis" x="${pad.left}" y="${height - pad.bottom + 26}">$${Math.round(minPrice)}</text>
  `;

  svg.querySelectorAll(".chart-point").forEach((point) => {
    point.addEventListener("click", () => {
      state.selectedIndex = Number(point.dataset.index);
      render();
    });
  });

  const callout = $("#chartCallout");
  callout.style.left = `${(selectedX / width) * 100}%`;
  callout.style.top = `${selectedY}px`;
}

function renderDateButtons() {
  const wrap = $("#dateButtons");
  wrap.innerHTML = pricePoints.map((point, index) => `
    <button class="${index === state.selectedIndex ? "selected" : ""}" type="button" data-index="${index}">
      ${point.date}
    </button>
  `).join("");

  wrap.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedIndex = Number(button.dataset.index);
      render();
    });
  });
}

function renderTimeline(result) {
  const scenario = scenarioMap[state.scenario];
  const point = result.point;
  const rows = [
    {
      date: point.date,
      title: scenario.timeline[0],
      body: `${money(result.principal)} 투자 · 월별 체크포인트 ${money(point.checkpoint)} 기준`
    }
  ];

  if (state.scenario === "hold") {
    rows.push({
      date: "현재",
      title: scenario.timeline[1],
      body: `평가이익 ${money(result.grossGain, { sign: true })} · 예상 세금 ${money(result.expectedTax)}`
    });
  } else {
    rows.push({
      date: "2025.05.20",
      title: scenario.timeline[1],
      body: "중간 실현손익 반영 · 이후 시나리오 수익률 적용"
    });
    rows.push({
      date: state.scenario === "rebalance" ? "2025.05.21" : "현재",
      title: scenario.timeline[2],
      body: state.scenario === "rebalance" ? "가상 거래 원장에 재배분 기록" : "추가 매수 없이 현금으로 유지"
    });
  }

  $("#timeline").innerHTML = rows.map((row) => `
    <li>
      <div class="timeline-date">${row.date}</div>
      <div class="timeline-body">
        <strong>${row.title}</strong>
        <span>${row.body}</span>
      </div>
    </li>
  `).join("");
}

function renderTaxBars(result) {
  const steps = [
    { label: "4월", value: Math.max(0, result.expectedTax * 0.08) },
    { label: "6월", value: Math.max(0, result.expectedTax * 0.32) },
    { label: "8월", value: Math.max(0, result.expectedTax * 0.58) },
    { label: "현재", value: result.expectedTax }
  ];
  const max = Math.max(...steps.map((step) => step.value), 1);

  $("#taxBars").innerHTML = steps.map((step) => `
    <div class="tax-row">
      <span>${step.label}</span>
      <div class="tax-track"><span class="tax-fill" style="width: ${(step.value / max) * 100}%"></span></div>
      <strong>${compactMoney(step.value)}</strong>
    </div>
  `).join("");
}

function renderNumbers() {
  const result = calculate();
  const point = result.point;

  $("#selectedDateLabel").textContent = point.date;
  $("#sideCheckpoint").textContent = money(point.checkpoint);
  $("#sideCheckpointDate").textContent = `${point.date} 기준`;
  $("#actualAsset").textContent = money(actualAsset);
  $("#afterTaxAsset").textContent = money(result.afterTax);
  $("#assetGap").textContent = money(result.gap, { sign: true });
  $("#assetGap").classList.toggle("positive", result.gap >= 0);
  $("#assetGap").classList.toggle("negative", result.gap < 0);

  $("#principal").textContent = money(result.principal);
  $("#grossValue").textContent = money(result.grossValue);
  $("#grossGain").textContent = money(result.grossGain, { sign: true });
  $("#grossGain").classList.toggle("positive", result.grossGain >= 0);
  $("#grossGain").classList.toggle("negative", result.grossGain < 0);
  $("#taxableGain").textContent = money(result.taxableGain);
  $("#taxAndFee").textContent = money(result.taxAndFee);

  renderTimeline(result);
  renderTaxBars(result);
}

function renderControls() {
  $("#customRow").classList.toggle("visible", state.allocationMode === "custom");
  $("#customPercent").value = state.customAllocation;
  $("#customPercentValue").textContent = `${state.customAllocation}%`;

  document.querySelectorAll("#allocationButtons button").forEach((button) => {
    button.classList.toggle("selected", button.dataset.percent === state.allocationMode);
  });

  document.querySelectorAll("#scenarioList button").forEach((button) => {
    button.classList.toggle("selected", button.dataset.scenario === state.scenario);
  });
}

function render() {
  renderChart();
  renderDateButtons();
  renderControls();
  renderNumbers();
}

function bindEvents() {
  $("#allocationButtons").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.percent === "custom") {
      state.allocationMode = "custom";
      state.allocation = state.customAllocation;
    } else {
      state.allocationMode = button.dataset.percent;
      state.allocation = Number(button.dataset.percent);
    }

    render();
  });

  $("#customPercent").addEventListener("input", (event) => {
    state.customAllocation = Number(event.target.value);
    state.allocationMode = "custom";
    state.allocation = state.customAllocation;
    render();
  });

  $("#scenarioList").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    state.scenario = button.dataset.scenario;
    render();
  });

  $("#otherGain").addEventListener("input", (event) => {
    state.otherGain = Number(event.target.value || 0);
    renderNumbers();
  });

  $("#useSelectedDate").addEventListener("click", () => {
    renderNumbers();
  });
}

bindEvents();
render();
