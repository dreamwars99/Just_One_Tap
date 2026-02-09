# 📅 Just One Tap: Development Roadmap

> **Goal:** Global Launch MVP within 2 Weeks.
> **Strategy:** English First, Global Standard UX.

---

## 🛑 Phase 0: Foundation (Day 1-2)
> **목표:** 깨끗한 프로젝트 환경 및 글로벌 대응 준비.

- [ ] **Project Setup:**
    - Unity 2022.3 LTS (2D URP) 신규 프로젝트 생성.
    - Git Repository & .gitignore (보안 설정).
- [ ] **Asset Pipeline:**
    - Vector Graphics (SVG), DOTween, Firebase SDK 설치.
    - Localization 패키지 세팅 (English Default).
- [ ] **Base Architecture:**
    - GameManager, RoutineManager 생성.
    - UISetupTool (UI 자동화 툴) 이식.

---

## 🏃 Phase 1: The Core Loop (Day 3-5)
> **목표:** "Ready? Just One Tap." 루틴 구현.

- [ ] **Main UI:**
    - 3단 레이아웃 (Top/Center/Bottom) 구축.
    - 메인 버튼 인터랙션 (Tap to Save).
- [ ] **Routine Logic:**
    - 1일 1회 제한 및 Streak(불꽃) 로직.
    - 날짜 변경(DateTime) 감지.
- [ ] **Ad Integration:**
    - AdMob 전면 광고 연동 및 보상 처리.

---

## 🧩 Phase 2: User Context & Data (Day 6-8)
> **목표:** 온보딩 및 데이터 동기화.

- [ ] **Onboarding UX:**
    - Intro: "Ready? Just One Tap." 타이핑 연출.
    - Slider: 목표 설정 (통화 단위 $ 기본).
- [ ] **Data Persistence:**
    - Local JSON 저장.
    - Firebase Firestore 동기화 (익명 로그인).

---

## 🏆 Phase 3: Social & Localization (Day 9-11)
> **목표:** 경쟁 요소 및 다국어 지원.

- [ ] **Ranking System:**
    - Collect / Buy 리더보드 UI.
    - 국가별 국기 표시.
- [ ] **Localization:**
    - UI 텍스트(영어/한국어) 매핑.
    - 설정(Settings)에서 언어 변경 기능.
- [ ] **Profile:**
    - 캘린더 및 마일스톤 시각화.

---

## 🚀 Phase 4: Polish & Launch (Day 12-14)
> **목표:** 글로벌 스탠다드 마감 품질.

- [ ] **Juice it up:**
    - 파티클(Confetti), 햅틱, 사운드 폴리싱.
- [ ] **Theme:**
    - White Theme (Nintendo Style) 완성.
- [ ] **QA:**
    - 다양한 해상도 및 OS 언어 설정 테스트.