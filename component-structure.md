# 컴포넌트 및 파일 구조

```text
모의투자앱/
├── index.html              — 앱 기본 HTML과 CSS·JavaScript 로딩 순서
├── style.css               — 전체 화면의 색상·레이아웃·컴포넌트 스타일
├── app.js                  — 화면 상태·화면 생성·이동·스와이프·이벤트 처리
├── js/
│   └── components.js       — 공통 버튼·입력 필드·종목 목록 HTML 생성
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

- `index.html`에서 `js/components.js` → `app.js` 순서로 `defer` 로드한다.
- `components.js`는 `window.IFComponents`로 button, field, stockList를 제공한다. 종목 목록은 names와 state를 인자로 받아 HTML만 생성한다.
- 상태 관리, 화면 렌더링, 이벤트, 뒤로가기·스와이프는 아직 `app.js`에 유지한다.
- `style.css`는 이번 분리에서 변경하지 않았다. 시세·계산 결과는 기존과 같은 고정 예시다.
