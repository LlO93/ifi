import { useEffect, useMemo, useState } from 'react'
import { SafeArea } from '@apps-in-toss/web-framework'
import { ChevronRight, Close, Search } from './components/icons'
import './App.css'

type RankingMetric = 'volume' | 'marketCap'
type DetailTab = 'chart' | 'related'
type ChartRange = '1개월' | '6개월' | '1년' | '전체'
type FundingSource = 'cash' | 'stock' | 'both'
type BudgetChoice = '100' | '50' | '30' | 'custom'
type RecordFilter = 'all' | FundingSource

type Stock = {
  name: string
  ticker: string
  price: string
  change: string
  volumeRank: number
  marketCapRank: number
  metric: { volume: string; marketCap: string }
}

type RecordSnapshot = {
  id: number
  ticker: string
  selectedDate: string
  evaluatedDate: string
  fundingSource: FundingSource
  cashAmount: string
  holdingQuantity: string
  sellQuantity: string
  budgetChoice: BudgetChoice
  customBudget: string
  expectedBalance: number
  choiceDifference: number
  memo: string
}

const stocks: Stock[] = [
  { name: '엔비디아', ticker: 'NVDA', price: '$189.21', change: '+2.34%', volumeRank: 1, marketCapRank: 2, metric: { volume: '거래량 1.82억 주', marketCap: '시가총액 $4.62조' } },
  { name: '테슬라', ticker: 'TSLA', price: '$442.79', change: '+1.08%', volumeRank: 2, marketCapRank: 8, metric: { volume: '거래량 1.21억 주', marketCap: '시가총액 $1.47조' } },
  { name: '애플', ticker: 'AAPL', price: '$338.98', change: '+0.72%', volumeRank: 5, marketCapRank: 1, metric: { volume: '거래량 6,421만 주', marketCap: '시가총액 $5.11조' } },
  { name: '마이크로소프트', ticker: 'MSFT', price: '$517.44', change: '-0.31%', volumeRank: 8, marketCapRank: 3, metric: { volume: '거래량 2,198만 주', marketCap: '시가총액 $3.85조' } },
  { name: '아마존', ticker: 'AMZN', price: '$232.15', change: '+0.46%', volumeRank: 4, marketCapRank: 4, metric: { volume: '거래량 7,030만 주', marketCap: '시가총액 $2.49조' } },
  { name: '알파벳', ticker: 'GOOGL', price: '$252.07', change: '-0.18%', volumeRank: 7, marketCapRank: 5, metric: { volume: '거래량 3,016만 주', marketCap: '시가총액 $3.05조' } },
]

const RECENT_SEARCHES_KEY = 'invest-if.recent-searches.v1'
const RESULT_MEMO_KEY = 'invest-if.result-memo.v1'
const RECORDS_KEY = 'invest-if.records.v1'

const formatUsd = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatSignedUsd = (value: number) => `${value >= 0 ? '+' : '-'}${formatUsd(Math.abs(value))}`
const readResultMemo = () => {
  try {
    return localStorage.getItem(RESULT_MEMO_KEY) ?? ''
  } catch {
    return ''
  }
}
const readRecords = (): RecordSnapshot[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function App() {
  const [screen, setScreen] = useState<'explore' | 'search' | 'detail' | 'simulate' | 'result' | 'records'>('explore')
  const [selectedStock, setSelectedStock] = useState<Stock>(stocks[0])
  const [detailTab, setDetailTab] = useState<DetailTab>('chart')
  const [chartRange, setChartRange] = useState<ChartRange>('6개월')
  const [selectedDate, setSelectedDate] = useState('')
  const [fundingSource, setFundingSource] = useState<FundingSource>('cash')
  const [cashAmount, setCashAmount] = useState('')
  const [holdingQuantity, setHoldingQuantity] = useState('10')
  const [sellQuantity, setSellQuantity] = useState('0')
  const [budgetChoice, setBudgetChoice] = useState<BudgetChoice>('100')
  const [customBudget, setCustomBudget] = useState('')
  const [saveFunds, setSaveFunds] = useState(false)
  const [simulateError, setSimulateError] = useState('')
  const [showMemoEditor, setShowMemoEditor] = useState(false)
  const [memoDraft, setMemoDraft] = useState(readResultMemo)
  const [savedMemo, setSavedMemo] = useState(readResultMemo)
  const [records, setRecords] = useState<RecordSnapshot[]>(readRecords)
  const [activeRecordId, setActiveRecordId] = useState<number | null>(null)
  const [recordQuery, setRecordQuery] = useState('')
  const [recordFilter, setRecordFilter] = useState<RecordFilter>('all')
  const [recordSaveFailed, setRecordSaveFailed] = useState(false)
  const [metric, setMetric] = useState<RankingMetric>('volume')
  const [showAll, setShowAll] = useState(false)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [searchError, setSearchError] = useState('')
  const [recentTickers, setRecentTickers] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? '[]')
      return Array.isArray(saved) ? saved.filter((value): value is string => typeof value === 'string').slice(0, 5) : []
    } catch {
      return []
    }
  })
  const [safeAreaBottom, setSafeAreaBottom] = useState(() => {
    try {
      return SafeArea.get().bottom
    } catch {
      return 0
    }
  })

  useEffect(() => {
    try {
      return SafeArea.subscribe({ onEvent: (insets) => setSafeAreaBottom(insets.bottom) })
    } catch {
      return undefined
    }
  }, [])

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      if (event.state?.screen === 'detail') {
        const stock = stocks.find((item) => item.ticker === event.state.ticker)
        if (stock) setSelectedStock(stock)
        setScreen('detail')
        return
      }
      if (event.state?.screen === 'simulate') {
        const stock = stocks.find((item) => item.ticker === event.state.ticker)
        if (stock) setSelectedStock(stock)
        setScreen('simulate')
        return
      }
      if (event.state?.screen === 'result') {
        const stock = stocks.find((item) => item.ticker === event.state.ticker)
        if (stock) setSelectedStock(stock)
        setScreen('result')
        return
      }
      if (event.state?.screen === 'records') {
        setScreen('records')
        return
      }
      setScreen(event.state?.screen === 'search' ? 'search' : 'explore')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      const timer = window.setTimeout(() => setDebouncedQuery(''), 0)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      try {
        setSearchError('')
        setDebouncedQuery(query.trim())
      } catch {
        setSearchError('검색 결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const rankedStocks = useMemo(
    () => [...stocks].sort((a, b) => a[`${metric}Rank`] - b[`${metric}Rank`]),
    [metric],
  )
  const visibleStocks = showAll ? rankedStocks : rankedStocks.slice(0, 5)
  const searchResults = useMemo(() => {
    const normalized = debouncedQuery.toLocaleLowerCase('ko-KR')
    if (!normalized) return []
    return stocks.filter((stock) =>
      `${stock.name} ${stock.ticker}`.toLocaleLowerCase('ko-KR').includes(normalized),
    )
  }, [debouncedQuery])
  const recentStocks = recentTickers
    .map((ticker) => stocks.find((stock) => stock.ticker === ticker))
    .filter((stock): stock is Stock => stock != null)
  const isSearching = Boolean(query.trim()) && query.trim() !== debouncedQuery

  const openSearch = () => {
    setNotice('')
    setScreen('search')
    window.history.pushState({ screen: 'search' }, '')
  }

  const closeSearch = () => {
    if (screen === 'search') window.history.back()
  }

  const openDetail = (stock: Stock) => {
    setNotice('')
    setSelectedStock(stock)
    setDetailTab('chart')
    setScreen('detail')
    window.history.pushState({ screen: 'detail', ticker: stock.ticker }, '')
  }

  const chooseStock = (stock: Stock) => {
    const nextRecent = [stock.ticker, ...recentTickers.filter((ticker) => ticker !== stock.ticker)].slice(0, 5)
    setRecentTickers(nextRecent)
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextRecent))
    } catch {
      // 저장이 막혀도 검색과 선택은 계속 사용할 수 있다.
    }
    setNotice('')
    openDetail(stock)
  }

  const openSimulation = () => {
    setNotice('')
    setSimulateError('')
    setMemoDraft('')
    setSavedMemo('')
    setActiveRecordId(null)
    setScreen('simulate')
    window.history.pushState({ screen: 'simulate', ticker: selectedStock.ticker }, '')
  }

  const openRecords = () => {
    setNotice('')
    setScreen('records')
    window.history.pushState({ screen: 'records' }, '')
  }

  const stockPrice = Number(selectedStock.price.replace(/[$,]/g, ''))
  const cashValue = Number(cashAmount) || 0
  const holdingValue = Number(holdingQuantity) || 0
  const sellValue = Number(sellQuantity) || 0
  const estimatedSale = fundingSource === 'cash' ? 0 : sellValue * 100
  const availableFunds = (fundingSource === 'stock' ? 0 : cashValue) + estimatedSale
  const budget = budgetChoice === 'custom' ? Number(customBudget) || 0 : availableFunds * Number(budgetChoice) / 100
  const expectedShares = stockPrice > 0 ? Math.floor(budget / stockPrice) : 0
  const remainingCash = Math.max(0, availableFunds - expectedShares * stockPrice)
  const actualPurchase = expectedShares * stockPrice
  const currentTargetPrice = stockPrice * 1.2
  const remainingHolding = fundingSource === 'cash' ? 0 : Math.max(0, holdingValue - sellValue)
  const existingHoldingNow = remainingHolding * 120
  const newHoldingNow = expectedShares * currentTargetPrice
  const startingAssets = (fundingSource === 'stock' ? 0 : cashValue) + (fundingSource === 'cash' ? 0 : holdingValue * 100)
  const expectedBalance = remainingCash + existingHoldingNow + newHoldingNow
  const holdBalance = (fundingSource === 'stock' ? 0 : cashValue) + (fundingSource === 'cash' ? 0 : holdingValue * 120)
  const startDifference = expectedBalance - startingAssets
  const startReturn = startingAssets > 0 ? startDifference / startingAssets * 100 : 0
  const choiceDifference = expectedBalance - holdBalance

  const calculateSimulation = () => {
    if (!selectedDate) {
      setSimulateError('가상 매수일을 선택해 주세요. 날짜를 선택하면 당시 종가를 확인할 수 있어요.')
      return
    }
    if (fundingSource !== 'stock' && cashValue <= 0) {
      setSimulateError('예수금을 0보다 크게 입력해 주세요.')
      return
    }
    if (fundingSource !== 'cash' && (holdingValue <= 0 || sellValue <= 0 || sellValue > holdingValue)) {
      setSimulateError('팔 수량은 1주 이상, 당시 보유 수량 이하여야 해요.')
      return
    }
    if (budget <= 0 || budget > availableFunds) {
      setSimulateError('투자금은 가용 자금 안에서 입력해 주세요.')
      return
    }
    if (expectedShares < 1) {
      setSimulateError(`${selectedStock.name} 1주를 사려면 최소 ${selectedStock.price}가 필요해요.`)
      return
    }
    setSimulateError('')
    setNotice('')
    const record: RecordSnapshot = {
      id: Date.now(), ticker: selectedStock.ticker, selectedDate, evaluatedDate: '2026-09-21', fundingSource,
      cashAmount, holdingQuantity, sellQuantity, budgetChoice, customBudget, expectedBalance, choiceDifference, memo: savedMemo,
    }
    const nextRecords = [record, ...records]
    setRecords(nextRecords)
    setActiveRecordId(record.id)
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(nextRecords))
      setRecordSaveFailed(false)
    } catch {
      setRecordSaveFailed(true)
      setNotice('계산 결과는 볼 수 있지만 이 기기의 기록 목록에는 저장하지 못했어요.')
    }
    setScreen('result')
    window.history.pushState({ screen: 'result', ticker: selectedStock.ticker }, '')
  }

  const saveMemo = () => {
    const nextMemo = memoDraft.trim()
    setSavedMemo(nextMemo)
    setShowMemoEditor(false)
    try {
      localStorage.setItem(RESULT_MEMO_KEY, nextMemo)
      if (activeRecordId != null) {
        const nextRecords = records.map((record) => record.id === activeRecordId ? { ...record, memo: nextMemo } : record)
        setRecords(nextRecords)
        localStorage.setItem(RECORDS_KEY, JSON.stringify(nextRecords))
      }
    } catch {
      setNotice('메모를 이 기기에 저장하지 못했어요. 내용을 복사한 뒤 다시 시도해 주세요.')
      return
    }
    setNotice(nextMemo ? '복기 메모를 이 기기에 저장했어요.' : '저장된 복기 메모를 비웠어요.')
  }

  const openRecord = (record: RecordSnapshot) => {
    const stock = stocks.find((item) => item.ticker === record.ticker)
    if (!stock) return
    setSelectedStock(stock)
    setSelectedDate(record.selectedDate)
    setFundingSource(record.fundingSource)
    setCashAmount(record.cashAmount)
    setHoldingQuantity(record.holdingQuantity)
    setSellQuantity(record.sellQuantity)
    setBudgetChoice(record.budgetChoice)
    setCustomBudget(record.customBudget)
    setMemoDraft(record.memo)
    setSavedMemo(record.memo)
    setActiveRecordId(record.id)
    setRecordSaveFailed(false)
    setNotice('')
    setScreen('result')
    window.history.pushState({ screen: 'result', ticker: stock.ticker, recordId: record.id }, '')
  }

  if (screen === 'records') {
    const normalizedQuery = recordQuery.trim().toLocaleLowerCase('ko-KR')
    const filteredRecords = records.filter((record) => {
      const stock = stocks.find((item) => item.ticker === record.ticker)
      const matchesQuery = !normalizedQuery || `${stock?.name ?? ''} ${record.ticker}`.toLocaleLowerCase('ko-KR').includes(normalizedQuery)
      return matchesQuery && (recordFilter === 'all' || record.fundingSource === recordFilter)
    })
    return (
      <main className="records-screen canvas" style={{ '--safe-area-bottom': `${safeAreaBottom}px` } as React.CSSProperties}>
        <section className="records-content" aria-labelledby="records-title">
          <header className="records-heading"><p className="eyebrow">이 브라우저에서 만든 기록</p><h1 id="records-title">내 기록</h1><p>총 {records.length}개 · 계정 동기화 전까지 이 기기에만 보관돼요.</p></header>
          <label className="records-search"><Search size={20}/><span className="sr-only">기록 종목 검색</span><input value={recordQuery} onChange={(event) => setRecordQuery(event.target.value)} placeholder="종목명 또는 티커 검색"/>{recordQuery && <button type="button" onClick={() => setRecordQuery('')} aria-label="기록 검색어 지우기"><Close size={18}/></button>}</label>
          <div className="record-filters" role="radiogroup" aria-label="자금 원천 필터">{([['all', '전체'], ['cash', '예수금'], ['stock', '주식 정리'], ['both', '혼합']] as const).map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={recordFilter === value} onClick={() => setRecordFilter(value)}>{label}</button>)}</div>

          {filteredRecords.length > 0 ? <ul className="record-list">{filteredRecords.map((record) => {
            const stock = stocks.find((item) => item.ticker === record.ticker)
            return <li key={record.id}><button type="button" onClick={() => openRecord(record)}><span className="record-title"><strong>{stock?.name ?? record.ticker}</strong><small>{record.ticker} · {record.selectedDate} → {record.evaluatedDate}</small></span><span className="record-value"><strong>{formatUsd(record.expectedBalance)}</strong><small>유지 대비 {formatSignedUsd(record.choiceDifference)}</small></span><ChevronRight size={20}/>{record.memo && <span className="record-memo">{record.memo}</span>}</button></li>
          })}</ul> : <section className="records-empty"><h2>{records.length === 0 ? '아직 계산한 기록이 없어요' : '조건에 맞는 기록이 없어요'}</h2><p>{records.length === 0 ? '관심 종목을 골라 과거에 샀다면 지금 얼마인지 계산해 보세요.' : '검색어나 자금 유형을 바꿔 다시 찾아보세요.'}</p><button type="button" onClick={() => { setScreen('explore'); window.history.pushState({ screen: 'explore' }, '') }}>종목 둘러보기</button></section>}
        </section>
        <nav className="bottom-navigation" aria-label="주요 메뉴"><button type="button" onClick={() => { setScreen('explore'); window.history.pushState({ screen: 'explore' }, '') }}>둘러보기</button><button type="button" aria-current="page">내 기록</button></nav>
      </main>
    )
  }

  if (screen === 'result') {
    return (
      <main className="result-screen canvas" style={{ '--safe-area-bottom': `${safeAreaBottom}px` } as React.CSSProperties}>
        <section className="result-content" aria-labelledby="result-title">
          <header className="result-heading">
            <p className="eyebrow">계산 결과 · 예시 데이터</p>
            <h1 id="result-title">{selectedStock.name}을 샀다면</h1>
            <p>{selectedDate} 가상 매수 → 2026-09-21 평가</p>
            <span className="save-status">{recordSaveFailed ? '예시 결과 · 기록 저장 실패' : '이 브라우저에 자동 저장됨 · 계정 동기화 안 됨'}</span>
          </header>

          <section className="balance-hero" aria-label="현재 예상 잔고">
            <span>현재 예상 잔고</span>
            <strong>{formatUsd(expectedBalance)}</strong>
            <p>시작 자산보다 {formatSignedUsd(startDifference)} ({startReturn >= 0 ? '+' : ''}{startReturn.toFixed(1)}%)</p>
            <small>입력한 자산 범위의 평가액이에요. 출금 가능한 현금과는 달라요.</small>
          </section>

          <section className="comparison-section">
            <div className="section-heading"><h2>두 선택을 비교했어요</h2><p>같은 자산에서 시작한 예시 계산이에요.</p></div>
            <div className="comparison-grid"><article><span>그대로 유지</span><strong>{formatUsd(holdBalance)}</strong></article><article><span>선택을 바꿨다면</span><strong>{formatUsd(expectedBalance)}</strong></article></div>
            <p className="comparison-copy">선택을 바꾼 경우가 {formatUsd(Math.abs(choiceDifference))} {choiceDifference >= 0 ? '더 많아요.' : '더 적어요.'}</p>
          </section>

          <section className="composition-section">
            <div className="section-heading"><h2>예상 잔고 구성</h2><p>평가일의 예시 가격으로 나눠 봤어요.</p></div>
            <dl><div><dt>{selectedStock.name} {expectedShares}주</dt><dd>{formatUsd(newHoldingNow)}</dd></div>{fundingSource !== 'cash' && <div><dt>남은 애플 {remainingHolding}주</dt><dd>{formatUsd(existingHoldingNow)}</dd></div>}<div><dt>남은 현금</dt><dd>{formatUsd(remainingCash)}</dd></div></dl>
          </section>

          <details className="conditions-card">
            <summary>계산 조건 보기</summary>
            <dl><div><dt>가상 매수일</dt><dd>{selectedDate}</dd></div><div><dt>원래 예수금</dt><dd>{formatUsd(fundingSource === 'stock' ? 0 : cashValue)}</dd></div>{fundingSource !== 'cash' && <div><dt>애플 매도 수량</dt><dd>{sellValue}주 · 주당 $100.00</dd></div>}<div><dt>투자 예산</dt><dd>{formatUsd(budget)}</dd></div><div><dt>실제 매수액</dt><dd>{formatUsd(actualPurchase)}</dd></div><div><dt>평가 기준일</dt><dd>2026-09-21</dd></div></dl>
            <p>선택한 날짜의 종가로 매도·매수한 뒤 보유했다고 가정했어요. 세금·수수료·배당과 기업행동은 반영하지 않았어요.</p>
          </details>

          <section className="memo-section">
            <div className="section-heading"><h2>복기 메모</h2><p>그때의 판단을 남겨두면 나중에 다시 볼 수 있어요.</p></div>
            {showMemoEditor ? <div className="memo-editor"><label htmlFor="result-memo">그때 왜 관심이 갔나요?</label><textarea id="result-memo" maxLength={1000} value={memoDraft} onChange={(event) => setMemoDraft(event.target.value)} placeholder="관심을 가진 이유와 실행하지 않은 이유를 적어보세요."/><div><span>{memoDraft.length}/1,000</span><button type="button" onClick={() => { setMemoDraft(savedMemo); setShowMemoEditor(false) }}>취소</button><button type="button" onClick={saveMemo}>저장</button></div></div> : <div className="memo-view"><p>{savedMemo || '아직 작성한 메모가 없어요.'}</p><button type="button" onClick={() => setShowMemoEditor(true)}>{savedMemo ? '메모 수정' : '메모 작성'}</button></div>}
          </section>

          <div className="result-actions"><button type="button" onClick={() => window.history.back()}>조건 바꿔 계산</button><button type="button" onClick={() => setNotice('실제 최신 시세 연결 후 새 평가 기록을 만들 수 있어요.')}>최신 기준으로 다시 계산</button></div>
          <button className="inline-action" type="button" onClick={() => openDetail(selectedStock)}>관련 종목 둘러보기</button>
          {notice && <p className="form-notice" role="status">{notice}</p>}
        </section>
      </main>
    )
  }

  if (screen === 'simulate') {
    const usesCash = fundingSource !== 'stock'
    const usesStock = fundingSource !== 'cash'
    return (
      <main className="simulate-screen canvas" style={{ '--safe-area-bottom': `${safeAreaBottom}px` } as React.CSSProperties}>
        <section className="simulate-content" aria-labelledby="simulate-title">
          <header className="simulate-heading">
            <p className="eyebrow">{selectedStock.name} · {selectedStock.ticker}</p>
            <h1 id="simulate-title">이날 샀다면?</h1>
            <p>과거에 사용할 수 있었던 자금으로 지금의 예상 잔고를 계산해요.</p>
          </header>

          <section className="form-section">
            <div className="section-heading"><h2>가상 매수일</h2><p>미국 증시가 열린 날을 선택해 주세요.</p></div>
            <label className="field-label" htmlFor="simulation-date">날짜</label>
            <input id="simulation-date" className="form-input" type="date" max="2026-09-21" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setSimulateError('') }} />
            {selectedDate && <p className="field-help">당시 예시 종가 {selectedStock.price}</p>}
          </section>

          <section className="form-section">
            <div className="section-heading"><h2>어떤 자금을 쓸까요?</h2><p>선택한 날짜에 실제로 사용할 수 있었던 자금만 입력해 주세요.</p></div>
            <div className="choice-grid three" role="radiogroup" aria-label="자금 원천">
              {([['cash', '예수금'], ['stock', '주식 정리'], ['both', '둘 다']] as const).map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={fundingSource === value} onClick={() => { setFundingSource(value); setSimulateError('') }}>{label}</button>)}
            </div>
            <button className="inline-action" type="button" onClick={() => setNotice('저장한 과거 자금 기록은 계정 저장을 연결한 뒤 불러올 수 있어요.')}>과거 자금 기록 불러오기</button>

            {usesCash && <div className="field-block"><label className="field-label" htmlFor="cash-amount">당시 예수금</label><div className="money-input"><span>$</span><input id="cash-amount" inputMode="decimal" placeholder="0.00" value={cashAmount} onChange={(event) => { setCashAmount(event.target.value.replace(/[^0-9.]/g, '')); setSimulateError('') }} /></div></div>}

            {usesStock && <article className="holding-card">
              <div><strong>애플</strong><small>AAPL · 당시 예시 종가 $100.00</small></div>
              <div className="quantity-fields">
                <label>당시 보유 수량<input inputMode="numeric" value={holdingQuantity} onChange={(event) => setHoldingQuantity(event.target.value.replace(/\D/g, ''))} /></label>
                <label>팔 수량<span className="input-with-action"><input inputMode="numeric" value={sellQuantity} onChange={(event) => { setSellQuantity(event.target.value.replace(/\D/g, '')); setSimulateError('') }} /><button type="button" onClick={() => setSellQuantity(holdingQuantity)}>전량</button></span></label>
              </div>
              <p>예상 매도 대금 <strong>${estimatedSale.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></p>
            </article>}
          </section>

          <section className="fund-summary" aria-live="polite"><span>가용 자금</span><strong>${availableFunds.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong><small>예수금과 예상 매도 대금의 합계예요.</small></section>

          <section className="form-section">
            <div className="section-heading"><h2>얼마를 투자할까요?</h2><p>가용 자금 안에서 선택할 수 있어요.</p></div>
            <div className="choice-grid four" role="radiogroup" aria-label="투자 비중">
              {([['100', '100%'], ['50', '50%'], ['30', '30%'], ['custom', '직접 입력']] as const).map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={budgetChoice === value} onClick={() => { setBudgetChoice(value); setSimulateError('') }}>{label}</button>)}
            </div>
            {budgetChoice === 'custom' && <div className="money-input custom-budget"><span>$</span><input inputMode="decimal" aria-label="직접 입력 투자금" placeholder="0.00" value={customBudget} onChange={(event) => { setCustomBudget(event.target.value.replace(/[^0-9.]/g, '')); setSimulateError('') }} /></div>}
          </section>

          <section className="trade-summary">
            <div className="section-heading"><h2>거래 요약</h2><p>선택한 날짜 종가로 거래했다고 가정해요.</p></div>
            <dl><div><dt>투자 예산</dt><dd>${budget.toLocaleString('en-US', { maximumFractionDigits: 2 })}</dd></div><div><dt>예상 매수 수량</dt><dd>{expectedShares}주</dd></div>{usesStock && <div><dt>남는 애플</dt><dd>{Math.max(0, holdingValue - sellValue)}주</dd></div>}<div><dt>거래 후 현금</dt><dd>${remainingCash.toLocaleString('en-US', { maximumFractionDigits: 2 })}</dd></div></dl>
          </section>

          <label className="save-option"><input type="checkbox" checked={saveFunds} onChange={(event) => setSaveFunds(event.target.checked)} /><span>이 날짜의 자금 기록으로 저장</span></label>
          {notice && <p className="form-notice" role="status">{notice}</p>}
          {simulateError && <p className="form-error" role="alert">{simulateError}</p>}
        </section>

        <div className="simulate-cta"><p>세금·수수료·배당은 계산에서 제외해요.</p><button type="button" onClick={calculateSimulation}>현재 예상 잔고 계산하기</button></div>
      </main>
    )
  }

  if (screen === 'detail') {
    const relatedStocks = stocks.filter((stock) => stock.ticker !== selectedStock.ticker).slice(0, 3)
    const chartPoints = '0,128 42,112 84,120 126,78 168,91 210,54 252,66 294,30 336,42'
    return (
      <main className="detail-screen canvas" style={{ '--safe-area-bottom': `${safeAreaBottom}px` } as React.CSSProperties}>
        <section className="detail-content" aria-labelledby="detail-title">
          <header className="stock-summary">
            <div className="stock-mark detail-mark">{selectedStock.ticker.slice(0, 1)}</div>
            <div>
              <p className="eyebrow">{selectedStock.ticker} · NASDAQ · 예시 데이터</p>
              <h1 id="detail-title">{selectedStock.name}</h1>
            </div>
            <strong className="detail-price">{selectedStock.price}</strong>
            <p className="detail-change">전일 대비 {selectedStock.change} · 2026.09.21 종가</p>
          </header>

          <div className="detail-tabs" role="tablist" aria-label="종목 상세 보기">
            <button type="button" role="tab" aria-selected={detailTab === 'chart'} onClick={() => setDetailTab('chart')}>차트</button>
            <button type="button" role="tab" aria-selected={detailTab === 'related'} onClick={() => setDetailTab('related')}>관련 종목</button>
          </div>

          {detailTab === 'chart' ? (
            <>
              <section className="chart-card" aria-label={`${selectedStock.name} 예시 가격 차트`}>
                <div className="chart-readout"><span>{selectedDate || '최근 종가'}</span><strong>{selectedStock.price}</strong></div>
                <svg viewBox="0 0 336 160" role="img" aria-label="상승과 하락을 반복하는 예시 가격 추이">
                  <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity="0.22"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
                  <path d={`M${chartPoints} L336 160 L0 160 Z`} fill="url(#chart-fill)" stroke="none" />
                  <polyline points={chartPoints} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="294" cy="30" r="5" fill="var(--color-bg)" stroke="currentColor" strokeWidth="3" />
                </svg>
              </section>

              <div className="range-controls" aria-label="차트 기간">
                {(['1개월', '6개월', '1년', '전체'] as ChartRange[]).map((range) => <button key={range} type="button" aria-pressed={chartRange === range} onClick={() => setChartRange(range)}>{range}</button>)}
              </div>

              <button className="selected-date" type="button" onClick={() => setSelectedDate(selectedDate === '2025-04-07' ? '2025-08-18' : '2025-04-07')}>
                <span><small>{selectedDate ? '선택한 날짜' : '가상 매수일'}</small><strong>{selectedDate ? `${selectedDate} · ${selectedStock.price}` : '아직 선택하지 않았어요'}</strong></span>
                <span>{selectedDate ? '날짜 변경' : '날짜 선택'}</span>
              </button>

              <section className="related-preview">
                <div className="section-heading"><h2>관련 종목</h2><p>같은 업종에서 함께 살펴보는 종목이에요.</p></div>
                <ul className="compact-stock-list">{relatedStocks.map((stock) => <li key={stock.ticker}><button type="button" onClick={() => openDetail(stock)}><span><strong>{stock.name}</strong><small>{stock.ticker}</small></span><span>{stock.price}</span><ChevronRight size={20}/></button></li>)}</ul>
                <button className="text-action" type="button" onClick={() => setDetailTab('related')}>관련 종목 더 보기</button>
              </section>
            </>
          ) : (
            <section className="related-full">
              <div className="section-heading"><h2>같은 업종의 종목</h2><p>현재 종목과 비교할 수 있는 예시 목록이에요.</p></div>
              <ul className="compact-stock-list">{stocks.filter((stock) => stock.ticker !== selectedStock.ticker).map((stock) => <li key={stock.ticker}><button type="button" onClick={() => openDetail(stock)}><span><strong>{stock.name}</strong><small>{stock.ticker} · 같은 미국 대형 기술주</small></span><span>{stock.price}<small>{stock.change}</small></span><ChevronRight size={20}/></button></li>)}</ul>
            </section>
          )}
        </section>

        <div className="detail-cta"><button type="button" onClick={openSimulation}>{selectedStock.ticker} 이날 샀다면?</button>{notice && <p role="status">{notice}</p>}</div>
      </main>
    )
  }

  if (screen === 'search') {
    const list = debouncedQuery ? searchResults : recentStocks
    return (
      <main className="search-screen canvas">
        <section className="search-content" aria-labelledby="search-title">
          <div className="search-heading">
            <p className="eyebrow">그 주식 샀다면</p>
            <h1 id="search-title">종목 검색</h1>
          </div>

          <label className="search-field">
            <span className="sr-only">종목명 또는 티커</span>
            <Search size={22} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="종목명 또는 티커 입력"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button type="button" aria-label="검색어 지우기" onClick={() => setQuery('')}>
                <Close size={20} />
              </button>
            )}
          </label>

          {notice && <p className="migration-notice" role="status">{notice}</p>}

          <section className="search-results" aria-live="polite" aria-busy={isSearching}>
            <h2>{debouncedQuery ? '검색 결과' : '최근 검색'}</h2>
            {isSearching && <p className="search-state">검색하고 있어요.</p>}
            {!isSearching && searchError && (
              <div className="search-state">
                <p>{searchError}</p>
                <button type="button" onClick={() => setDebouncedQuery(query.trim())}>다시 시도</button>
              </div>
            )}
            {!isSearching && !searchError && !debouncedQuery && list.length === 0 && (
              <p className="search-state">최근 검색한 종목이 없어요.</p>
            )}
            {!isSearching && !searchError && debouncedQuery && list.length === 0 && (
              <p className="search-state">검색 결과가 없어요. 종목명이나 티커를 다시 확인해 주세요.</p>
            )}
            {!isSearching && !searchError && list.length > 0 && (
              <ul className="result-list">
                {list.map((stock) => (
                  <li key={stock.ticker}>
                    <button type="button" onClick={() => chooseStock(stock)}>
                      <span className="stock-mark">{stock.ticker.slice(0, 1)}</span>
                      <span className="result-identity">
                        <strong>{stock.name}</strong>
                        <small>{stock.ticker} · NASDAQ · 지원</small>
                      </span>
                      <span className="result-price">{stock.price}</span>
                      <ChevronRight size={20} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <button className="return-home" type="button" onClick={closeSearch}>둘러보기로 돌아가기</button>
        </section>
      </main>
    )
  }

  return (
    <main className="explore canvas" style={{ '--safe-area-bottom': `${safeAreaBottom}px` } as React.CSSProperties}>
      <section className="explore-content" aria-labelledby="explore-title">
        <header className="hero-copy">
          <p className="eyebrow">그 주식 샀다면</p>
          <h1 id="explore-title">어떤 선택이 궁금하세요?</h1>
          <p>미국 주식을 고르고, 과거의 다른 선택을 비교해 보세요.</p>
        </header>

        <button className="search-entry" type="button" onClick={openSearch}>
          <Search size={22} />
          <span>종목명 또는 티커 검색</span>
          <ChevronRight size={20} />
        </button>

        {notice && <p className="migration-notice" role="status">{notice}</p>}

        <section className="ranking" aria-labelledby="ranking-title">
          <div className="section-heading">
            <h2 id="ranking-title">미국 주식 순위</h2>
            <p>2026년 9월 21일 종가 기준 · 예시 데이터</p>
          </div>

          <div className="metric-tabs" role="tablist" aria-label="순위 기준">
            <button type="button" role="tab" aria-selected={metric === 'volume'} onClick={() => { setMetric('volume'); setShowAll(false) }}>거래량</button>
            <button type="button" role="tab" aria-selected={metric === 'marketCap'} onClick={() => { setMetric('marketCap'); setShowAll(false) }}>시가총액</button>
          </div>

          <ol className="stock-list">
            {visibleStocks.map((stock, index) => {
              const isPositive = stock.change.startsWith('+')
              return (
                <li key={stock.ticker}>
                  <button className="stock-row" type="button" onClick={() => openDetail(stock)} aria-label={`${index + 1}위 ${stock.name}, ${stock.price}, ${stock.change}`}>
                    <span className="rank-number">{index + 1}</span>
                    <span className="stock-identity" aria-hidden="true">
                      <span className="stock-mark">{stock.ticker.slice(0, 1)}</span>
                      <span>
                        <strong>{stock.name}</strong>
                        <small>{stock.ticker} · {stock.metric[metric]}</small>
                      </span>
                    </span>
                    <span className="stock-quote" aria-hidden="true">
                      <strong>{stock.price}</strong>
                      <small className={isPositive ? 'positive' : 'negative'}>{stock.change}</small>
                    </span>
                    <ChevronRight size={20} />
                  </button>
                </li>
              )
            })}
          </ol>

          {!showAll && <button className="more-button" type="button" onClick={() => setShowAll(true)}>순위 더 보기</button>}
        </section>
      </section>

      <nav className="bottom-navigation" aria-label="주요 메뉴">
        <button type="button" aria-current="page">둘러보기</button>
        <button type="button" onClick={openRecords}>내 기록</button>
      </nav>
    </main>
  )
}

export default App
