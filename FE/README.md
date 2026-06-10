# B201 Frontend (FE)

B201 공간 예약 서비스의 프론트엔드 프로젝트입니다.
React + TypeScript + Vite 기반으로 구성되어 있으며,
모바일 웹 UI를 기준으로 개발됩니다.

---

## 🧩 Tech Stack

* React 19
* TypeScript
* Vite
* React Router
* Axios
* ESLint

---

## 🚀 실행 방법

### 1. 프로젝트 이동

```bash
cd fe
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

### 4. 브라우저 접속

```
http://localhost:5173
```

---

## 📦 주요 스크립트

```bash
npm run dev       # 개발 서버 실행
npm run build     # 빌드
npm run preview   # 빌드 결과 확인
npm run lint      # 코드 검사
```

---

## 🔧 환경 변수

`.env`에 아래 값을 설정하면 사이드 네비 하단에 송금 링크가 표시됩니다.

```env
VITE_COFFEE_DONATION_URL=https://example.com/pay
```

---

## 📁 프로젝트 구조

```txt
src/
  apis/           # API 호출
  assets/         # 이미지, 아이콘
  components/     # 재사용 UI 컴포넌트
  hooks/          # 커스텀 훅
  pages/          # 화면 단위 페이지
  utils/          # 공통 유틸 함수

  styles/         # 전역 스타일 및 CSS 시스템
    variables.css
    globals.css
    layout.css
    calendar.css
    timeline.css
    button.css
```

---

## 🧱 구조 설계 원칙

### 1. Pages vs Components

| 구분         | 역할          |
| ---------- | ----------- |
| pages      | 화면 단위 (라우트) |
| components | 재사용 UI      |

👉 Page는 "조립", Component는 "UI"

---

### 2. 컴포넌트 구조

```txt
components/
  layout/         # 레이아웃 (헤더, 프레임)
  calendar/       # 월간 캘린더
  timeline/       # 시간 타임라인
  reservation/    # 예약 관련 UI
  branding/       # 로고/이미지 영역
```

---

### 3. 예시 페이지 구조

```tsx
<MobilePageLayout>
  <PageHeader title="예약 현황" />

  <CalendarSection />

  <TimelineSection />

  <BottomHero />

  <ReservationApplyButton />
</MobilePageLayout>
```

---

## 🎨 스타일 구조 (CSS System)

### 1. 변수 기반 디자인 시스템

`styles/variables.css`

* color
* spacing
* radius
* typography
* layout
* shadow

👉 모든 스타일 값은 변수 기반으로 사용

---

### 2. 스타일 파일 구조

| 파일           | 역할             |
| ------------ | -------------- |
| globals.css  | reset + 기본 스타일 |
| layout.css   | 전체 레이아웃        |
| calendar.css | 캘린더 UI         |
| timeline.css | 타임라인 UI        |
| button.css   | 버튼             |

---

### 3. 스타일 규칙

* ❌ 숫자 직접 사용 금지
* ✅ `var(--space-16)` 같은 변수 사용
* ❌ inline style 남용 금지
* ✅ 동적 값만 inline 사용 (width, color 등)

---

## 🧠 개발 규칙

### 1. 파일명

* PascalCase 사용

```
ReservationStatusPage.tsx
CalendarSection.tsx
```

---

### 2. 컴포넌트 규칙

* 하나의 파일 = 하나의 컴포넌트
* 역할 단위로 분리
* 재사용 가능하게 설계

---

### 3. 상태 관리

초기 기준:

* useState
* useEffect
* props 전달

👉 복잡해지면 상태관리 도입 예정

---

### 4. API 구조

```txt
apis/
  client.ts
  reservationApi.ts
```

* axios 인스턴스 분리
* 도메인별 API 관리

---

## 📐 주요 화면 (현재 기준)

* 예약 현황 페이지

  * 월간 캘린더
  * 날짜별 타임라인
  * 예약 바 표시
  * 하단 CTA 버튼

---

## 🧪 개발 흐름

1. CSS 토큰 정의 (variables.css)
2. 레이아웃 구성
3. 컴포넌트 작성
4. 페이지 조립
5. 목업 데이터 적용
6. API 연결

---

## ⚠️ 주의사항

* 디자인 값은 Figma 그대로 쓰지 말 것
* 반드시 variables로 변환 후 사용
* 컴포넌트 내부에 스타일 하드코딩 금지

