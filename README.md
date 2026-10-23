# 정부상징 생성기

「정부상징 디자인 지침서」(2017)의 조합 규정에 따라 기관명을 넣으면 정부상징(문양 + 기관명) 시그니처를 만들어 주는 정적 웹앱입니다.

- 조합: 문양 단독 / 세로형 / 가로형, 국문·영문·국영문, 본부 병기(A·B·C), 영문 약칭, 3자 이하·10자 이상 규정
- 표현: 기본형 / 단색형 / 단색형 2(금·은), 테두리형, 반전, 배경색, 투명도, 여백(Clear space) 포함 여부
- 내보내기: SVG(윤곽선 변환 기본, 글꼴 임베드 텍스트 버전 선택 가능), PNG / JPG / WebP, 클립보드 복사
- 한자는 Pretendard JP의 한국 한자 표기(`ss05`)로 조판합니다 (jsDelivr에서 로드).

## 개발

```sh
npm install
npm run dev      # 개발 서버
npm run build    # dist/ 에 정적 빌드
npm run lint
```

스택: Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), reUI, opentype.js

## 글꼴

- 대한민국정부상징체: `src/assets/fonts/ROKG_R.woff2`, `ROKG_R.woff` (원본 TTF에서 변환)
- Pretendard JP: [jsDelivr](https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/)

## 라이선스

[공공누리](https://www.kogl.or.kr/info/introduce.do) 라이선스에 의거하여 배포됩니다.
- 대한민국정부상징체: [공공누리](https://www.kogl.or.kr/recommend/recommendDivView.do?recommendIdx=9510&division=font)  
- Pretendard JP (한국한자정체표기용, ss05 variant): [https://github.com/orioncactus/pretendard/tree/main/packages/pretendard-jp](https://github.com/orioncactus/pretendard/tree/main/packages/pretendard-jp)

## 면책사항
Claude "딸깍" 이므로 정상 작동을 보장하지 않습니다. 진짜 제대로 검토 안했기 때문에 "AI Slop" 입니다. 감사합니다.
