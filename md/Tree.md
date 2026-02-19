# Project Tree - Just One Tap (J_O_T)

Updated: 2026-02-19 (4차, 3차 기준 복원 + 업데이트)

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

