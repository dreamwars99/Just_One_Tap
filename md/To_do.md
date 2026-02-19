# To-Do List - Just One Tap (J_O_T)

Updated: 2026-02-19 (6차, 선택/제외/하드삭제 기능 반영)

## 1) 현재 상태 요약
- [x] Unity 기본 프로젝트 구조/에디터 툴 준비 완료
- [x] Figma 전체 SVG 추출 플러그인(`figma-plugin/export-all-svg`) 동작 확인
- [x] 플러그인 메타데이터 확장 1차 완료 (`_node_layout.json` 생성)
- [x] SVG Inspector(`svg-inspector/`) 구축 완료
- [x] SVG Inspector 2패널 비교 뷰 구현 (Root SVG vs Composited SVG)
- [x] 조합 렌더 안정화 2차 반영
  - [x] 부모/자식 중복 렌더 가지치기
  - [x] screen-root 중복 합성 제거
  - [x] 하위 레이어가 0개일 때 root fallback 렌더
- [x] 기존 산출물 호환 유지 (`_manifest.json`, `_failed.json`, SVG 네이밍)
- [x] 컴포넌트 선택/제외 워크플로우 반영 (트리 <-> 합성 뷰 단일 선택 동기화)
- [x] 비파괴 제외 + 하드삭제(네이티브 모드 전용) + exclusions 매니페스트 지원

## 2) Figma 추출 파이프라인
- [x] `_node_layout.json` 스키마 1차 반영
  - [x] `nodeId`, `parentId`, `depth`, `zIndex`, `bbox`, `screenRootId`, `relativePath`, `zipPath`
  - [x] `bbox`: `absoluteRenderBounds` 우선, 없으면 `absoluteBoundingBox`, 둘 다 없으면 `null`
- [x] UI 완료 로그에 메타 파일 생성 안내 추가
- [x] README에 출력 파일/재추출 절차 문서화
- [ ] Figma에서 실제 재추출 실행 후 샘플 ZIP 검증
  - [ ] ZIP 루트에 `_node_layout.json` 포함 확인
  - [ ] `entries[].zipPath`와 실제 경로 1:1 매칭 확인

## 3) SVG Inspector (Unity 외부 검수 앱)
- [x] 화면(root SVG) 기준 미리보기 + 검수 상태(`pending/approved/hold`) + 메모
- [x] `unity-inspection-manifest.json` 저장/불러오기
- [x] 2패널 비교 뷰 구현
  - [x] 좌: root 최상위 SVG
  - [x] 우: `_node_layout.json` 기반 조합 렌더 SVG
  - [x] `All`(권장) / `Leaf`(진단) 모드 제공
- [x] 조합 렌더링 안정화
  - [x] 동일 서브트리 중복 렌더 제거(ancestor 우선)
  - [x] screen-root 중복 렌더 제거
  - [x] zero-layer 시 screen-root fallback
- [x] 파일 트리 + `ROOT/USED/UNUSED/FAILED` 배지 표시
- [x] 트리/합성 뷰 단일 선택 모델(`ComponentSelection`) 동기화
- [x] `Exclude` / `Restore`(비파괴) 즉시 반영
- [x] `Delete File` 하드삭제 지원 (네이티브 모드 전용, fallback 비활성화)
- [x] 자동 제외 프리셋(`deviceChrome`, `keyboard`) 지원
- [x] `svg-inspector-exclusions.json` 저장/불러오기 + localStorage 복원
- [x] 사용자 필터로 레이어 0건 시 안내 메시지 표시 (`All layers excluded by current filters.`)
- [ ] overlay / opacity 슬라이더 / diff 보조 표시
- [ ] 대용량(3k+ SVG) 성능 최적화

## 4) Unity 연동
- [ ] `unity-inspection-manifest.json`를 읽어 후속 자동화 입력으로 연결
- [ ] `_node_layout.json` 기준 좌표/계층 매핑 설계 확정
- [ ] `svg-inspector-exclusions.json`를 Unity 후속 자동화 입력 정책에 반영
- [ ] 씬/프리팹 자동 배치 도구 초안 작성

## 5) 재추출 권장 옵션 (현재 기준)
- [x] Scope: `all-pages`
- [x] Include hidden nodes: `OFF`
- [x] Include locked nodes: `ON`
- [x] Only leaf render nodes: `OFF` (root + 조합 비교/진단 목적)
- [x] Outline text in SVG: `ON` (폰트 차이 최소화)

## 6) 저장소/보안 관리
- [x] `.env`는 Git 추적 제외
- [x] Figma 산출물(`Page 1/`, `_manifest.json`, `_failed.json`, ZIP) 로컬 산출물로 관리
- [x] `figma-svg-export-*` 폴더 산출물 Git 제외 유지
- [x] `svg-inspector-exclusions.json` 로컬 검수 산출물로 관리

---

## 참조 문서

| 문서 | 용도 |
|:---|:---|
| `project_proposal.md` | 기획서 — UX/UI, User Flow, Gamification, Tech Stack |
| `Dev-Roadmap.md` | Phase별 목표 및 일정 (Day 1-14) |
| `Architecture.md` | MCV, Core Loop, Data Schema, 컴포넌트 역할 |
| `Tree.md` | 폴더/씬/스크립트 구조 |
| `CURSOR_GUIDELINES.md` | 해상도 대응(VLG/HLG/RectTransform), MCV, 금지 사항 |

---

## Current Status

- Project: Just One Tap (J_O_T)
- Phase: Phase 0 Foundation
- Engine: Unity 2022.3 LTS (2D URP)
- Last Sync: 2026-02-19 (6차, 선택/제외/하드삭제 + exclusions 반영)

---

# Phase 0: Foundation (Day 1-2)

## 0.1 Project Setup

- [ ] Unity 프로젝트 생성
  - [ ] Unity Hub -> New Project -> 2D (URP) 템플릿
  - [ ] Project Name: `Just_One_Tap`
- [x] 해상도/플랫폼 설정
  - [x] `ProjectSetupTool`에 Player Settings 자동 적용 기능 추가
  - [x] Player Settings 자동 적용(Identity, Portrait 고정, Android 빌드 설정)
  - [ ] Canvas Scale With Screen Size 규칙 정리
- [ ] Git 및 보안
  - [ ] `google-services.json`, `GoogleService-Info.plist`, API 키 제외 확인
- [x] 폴더 구조 및 초기화 툴
  - [x] `Assets/Editor/ProjectSetupTool.cs`
  - [x] `_Project` 하위 기본 폴더 자동 생성
  - [x] Core 매니저 스크립트 템플릿 자동 생성

## 0.2 Asset Pipeline (패키지/에셋)

- [x] PackageInstaller 툴 구현
  - [x] `com.unity.vectorgraphics`
  - [x] `com.unity.localization`
- [ ] DOTween 설치
- [x] Firebase SDK 수동 임포트 완료
  - [x] Auth, Firestore, Analytics, Crashlytics, Messaging
- [x] Localization 리소스 기본 파일 생성
  - [x] `Assets/_Project/Resources/Localization/en.json`
  - [x] `Assets/_Project/Resources/Localization/ko.json`
- [ ] 리소스 임포트(Figma/에셋)
  - [x] Figma SVG 추출 플러그인 개발
  - [x] `all-pages` 기준 1회 추출 검증 (`totalTargets=4104`, `exported=3302`, `failed=802`)
  - [x] SVG Inspector 구축
  - [ ] SVG 산출물 Unity 아트 폴더 재분류
  - [ ] 실패 802건 후처리 정책 확정

## 0.3 Base Architecture

- [x] Core 매니저 스크립트 템플릿 생성
  - [x] `GameManager`, `RoutineManager`, `DataManager`, `LocalizationManager`, `AuthManager`
- [ ] 씬 및 빌드
  - [ ] `Intro.unity`, `Main.unity` 구성
  - [ ] Build Settings 정리
- [ ] 씬 내 매니저 배치 점검

## 0.4 UISetupTool 이식 및 J_O_T 적응

- [ ] `UISetupTool` 이식
- [ ] `SafeArea_Container` / `Panel_Intro` / `Panel_Auth` / `Panel_Main` 계층 반영
- [ ] VLG/HLG 기준 자동 배치 강제
- [ ] `LayoutElement` 강제 부착
- [ ] `AutoLinkScripts` 규칙 문서화 및 구현

---

# Phase 1: The Core Loop (Day 3-5)

## 1.1 Main UI 구축

- [ ] Top/Center/Bottom 3단 레이아웃 고정
- [ ] Top Bar: 국기/연속일수/포인트
- [ ] Center: Tap 버튼 + 상태 텍스트
- [ ] Bottom Nav: Ranking/Home/Profile

## 1.2 메인 버튼 인터랙션

- [ ] 탭 애니메이션(DOTween)
- [ ] 햅틱 피드백
- [ ] `RoutineManager.TryRoutineAction()` 연동

## 1.3 RoutineManager 로직

- [ ] 1일 1회 제한
- [ ] Streak 계산
- [ ] 날짜 변경 감지

## 1.4 광고 연동

- [ ] 전면 광고 플로우
- [ ] Ad SDK 연결 또는 테스트 플레이스홀더

---

# Phase 2: User Context & Data (Day 6-8)

## 2.1 Onboarding UX

- [ ] Intro 연출(Fade/Typing)
- [ ] User Info(선택)
- [ ] Goal Setting Slider + 통화 단위 표시

## 2.2 Data Persistence

- [ ] 로컬 JSON 저장/로드
- [ ] Firestore 동기화 + 실패 시 로컬 유지

---

# Phase 3: Social & Localization (Day 9-11)

## 3.1 Ranking System

- [ ] Collect / Buy 탭 리더보드
- [ ] 국가코드 -> 국기 매핑

## 3.2 Localization

- [ ] UI 문자열 등록
- [ ] 설정 화면 언어 전환 반영

## 3.3 Profile & Settings

- [ ] Profile(닉네임/아바타/스트릭 캘린더)
- [ ] Settings(알림/사운드/햅틱/계정/초기화)

## 3.4 Progression (Milestone)

- [ ] 10/20/30 탭 마일스톤 시각화

---

# Phase 4: Polish & Launch (Day 12-14)

## 4.1 Juice

- [ ] Confetti 연출
- [ ] 사운드 정리
- [ ] 햅틱 포인트 정리

## 4.2 Theme & QA

- [ ] Nintendo White 테마 고정
- [ ] 다해상도/다국어 QA

---

# Completed (완료된 작업)

### 2026-02-19 (6차)
- SVG Inspector 선택/삭제 기능 1차 구현
  - 트리/합성 뷰 단일 선택 동기화
  - `Exclude`/`Restore` 비파괴 제외 동작 추가
  - `Delete File` 하드삭제 추가 (네이티브 모드 전용)
  - 자동 제외 프리셋(`deviceChrome`, `keyboard`) 추가
  - `svg-inspector-exclusions.json` import/export + localStorage 복원
  - 사용자 제외로 0레이어 시 fallback 대신 안내 메시지 출력

### 2026-02-19 (4차)
- SVG Inspector 조합 렌더 안정화
  - 부모/자식 중복 레이어 가지치기 로직 추가
  - screen-root 제외 로직 추가
  - 하위 레이어 0건 시 root fallback 로직 추가
  - 합성 모드 운영 변경: `All` 권장, `Leaf` 진단
  - 빌드/린트 검증 완료(`npm run build`, `npm run lint`)

### 2026-02-19 (3차)
- Figma 플러그인 `_node_layout.json` 포함 버전 기준 문서화
- SVG Inspector 2패널 비교 설계/구조 확정
- 문서 정비(Architecture/Tree/To_do) 및 파이프라인 정리

### 2026-02-19 (2차)
- SVG Inspector 구축 완료
  - 폴더 선택, 화면 판정, root SVG 판정
  - 검수 상태/메모, manifest import/export, CSV export, localStorage 복원

### 2026-02-19 (1차)
- Figma SVG Export Plugin 구현 및 추출 검증 완료
  - `totalTargets=4104`, `exported=3302`, `failed=802`
  - 에러 호환성 수정(`spread` 제거, `TextEncoder` 대체 인코더)

### 2026-02-09
- `ProjectSetupTool`, `PackageInstaller` 구현
- Firebase SDK 수동 임포트 완료
