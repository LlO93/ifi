import { useEffect, useMemo, useState } from 'react'
import { SafeArea } from '@apps-in-toss/web-framework'
import { ChevronRight, Search } from './components/icons'
import './App.css'

type RankingMetric = 'volume' | 'marketCap'

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

function App() {
  const [metric, setMetric] = useState<RankingMetric>('volume')
  const [showAll, setShowAll] = useState(false)
  const [notice, setNotice] = useState('')
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

  const rankedStocks = useMemo(
    () => [...stocks].sort((a, b) => a[`${metric}Rank`] - b[`${metric}Rank`]),
    [metric],
  )
  const visibleStocks = showAll ? rankedStocks : rankedStocks.slice(0, 5)
  const announceNextScreen = (screen: string) => setNotice(`${screen} 화면은 다음 이전 단계에서 연결할게요.`)

  return (
    <main className="explore canvas" style={{ '--safe-area-bottom': `${safeAreaBottom}px` } as React.CSSProperties}>
      <section className="explore-content" aria-labelledby="explore-title">
        <header className="hero-copy">
          <p className="eyebrow">그 주식 샀다면</p>
          <h1 id="explore-title">어떤 선택이 궁금하세요?</h1>
          <p>미국 주식을 고르고, 과거의 다른 선택을 비교해 보세요.</p>
        </header>

        <button className="search-entry" type="button" onClick={() => announceNextScreen('종목 검색')}>
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
                  <button className="stock-row" type="button" onClick={() => announceNextScreen(`${stock.name} 종목 상세`)} aria-label={`${index + 1}위 ${stock.name}, ${stock.price}, ${stock.change}`}>
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
