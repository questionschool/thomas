# 질문예술학교 · 인커리G

[홈페이지](https://questionschool.net/) · [질문수업 웹북](https://questionschool.net/webbook/) · [낭만북클럽](https://bookclub.questionschool.net/)

GitHub Pages용 정적 홈페이지입니다. `CNAME`은 기존 도메인을 유지합니다. 새 빌드 도구나 ChatGPT Sites 서버가 필요 없습니다.

- `index.html`: 질문예술학교 홈. 2026년 11월 6일 질문수업 강연 소식과 낭만북클럽 시즌 18 『뉴런하우스』 안내.
- `news/question-class-20261106.html`: 별도로 공유할 수 있는 강연 소식.
- `webbook/index.html`: A5 강연록 웹북. 12개 목차, 본문 검색, 글자 크기, 이어 읽기, 개인 기록. 기록은 이용자의 브라우저에만 저장됩니다.
- `webbook/read/*/index.html`: 새로고침이나 직접 공유에도 열리는 각 장의 독립 HTML.
- `webbook/assets/`: 표지·본문 이미지·공유 썸네일·57쪽 PDF. 외부 ChatGPT 주소를 호출하지 않습니다.
- `question-class.html`: 웹북으로 연결되는 짧은 진입 주소.
- `backend/google-apps-script/`: PDF 신청 정보를 비공개 구글 시트에 직접 저장하는 서버 코드와 배포 안내.

## 실행과 확인

정적 파일이므로 로컬에서는 `python -m http.server 8000`으로 확인할 수 있습니다. 홈페이지·웹북·각 장·이미지·PDF 경로는 `/` 기준입니다. 도메인 루트에 배포합니다.

`python tools/check_site.py`는 내부 링크·이미지·누락된 화면 요소·외부 Sites 의존성·PDF 페이지 수를 검사합니다. `node --check webbook/app.js`로 JS 문법을 확인합니다.

## PDF 신청 연결 상태

이름·소속·이메일과 수집 동의를 입력하면 Google Apps Script가 관리자 전용 시트에 즉시 저장하고 PDF를 엽니다. `webbook/config.js`에 배포된 웹 앱 주소가 연결되어 있습니다. Google 계정 토큰은 프런트엔드나 저장소에 넣지 않습니다. 운영·재배포 방법은 [별도 안내](backend/google-apps-script/README.md)를 따릅니다.

신청 정보를 모으는 시트나 원본 강연 녹취·채팅은 공개 저장소에 포함하지 않습니다.

© 2026 박영준 · 질문예술학교. 강연록의 내용 전부 또는 일부를 제3자에게 공유하거나 재사용하려면 지은이와 출판사의 동의를 얻어야 합니다.

## PDF 배포 시 글꼴 보존

원본 PDF의 이미지 용량만 줄일 때는 `tools/compress_pdf_images.py source.pdf output.pdf`를 사용합니다. 모든 페이지의 텍스트·내장 글꼴 바이트·링크·목차·크기가 원본과 같은지 검사하고, 다르면 실패합니다. 페이지 리소스를 다시 쓰는 이미지 일괄 재작성 방식은 이 문서에서 한글 글꼴 손상을 일으켰으므로 사용하지 않습니다.

## 웹북 소감

별칭과 소감을 입력하고 공개 또는 비공개(관리자에게만)를 선택합니다. 기본은 공개입니다. 공개 글만 API 목록에 포함되며, 비공개 글은 관리자 시트에만 저장합니다. 소감은 1년간 보관합니다.

현재 PDF 신청에 쓰는 Apps Script를 최신 코드로 교체하고 기존 웹 앱을 새 버전으로 배포해야 합니다. [코드 전체 복사 및 연결 안내](https://questionschool.net/webbook/setup-feedback.html)에서 진행합니다. 주소가 유지되면 별도의 웹북 재게시 없이 기능이 나타납니다.

`node tools/check_feedback_backend.mjs`는 외부 계정 없이 메모리 저장소에서 공개/비공개 분리, 기존 PDF 호환, 재시도 중복 방지, 수식 입력 처리, 보관기간과 목록 페이지 처리를 확인합니다.

## 강연 슬라이드

제공된 107장 중 본문 설명과 연결되는 10장을 골라 9개 장에 배치했습니다. 원본 JPEG는 `webbook/assets/slides/`에 그대로 보관하며 `webbook/slides.json`에 번호·목차·제목을 기록합니다. 슬라이드는 본문 흐름 안에서 읽는 이미지로만 표시하며, 클릭·팝업·확대 기능을 넣지 않습니다.

PDF의 장 구분 문구는 `tools/style_pdf_chapter_labels.py source.pdf output.pdf`로 9pt 초록색으로 정리합니다. 본문과 큰 질문 제목의 위치를 옮기지 않으며, 구분 문구 영역 외의 모든 렌더링 픽셀이 동일한지 검사합니다.
