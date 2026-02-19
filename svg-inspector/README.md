# SVG Inspector

Unity 프로젝트 바깥에서 SVG 추출 결과를 먼저 검수하기 위한 로컬 웹앱입니다.

## 목적
1. `Page 1/` 같은 추출 폴더를 직접 열어 화면별 root SVG를 빠르게 확인합니다.
2. 화면마다 `승인/보류/대기`와 메모를 기록합니다.
3. 검수 결과를 Unity 후처리 입력용 `unity-inspection-manifest.json`으로 내보냅니다.

## 실행
```bash
cd svg-inspector
npm install
npm run dev
```

브라우저에서 표시된 로컬 주소(기본 `http://localhost:5173`)를 열어 사용합니다.

## 사용 순서
1. 상단 `폴더 열기`를 눌러 `Page 1/` 폴더를 선택합니다.
2. 좌측 목록에서 화면을 선택하고 중앙 미리보기로 root SVG를 확인합니다.
3. 우측에서 상태(`대기/승인/보류`)와 메모를 입력합니다.
4. 상단 `매니페스트 저장`으로 `unity-inspection-manifest.json`을 내려받습니다.
5. 필요하면 `매니페스트 불러오기`로 이전 검수 상태를 복원합니다.

## 폴더/판정 규칙
1. 화면(Screen)은 선택한 루트 아래 1-depth 폴더를 기준으로 판정합니다.
2. root SVG는 `<screenName>__*.svg` 패턴의 화면 폴더 직속 파일을 우선 사용합니다.
3. 우선 후보가 없으면 화면 폴더 직속 첫 SVG를 fallback으로 사용합니다.
4. 화면 폴더에 SVG가 없거나 root SVG를 찾지 못하면 이슈(`warning`)로 표시합니다.

## 노드 ID 파싱 규칙
1. 파일명 `X__13-3318.svg` -> `nodeId: "13:3318"`.
2. 규칙에 맞지 않으면 `nodeId: null`.
3. `nodeName`은 `__` 앞 이름(없으면 확장자 제외 파일명)으로 저장합니다.

## 출력 파일
기본 출력 파일명은 `unity-inspection-manifest.json`입니다.

주요 구조:
```json
{
  "version": 1,
  "generatedAt": "2026-02-19T00:00:00.000Z",
  "sourceRoot": "Page 1",
  "summary": {
    "screenTotal": 0,
    "approved": 0,
    "hold": 0,
    "pending": 0,
    "svgTotal": 0
  },
  "screens": [],
  "files": []
}
```

## 로컬 저장
1. 상태/메모는 브라우저 `localStorage`에도 자동 저장됩니다.
2. 동일 폴더 구조를 다시 열면 저장된 상태를 자동 복원합니다.

## 브라우저 호환
1. Chromium 계열은 `showDirectoryPicker()`를 우선 사용합니다.
2. 미지원 브라우저는 `webkitdirectory` fallback으로 동작합니다.
3. fallback 모드에서는 브라우저 제약상 완전한 빈 폴더 탐지가 제한될 수 있습니다.

## 제외 범위
1. Unity 씬 자동 생성
2. Figma API 호출
3. 요소 단위 정밀 좌표 합성 엔진
