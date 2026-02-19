# Project Tree - Just One Tap (J_O_T)

Updated: 2026-02-19 (3차)

## 1) Repository Root
```text
Just_One_Tap/
├─ Assets/                        # Unity 프로젝트 본체
├─ figma-plugin/
│  └─ export-all-svg/             # Figma 개발 플러그인
├─ svg-inspector/                 # Unity 외부 SVG 검수 앱 (Vite + React + TS)
├─ md/                            # 운영/아키텍처/작업 문서
├─ tools/                         # 보조 스크립트
├─ .env                           # 로컬 시크릿 (gitignore)
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
└─ Editor/
   ├─ ProjectSetupTool.cs
   └─ PackageInstaller.cs
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
│  ├─ types.ts
│  └─ lib/
│     ├─ fileSystem.ts
│     ├─ scanner.ts
│     ├─ manifest.ts
│     ├─ reviewState.ts
│     └─ utils.ts
├─ package.json
├─ vite.config.ts
└─ README.md
```

## 5) 로컬 생성 산출물 (Git 제외 대상)
```text
Page 1/
_manifest.json
_failed.json
_node_layout.json
figma-svg-export-*.zip
figma-svg-export-*/          # ZIP 해제 폴더
unity-inspection-manifest.json
```

