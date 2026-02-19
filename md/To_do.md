# To-Do List - Just One Tap (J_O_T)

Updated: 2026-02-19 (4차)

## 1) 현재 상태 요약
- [x] Unity 기본 프로젝트 구조/에디터 툴 준비 완료
- [x] Figma 전체 SVG 추출 플러그인(`figma-plugin/export-all-svg`) 동작 확인
- [x] SVG Inspector(`svg-inspector/`) 1차 구축 완료
- [x] 플러그인 메타데이터 확장 1차 완료 (`_node_layout.json` 생성)
- [x] 기존 산출물 호환 유지 (`_manifest.json`, `_failed.json`, SVG 네이밍)
- [x] SVG Inspector 2패널 비교 뷰 구현 (Root SVG vs Composited SVG)
- [x] 합성 렌더 안정화 1차 완료 (레이어별 data URI 이미지 합성)

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
  - [x] `leaf`(권장) / `all`(진단) 모드 제공
  - [ ] overlay / opacity 슬라이더 / diff 보조 표시
- [x] 파일 트리 + `ROOT/USED/UNUSED/FAILED` 배지 표시
- [ ] 대용량(3k+ SVG) 성능 최적화

## 4) Unity 연동
- [ ] `unity-inspection-manifest.json`를 읽어 후속 자동화 입력으로 연결
- [ ] `_node_layout.json` 기준 좌표/계층 매핑 설계 확정
- [ ] 씬/프리팹 자동 배치 도구 초안 작성

## 5) 재추출 권장 옵션 (현재 기준)
- [x] Scope: `all-pages`
- [x] Include hidden nodes: `OFF`
- [x] Include locked nodes: `ON`
- [x] Only leaf render nodes: `OFF` (root SVG 비교 및 진단 모드 대응)
- [x] Outline text in SVG: `ON` (폰트 차이 최소화)

## 6) 저장소/보안 관리
- [x] `.env`는 Git 추적 제외
- [x] Figma 산출물(`Page 1/`, `_manifest.json`, `_failed.json`, ZIP) 로컬 산출물로 관리
- [x] `figma-svg-export-*` 폴더 산출물 Git 제외 유지
