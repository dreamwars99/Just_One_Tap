# Figma -> SVG 전체 일괄 추출 가이드

## 결론 요약
- 수동 저장 없이 자동화 가능함.
- 이 프로젝트에는 `tools/export-figma-svg.ps1` 스크립트가 준비되어 있음.
- `.env`의 `FIGMA_API_KEY`, `FIGMA_ADDRESS`를 이용해 트리 구조를 유지한 채 SVG를 일괄 다운로드할 수 있음.

## 왜 링크만으로는 안 되는가?
- Figma 링크는 "접근 가능한 사람"에게만 보임.
- API도 동일하게 권한이 필요함.
- 즉, 토큰(`FIGMA_API_KEY`)을 발급한 계정이 해당 파일에 초대되어 있어야 함.

## 현재 `.env` 기준
- `FIGMA_API_KEY=...`
- `FIGMA_ADDRESS=https://www.figma.com/design/<FILE_KEY>/...?...&node-id=...`

스크립트는 `FIGMA_ADDRESS`에서 자동으로 아래를 파싱함.
- `FileKey` (예: `NVNU7DIeZy1BJTf675Iirj`)
- `RootNodeId` (예: `0-1` -> `0:1` 변환)
- 단, `-FileKey`를 직접 주면 `FIGMA_ADDRESS`의 `node-id`는 자동 적용하지 않음

## 1) 기본 실행 (FIGMA_ADDRESS 사용)
프로젝트 루트에서:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/export-figma-svg.ps1 `
  -Mode all `
  -OutDir Assets/FigmaSvg
```

- `-Mode all`: 가능한 모든 레이어 타입을 대상으로 시도
- 결과 파일은 `Assets/FigmaSvg` 아래에 Figma 트리 폴더 구조로 저장됨
- `manifest.json`도 함께 생성됨 (성공/실패 상태 포함)

## 1-1) 파일 전체(모든 페이지) 추출
`.env`의 `FIGMA_ADDRESS`에 `node-id`가 들어 있어도, 아래처럼 `-FileKey`를 직접 주면 전체 문서 루트부터 수집함.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/export-figma-svg.ps1 `
  -FileKey NVNU7DIeZy1BJTf675Iirj `
  -Mode all `
  -OutDir Assets/FigmaSvg_AllPages
```

## 2) 화면 단위만 추출
화면(Frame/Component 위주)만 원하면:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/export-figma-svg.ps1 `
  -Mode frames `
  -OutDir Assets/FigmaSvg
```

## 3) 특정 섹션/프레임만 추출
Figma에서 특정 프레임을 선택 후 링크 복사 -> `node-id`가 바뀜.

예시:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/export-figma-svg.ps1 `
  -FigmaAddress "https://www.figma.com/design/<FILE_KEY>/...?...&node-id=13-3321" `
  -Mode all `
  -OutDir Assets/FigmaSvg_Section13
```

## 4) 파라미터 설명
- `-FileKey`: 직접 파일 키 지정 (선택)
- `-RootNodeId`: 시작 노드 지정 (선택, 예: `13:3321`)
- `-FigmaAddress`: 링크에서 자동 파싱할 때 사용 (선택)
- `-IgnoreAddressNodeId`: 주소에 `node-id`가 있어도 무시하고 문서 루트부터 처리
- `-OutDir`: 저장 폴더
- `-Mode`: `all` 또는 `frames`
- `-IncludeHidden`: 숨김 레이어 포함
- `-BatchSize`: 한 번에 요청할 ID 개수 (`1..100`, 기본 100)
- `-EnvFile`: 기본 `.env`

## "초대받은 사람만 접근 가능해서 안 되는 걸까?"에 대한 답
맞음. 정확히 그 이슈가 맞을 수 있음.

아래 조건을 모두 만족해야 API가 동작함.
- 토큰 발급 계정이 해당 파일에 접근 가능
- 토큰 자체가 유효
- API 호출 제한(429)에 걸리지 않음

## 에러별 원인/해결
### 1) `403 Invalid token`
- 원인: 토큰 값 오타/만료/잘못된 타입
- 해결: 새 Personal Access Token 발급 후 `.env` 갱신

### 2) `403` 권한 관련 에러
- 원인: 토큰 계정이 파일에 초대되지 않음
- 해결: 해당 계정 이메일을 Figma 파일에 Viewer 이상으로 초대

### 3) `429 Rate limit exceeded`
- 원인: 짧은 시간에 요청 과다
- 해결:
  - 잠시(1~2분) 기다렸다 재실행
  - `-BatchSize`를 줄여 호출 강도 완화 (예: `-BatchSize 30`)
  - 큰 파일이면 섹션별(`node-id`)로 나눠 추출

### 4) 일부 레이어만 실패(`not_renderable`)
- 원인: 해당 노드가 SVG로 직접 렌더 불가 타입일 수 있음
- 해결: 실패 항목은 `manifest.json`에서 확인 후 PNG fallback 또는 수동 보완

## 추천 실행 순서
1. Figma 파일에 토큰 계정이 초대되었는지 확인
2. `.env`의 `FIGMA_API_KEY`, `FIGMA_ADDRESS` 확인
3. `-Mode frames`로 먼저 소규모 테스트
4. 이상 없으면 `-Mode all` 전체 추출
5. `manifest.json` 실패 항목만 후처리

## 참고
- `.env`는 이미 `.gitignore`에 추가되어 커밋 제외됨.


https://github.com/javierarce/figma-extractor


figma-extractor
Node package that exports all the frames of a Figma file to different files.

Installation
```
yarn add figma-extractor
```
or
```
npm install figma-extractor
```
How to use it
```
const Extractor = require('figma-extractor')

let extractor = new Extractor(FIGMA_TOKEN, FIGMA_FILE)

extractor.extract().then((files) => {
  console.log(files) 
}).catch((e) => {
  console.error(e)
})
```
Result

By default Figma Extractor will export SVG files to the current directory. The extract command will return the list of exported files in this format:
```
[
  { "filename": "Frame 1.svg", "page_id": "4:3", "page":"Page 1" },
  { "filename": "Frame 2.svg", "page_id": "4:3", "page":"Page 1" }, 
  { "filename": "Frame 3.svg", "page_id": "4:3", "page":"Page 1" }, 
  { "filename": "Frame 4.svg", "page_id": "8:4", "page":"Page 2" }
]
```
Customizing the export
```
const Extractor = require('figma-extractor')

let options = { 
  format: 'svg',                // file type (from the Figma API)
  svg_include_id: true,         // from the Figma API
  pageID: '123:0',              // specify a page
  append_frame_id: true,        // appends the frame id to the filename
  append_page_name: true,       // appends the page name to the filename
  use_pages_as_folders: true,   // create subdirectories with the name of the page
  dont_overwrite: true,         // don't overwrite existing files with the same name
  get_background_color: false,  // get the background color of the page in hexidecimal format
  get_comments: true            // get unresolved comments
}

const extractor = new Extractor(FIGMA_TOKEN, FIGMA_FILE, OPTIONS)

extractor.extract(IMAGE_PATH).then((files) => {
  console.log(files)
})

let destination = 'my_beautiful_designs'

let extractor = new Extractor(FIGMA_TOKEN, FIGMA_FILE, options)

extractor.extract(destination).then((files) => {
  console.log(files) 
}).catch((e) => {
  console.error(e)
})
```


https://www.figma.com/files/team/1510877203609335862/resources/community/plugin/1577641358650832359/export-to-organized-folders?fuid=1510877201219167298

방문자(Viewer) 권한만 있는 경우에는 피그마 내에서 플러그인을 직접 실행하여 파일을 추출하는 것이 불가능합니다. 플러그인은 '편집 권한'이 있어야 구동되기 때문입니다.
하지만 개인 API Key가 있다면, 앞서 언급한 Node.js 코드를 실행하는 방식이 유일하고 가장 확실한 해결책입니다. API는 '보기 권한'만 있어도 파일의 구조를 읽어오고 이미지를 생성할 수 있습니다.
친구의 프로젝트 구조를 그대로 유지하며 SVG를 뽑아내기 위한 구체적인 가이드를 드릴게요.
1. 준비물
Personal Access Token (API Key): 피그마 설정(Settings) -> Account -> Personal access tokens에서 생성.
File Key: 주소창의 design/ 뒤에 있는 문자열인 NVNU7DIeZy1BJTf675Iirj입니다.
Node.js 설치: 컴퓨터에 Node.js가 깔려 있어야 합니다.
2. 실행 방법 (터미널/CMD 활용)
먼저 폴더를 하나 만들고 아래 라이브러리를 설치하세요.
bash
npm install axios
Use code with caution.

그 후, 아래 코드를 download.js로 저장하고 node download.js를 입력해 실행하세요.
javascript
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const FIGMA_TOKEN = '여기에_복사한_API_키_입력';
const FILE_KEY = 'NVNU7DIeZy1BJTf675Iirj';

const client = axios.create({
    baseURL: 'https://api.figma.com',
    headers: { 'X-Figma-Token': FIGMA_TOKEN }
});

async function main() {
    try {
        console.log('파일 구조 분석 중...');
        const { data } = await client.get(`/files/${FILE_KEY}`);
        const exportNodes = [];

        // 재귀적으로 트리 구조 탐색
        function traverse(node, currentPath) {
            // 다운로드 대상: FRAME, COMPONENT, INSTANCE, RECTANGLE 등 (필요에 따라 조절)
            if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
                exportNodes.push({ id: node.id, name: node.name.replace(/\//g, '_'), path: currentPath });
            }
            if (node.children) {
                const nextPath = path.join(currentPath, node.name.replace(/\//g, '_'));
                node.children.forEach(child => traverse(child, nextPath));
            }
        }

        traverse(data.document, './output');

        console.log(`${exportNodes.length}개의 레이어 발견. SVG 변환 요청 중...`);

        // API 제한을 피하기 위해 20개씩 끊어서 요청
        for (let i = 0; i < exportNodes.length; i += 20) {
            const chunk = exportNodes.slice(i, i + 20);
            const ids = chunk.map(n => n.id).join(',');
            
            const { data: imgData } = await client.get(`/images/${FILE_KEY}?ids=${ids}&format=svg`);
            const images = imgData.images;

            for (const node of chunk) {
                const url = images[node.id];
                if (url) {
                    if (!fs.existsSync(node.path)) fs.mkdirSync(node.path, { recursive: true });
                    const filePath = path.join(node.path, `${node.id.replace(/:/g, '-')}.svg`);
                    
                    const writer = fs.createWriteStream(filePath);
                    const response = await axios.get(url, { responseType: 'stream' });
                    response.data.pipe(writer);
                }
            }
            console.log(`진행률: ${Math.min(i + 20, exportNodes.length)} / ${exportNodes.length}`);
        }
        console.log('모든 작업 완료! output 폴더를 확인하세요.');
    } catch (err) {
        console.error('에러 발생:', err.response ? err.response.data : err.message);
    }
}

main();
Use code with caution.

3. 이 코드의 장점 (Viewer 권한 최적화)
구조 유지: 피그마의 레이어 트리(Page > Frame > Group)를 컴퓨터 폴더 구조로 그대로 복사합니다.
권한 우회: 플러그인이 없어도 API Key만 있으면 친구의 디자인 데이터를 안전하게 가져옵니다.
파일명 관리: 피그마 이름에 /가 들어있으면 폴더로 인식하는 문제를 방지하기 위해 _로 치환 처리했습니다.
주의: 디자인 파일이 매우 크면(레이어 수천 개) API 호출 횟수 제한에 걸릴 수 있으니, 코드 내 i += 20 숫자를 조절하며 실행해 보세요. 실행 중 막히는 부분이 있으면 바로 말씀해 주세요!

## SVG 검수 앱 방향 정리 (2026-02-19)

### 의도
1. Unity `Assets/`에 넣기 전에, SVG 결과물을 사람이 먼저 확인하는 독립 검수 프로그램이 필요하다.
2. 핵심은 요소 단위 정밀 합성이 아니라 화면 단위 root SVG 우선 검수다.
3. 검수 산출물은 Unity 후속 자동화 입력으로 쓰는 고정 JSON 매니페스트다.

### 위치/실행 규칙
1. 앱은 Unity와 분리된 최상위 `svg-inspector/`에서 독립 실행한다.
2. 런타임은 로컬 웹앱(Vite + React + TypeScript)이다.
3. 입력은 사용자가 `Page 1/` 같은 추출 루트를 직접 선택한다.

### 화면 판정 규칙
1. 선택 루트 아래 1-depth 디렉터리를 화면(Screen)으로 간주한다.
2. root SVG는 `<screenName>__*.svg`를 우선 사용한다.
3. 우선 후보가 없으면 화면 폴더 직속 첫 SVG를 fallback으로 사용한다.
4. root 미발견, 파싱 실패, 빈 화면 폴더는 이슈로 기록하고 앱은 계속 동작한다.

### 검수/저장 규칙
1. 각 화면은 `pending | approved | hold` 상태와 메모를 갖는다.
2. 상태/메모는 앱 메모리 + 브라우저 localStorage + JSON 파일로 저장/복원한다.
3. 매니페스트 파일명은 `unity-inspection-manifest.json`을 기본으로 사용한다.

### Unity 전달 데이터 규칙
1. `screens`에는 화면별 검수 필수 필드를 넣는다.
2. `files`에는 `screenId`, `relativePath`, `nodeId`, `nodeName`을 넣는다.
3. 파일명 `X__13-3318.svg`는 `nodeId: 13:3318`로 변환하고 실패 시 `null`로 둔다.

검수 앱 수정 요청:

지금은 미리보기에서 마우스 휠을 돌리면 크롬 스크롤과 함께 움직임.
-> 피그마와 같이 스페이스+마우스 왼쪽 클릭, 드래그로 움직이게 할 수 있도록 할 것
-> 마우스 휠 돌릴 땐 확대 축소 금지

어떤 svg 파일이 들어왔는지 확인이 안 되는데, 이건 꼭 있어야 할까? 피그마처럼 실제로 모든 svg 파일의 조합인지, 아니면 단순히 그냥 화면 svg 파일 하나인지 모르겠음.
화면 svg만 들어온 거면, 아무런 소용이 없음
폴더, 파일 구조를 볼 수 있게 만들어줘. 그리고 파일(키보드, 와이파이, 배터리 등은 없어야 하니까 이걸 보고 삭제할 수 있게 파일명을 볼 수 있게 해줘.)
## 추가 요구사항 이해 정리 (2026-02-19, 컴포넌트 선택/삭제 UX)

### 사용 목적
1. 루트 화면에 보이는 장치 UI(상단 status bar: 시간/와이파이/배터리, 하단 키보드)는 앱 실제 UI가 아니다.
2. 그래서 검수/합성 단계에서 이런 요소를 빠르게 제외하고, 앱 컴포넌트만 남겨야 한다.

### 원하는 동작
1. 우측 `Screen File Tree`에서 항목을 클릭하면 해당 컴포넌트가 선택 상태가 된다.
2. 선택된 컴포넌트를 즉시 삭제(또는 합성 제외)할 수 있어야 한다.
3. 동일하게 `Composited SVG` 캔버스에서 요소를 직접 클릭해도 같은 대상이 선택되어야 한다.
4. 즉, 트리 선택과 캔버스 선택은 동일한 선택 상태로 동기화되어야 한다.

### 기대 결과
1. 선택된 레이어가 하이라이트되어 어떤 요소를 고른 건지 바로 확인 가능해야 한다.
2. 삭제/제외 실행 즉시 Composited SVG가 다시 렌더링되어 결과가 반영되어야 한다.
3. status bar, keyboard 같은 불필요 요소를 검수 단계에서 빠르게 제거할 수 있어야 한다.

### 구현 해석 (현재 이해)
1. 1차 목표는 파일 물리 삭제보다 "검수용 합성 제외(exclude)" 기능이 우선이다.
2. 실제 파일 시스템의 SVG 물리 삭제는 되돌리기 위험이 커서 옵션 분리가 안전하다.
3. 제외 상태는 manifest(또는 별도 JSON 설정)로 저장되어 재로드 후에도 유지되어야 한다.
