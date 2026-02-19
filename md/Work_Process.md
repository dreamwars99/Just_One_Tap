# Work Process - Just One Tap (J_O_T)

Last Updated: 2026-02-19 (3차)

## 2026-02-19 (3차) - Figma 플러그인 메타데이터 확장 1차

### 목표
- Figma SVG export 플러그인에 좌표/계층 메타를 추가해 Inspector의 합성 비교 기반을 만든다.
- 기존 산출물(`_manifest.json`, `_failed.json`, SVG 경로 규칙) 호환성을 유지한다.

### 수행 내용
1. 플러그인 코드 복원/수정
   - `figma-plugin/export-all-svg/code.js` 복원 후 확장
   - 노드 수집 컨텍스트 확장: `pageName`, `screenRootId`, `screenFolder`, `depth`
   - DFS 수집 순서 기반 `zIndex` 기록
   - `parentId`, `isLeaf`, `bbox`, `zipPath`, `relativePath` 수집
2. 메타 출력 추가
   - ZIP 루트에 `_node_layout.json` 추가
   - `bbox` 우선순위: `absoluteRenderBounds` -> `absoluteBoundingBox` -> `null`
3. UI/문서 반영
   - `ui.html` 완료 로그에 `Layout metadata: _node_layout.json` 출력
   - `README.md`에 신규 출력물/재추출 절차 문서화
4. 로컬 산출물 정리
   - `Page 1/`, `_manifest.json`, `_failed.json`, `figma-svg-export-*.zip` 정리

### 검증
- `node --check figma-plugin/export-all-svg/code.js` 통과
- 변경 파일
  - `figma-plugin/export-all-svg/code.js`
  - `figma-plugin/export-all-svg/ui.html`
  - `figma-plugin/export-all-svg/README.md`

### 운영 결정
- 재추출 권장 옵션
  - Scope: `all-pages`
  - Include hidden nodes: `OFF`
  - Include locked nodes: `ON`
  - Only leaf render nodes: `OFF` (root 비교용)
  - Outline text in SVG: `ON`

## 2026-02-19 (2차) - SVG Inspector 1차 구축
- `svg-inspector/` 신규 생성 (Vite + React + TypeScript)
- 폴더 로드, 화면 탐색, root SVG 미리보기, 검수 상태/메모, manifest import/export 구현
- `unity-inspection-manifest.json` 출력 및 복원 동작 확인

## 2026-02-19 (1차) - Figma 전체 SVG 추출 플러그인 구축
- `figma-plugin/export-all-svg` 신규 구현
- 전체 트리 순회 SVG export + ZIP 다운로드
- `_manifest.json`, `_failed.json` 생성 파이프라인 확립

## 다음 작업
1. Inspector 2패널 비교(루트 SVG vs 메타 조합 SVG)
2. `_node_layout.json` 기반 조합 렌더 정합성 검증
3. Unity 후속 자동 배치 파이프라인 입력 연결

