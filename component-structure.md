# 컴포넌트 및 파일 구조

```text
모의투자앱/
├── PROJECT_STATUS.md       — 작업 시작 시 먼저 읽고 종료 시 갱신하는 현재 상태 요약
├── index.html              — 앱 기본 HTML과 CSS·JavaScript 로딩 순서
├── main.js                 — Vite 진입점과 기존 JavaScript 모듈 실행 순서
├── style.css               — 전체 화면의 색상·레이아웃·컴포넌트 스타일
├── app.js                  — 화면 상태·화면 생성·이동·스와이프·이벤트 처리
├── js/
│   ├── components.js       — 공통 버튼·입력 필드·종목 목록 HTML 생성
│   ├── records.js          — 브라우저 데모 기록 저장·조회·복기 메모·필터·삭제/실행 취소
│   ├── demo-flow.js        — 가상 가격·차트 날짜 선택·입력 검증·데모 계산 화면
│   └── live-market.js      — 실제 가격 조회·검색·차트·기준일 표시
├── server/
│   ├── index.mjs           — 개인 개발용 HTTP 서버·정적 파일 허용 목록
│   └── market.mjs          — Alpha Vantage 호출·캐시·오류·가격 검증
├── tests/market.test.mjs   — 시세 응답·캐시·오류 처리 검증
├── package.json           — Vite 빌드·서버 실행·테스트 명령과 버전
├── pnpm-lock.yaml         — 설치된 Vite 의존성 버전 잠금
├── .env.example           — 비밀키 설정 예시 (.env.local은 Git 제외)
├── 실제데이터연결.md        — 실행·키 발급·이용 범위 안내
├── archive/
│   └── 20260916-113745/     — 이전 프로토타입 원본 보관
├── AGENTS.md               — 프로젝트 작업 지침
├── 시작아이디어.md          — 현재 제품 목표와 MVP 요약
├── 시작아이디어_초기안.md   — 이전 기획 원문
├── MVP개발명세.md           — 기능 범위·계산 규칙·데이터 설계
├── 화면설계.md              — 화면 구성·레이아웃·상호작용 명세
└── component-structure.md  — 파일 구조와 각 파일의 역할 정리
```

## 로딩과 역할

- 다음 작업의 컨텍스트는 `PROJECT_STATUS.md`에서 시작한다. 전체 구조를 다시 읽기보다 작업별 파일 안내에 따라 필요한 파일만 확인한다.

- `index.html`은 Vite 진입점 `main.js`를 모듈로 불러오며, `main.js`가 `js/components.js` → `js/records.js` → `js/demo-flow.js` → `app.js` → `js/live-market.js` 순서로 실행한다.
- `npm run build`는 Vite로 배포용 `dist/`를 만들며, `dist/`와 로컬 Vercel 연결 정보는 Git에서 제외한다.
- `components.js`는 `window.IFComponents`로 button, field, stockList를 제공한다. 종목 목록은 names와 state를 인자로 받아 HTML만 생성한다.
- 상태 관리, 화면 렌더링, 이벤트, 뒤로가기·스와이프는 아직 `app.js`에 유지한다.
- `demo-flow.js`는 가상 가격으로 날짜 선택, 자금 입력, 정수 주식 매수 및 잔고 비교를 제공한다. 실제 시세·기업행동 처리는 구현하지 않았다. 결과는 입력값에 따라 바뀌지만 출시용 계산 엔진은 아니다.
- `records.js`는 `localStorage`의 `invest-if.demo-records.v1`에 입력 조건·결과·복기 메모를 저장한다. 서버·계정 동기화는 없으며 브라우저 데이터 삭제 시 기록도 사라진다. 저장 실패·잘못된 저장 형식은 안내하고 기존 데이터를 임의 초기화하지 않는다.
- 실제 시세 조회는 `live-market.js`와 `/api/market/*`를 사용한다. 계산·기록 탭은 여전히 가상 데이터다. 개인 키가 없으면 공식 IBM 예제로 연결을 검증하고, 무료 개인 키 설정 후 지원 미국 주식 검색·조회가 가능하다. 시세의 실제 투자 계산 연결과 공개 서비스 이용 권한은 별도 확인이 필요하다.
