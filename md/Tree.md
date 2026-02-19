# Project Tree - Just One Tap (J_O_T)

Updated: 2026-02-19 (7차, Open In Explorer 안정화 반영)

## 1) Repository Root

```text
Just_One_Tap/
├─ Assets/                                  # Unity 프로젝트 본체
├─ figma-plugin/
│  └─ export-all-svg/                       # Figma 플러그인 소스
├─ svg-inspector/                           # Unity 외부 SVG 검수 앱
├─ md/                                      # 운영/아키텍처/작업 문서
├─ tools/                                   # 보조 자동화 스크립트
├─ figma-svg-export-2026-02-19T06-14-47-384Z/  # 로컬 추출 샘플 폴더
├─ .env                                     # 로컬 시크릿 (gitignore)
├─ .gitignore
└─ Just_One_Tap.sln
```

## 2) Unity Structure (핵심)

```text
Assets/
├─ _Project/
│  ├─ Art/
│  │  ├─ Icons/
│  │  ├─ UI/
│  │  └─ Fonts/
│  ├─ Resources/
│  │  └─ Localization/
│  │     ├─ en.json
│  │     └─ ko.json
│  ├─ Scripts/
│  │  ├─ Core/
│  │  │  ├─ GameManager.cs
│  │  │  ├─ RoutineManager.cs
│  │  │  ├─ DataManager.cs
│  │  │  ├─ LocalizationManager.cs
│  │  │  └─ AuthManager.cs
│  │  ├─ UI/
│  │  └─ Utils/
│  ├─ Scenes/
│  └─ Prefabs/
├─ Editor/
│  ├─ ProjectSetupTool.cs
│  └─ PackageInstaller.cs
├─ Figma/
├─ FigmaSvgTest/
└─ Firebase/
```

## 3) Figma Plugin Structure

```text
figma-plugin/export-all-svg/
├─ manifest.json
├─ code.js
├─ ui.html
└─ README.md
```

### 플러그인 ZIP 출력물

```text
figma-svg-export-<timestamp>.zip
├─ <PageName>/.../*.svg
├─ _manifest.json
├─ _failed.json
└─ _node_layout.json
```

## 4) SVG Inspector Structure

```text
svg-inspector/
├─ src/
│  ├─ App.tsx
│  ├─ App.css
│  ├─ index.css
│  ├─ types.ts
│  └─ lib/
│     ├─ fileSystem.ts
│     ├─ scanner.ts
│     ├─ layout.ts
│     ├─ composer.ts
│     ├─ exclusionState.ts
│     ├─ manifest.ts
│     ├─ reviewState.ts
│     └─ utils.ts
├─ package.json
├─ package-lock.json
├─ vite.config.ts
└─ README.md
```

## 5) Local Generated Outputs (Git 제외 대상)

```text
Page 1/
_manifest.json
_failed.json
_node_layout.json
figma-svg-export-*.zip
figma-svg-export-*/              # ZIP 해제 폴더
unity-inspection-manifest.json
svg-inspector-exclusions.json
components*.zip
```

## 6) 4차 업데이트 메모 (3차 대비)

1. `svg-inspector/src/lib/composer.ts`에 조합 안정화 로직 추가
   - screen-root 중복 합성 제거
   - ancestor 렌더 시 descendant 가지치기
   - 렌더 가능 레이어 0건일 때 root fallback
2. `svg-inspector/src/App.tsx` 합성 모드 운영 변경
   - `All` 권장
   - `Leaf` 진단
3. 문서 파일 복원 방식 정리
   - `*_original.md` 기준 누락 내용 복구
   - 기존 내용을 삭제하지 않고 “업데이트” 형태로 반영

## 7) 6차 업데이트 메모 (5차 대비)

1. `svg-inspector/src/lib/exclusionState.ts` 신규 추가
   - exclusions 매니페스트 parse/build
   - preset 매칭(`deviceChrome`, `keyboard`)
   - localStorage 저장/복원 유틸
2. `svg-inspector/src/lib/fileSystem.ts` 확장
   - `accessMode: native|fallback` 상태 보존
   - 네이티브 모드 파일 삭제(`removeEntry`) 지원
3. `svg-inspector/src/App.tsx` 확장
   - 트리/합성 공통 선택 상태(`ComponentSelection`) 동기화
   - `Exclude`/`Restore`/`Delete File` 액션 연결
   - fallback 모드 하드삭제 비활성화
4. `svg-inspector/src/lib/composer.ts` 확장
   - 수동 제외/프리셋 제외 필터 적용
   - 선택 노드 하이라이트 및 제외 통계 출력
   - 사용자 필터로 0레이어일 때 fallback 금지 + 안내 메시지
5. 신규 산출물
   - `svg-inspector-exclusions.json`

## 8) 7차 업데이트 메모 (6차 대비)

1. `svg-inspector/src/App.tsx` 수정
   - 컴포넌트 클릭 시 자동 Explorer 실행 제거
   - `Open In Explorer` 버튼에서만 실행
   - `Always open new Explorer window` 옵션 및 localStorage 저장 추가
2. `svg-inspector/vite.config.ts` 수정
   - 로컬 브리지 `POST /api/open-in-explorer` 유지
   - Explorer 실행을 “해당 파일 포함 폴더 열기”로 고정
   - `alwaysNewWindow` 옵션 분기 처리
3. `svg-inspector/README.md` 반영
   - Explorer 실행 방식(수동 버튼 기반) 및 제약사항 최신화
