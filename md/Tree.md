# 🌳 Project Directory Structure

> **Project:** Just One Tap (J_O_T)  
> **Updated:** 2026-02-19

---

## 1. 📂 Unity Core Structure

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
├── Editor/
│   ├── ProjectSetupTool.cs
│   ├── PackageInstaller.cs
│   └── UISetupTool.cs
└── Plugins/
```

---

## 2. 🧩 Figma Export Plugin (Dev)

```text
figma-plugin/
└── export-all-svg/
    ├── manifest.json
    ├── code.js
    ├── ui.html
    └── README.md
```

- 목적: Figma 트리 전체를 재귀 추적하여 노드별 SVG를 ZIP으로 추출.
- 부가 산출물: `_manifest.json`, `_failed.json` (추출 결과/실패 내역).

---

## 3. 📦 Local Generated Outputs (Git Ignore 대상)

```text
Page 1/                 # 로컬 테스트 추출 결과
_manifest.json          # 추출 요약
_failed.json            # 실패 노드 목록
figma-svg-export-*.zip  # 플러그인 다운로드 ZIP
```
