# Project Directory Structure

> **Project:** Just One Tap (J_O_T)  
> **Updated:** 2026-02-19 (2차)

---

## 1. Repository Root (핵심 기준)

```text
Just_One_Tap/
├── Assets/                      # Unity 프로젝트 본체
├── figma-plugin/
│   └── export-all-svg/          # Figma 개발 플러그인
├── svg-inspector/               # Unity 외부 SVG 검수 웹앱
├── md/                          # 운영/협업 문서
├── tools/                       # 추출/자동화 스크립트
├── Page 1/                      # 로컬 SVG 산출물(생성물)
├── _manifest.json               # 추출 결과 요약(생성물)
└── _failed.json                 # 추출 실패 목록(생성물)
```

---

## 2. Unity Core Structure

```text
Assets/
├── _Project/
│   ├── Art/
│   │   ├── Icons/
│   │   ├── UI/
│   │   └── Fonts/
│   ├── Resources/
│   │   └── Localization/
│   │       ├── en.json
│   │       └── ko.json
│   ├── Scripts/
│   │   ├── Core/
│   │   │   ├── GameManager.cs
│   │   │   ├── LocalizationManager.cs
│   │   │   ├── DataManager.cs
│   │   │   ├── RoutineManager.cs
│   │   │   └── AuthManager.cs
│   │   ├── UI/
│   │   └── Utils/
│   ├── Scenes/
│   │   ├── Intro.unity
│   │   └── Main.unity
│   └── Prefabs/
└── Editor/
    ├── ProjectSetupTool.cs
    ├── PackageInstaller.cs
    └── UISetupTool.cs
```

---

## 3. Figma Export Plugin (Dev)

```text
figma-plugin/
└── export-all-svg/
    ├── manifest.json
    ├── code.js
    ├── ui.html
    └── README.md
```

- 목적: Figma 트리를 재귀 순회해 노드별 SVG를 일괄 추출.
- 산출: ZIP + `_manifest.json` + `_failed.json`.

---

## 4. SVG Inspector (Unity 외부 검수 앱)

```text
svg-inspector/
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── types.ts
│   └── lib/
│       ├── fileSystem.ts
│       ├── scanner.ts
│       ├── manifest.ts
│       ├── reviewState.ts
│       └── utils.ts
├── README.md
├── package.json
└── vite.config.ts
```

- 목적: Unity 반입 전 SVG 화면 검수(승인/보류/메모) + Unity 입력용 매니페스트 생성.
- 출력: `unity-inspection-manifest.json`, 검수 CSV(옵션).

---

## 5. Local Generated Outputs (Git Ignore 대상)

```text
Page 1/                         # 로컬 테스트 추출 결과
_manifest.json                  # 추출 요약
_failed.json                    # 실패 노드 목록
figma-svg-export-*.zip          # 플러그인 ZIP 결과물
unity-inspection-manifest.json  # 검수 앱 출력물(다운로드)
```
