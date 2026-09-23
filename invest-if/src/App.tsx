import { useEffect, useMemo, useState } from 'react'
import { SafeArea } from '@apps-in-toss/web-framework'
import { ChevronRight, Close, Search } from './components/icons'
import './App.css'

type RankingMetric = 'volume' | 'marketCap'
type DetailTab = 'chart' | 'related'
type ChartRange = '1개월' | '6개월' | '1년' | '전체'

type Stock = {
  name: string
  ticker: string
  price: string
  change: string
  volumeRank: number
  marketCapRank: number
  metric: { volume: string; marketCap: string }
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

function App() {
  const [screen, setScreen] = useState<'explore' | 'search' | 'detail'>('explore')
  const [selectedStock, setSelectedStock] = useState<Stock>(stocks[0])
  const [detailTab, setDetailTab] = useState<DetailTab>('chart')
  const [chartRange, setChartRange] = useState<ChartRange>('6개월')
  const [selectedDate, setSelectedDate] = useState('')
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
  const announceNextScreen = (screen: string) => setNotice(`${screen} 화면은 다음 이전 단계에서 연결할게요.`)
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

              <button className="selected-date" type="button" onClick={() => setSelectedDate(selectedDate === '2025.04.07' ? '2025.08.18' : '2025.04.07')}>
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

        <div className="detail-cta"><button type="button" onClick={() => setNotice(selectedDate ? `${selectedStock.ticker} 가상 매수 입력은 다음 단계에서 연결할게요.` : '가상 매수일은 다음 화면에서 선택할 수 있어요.')}>{selectedStock.ticker} 이날 샀다면?</button>{notice && <p role="status">{notice}</p>}</div>
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
        <button type="button" onClick={() => announceNextScreen('내 기록')}>내 기록</button>
      </nav>
    </main>
  )
}

export default App
