# 📋 채용공고 제작 도구

AI(Gemini)를 활용한 채용공고 자동 생성 도구입니다.

## 🚀 기능

- ✍️ 실시간 미리보기
- 🤖 AI 자동 생성 (Gemini API)
- 💾 자동 저장 & 히스토리 관리 (Firebase)
- 📥 이미지 다운로드
- 🎨 텍스트 포맷팅 (굵게, 밑줄, 색상)

## 🔧 Vercel 배포 설정

### 1. GitHub에 푸시

```bash
git add .
git commit -m "Add Gemini AI feature"
git push
```

### 2. Vercel 환경 변수 설정

**중요:** API 키는 절대 코드에 넣지 마세요!

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택
3. **Settings** → **Environment Variables** 클릭
4. 새 변수 추가:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: `여기에_실제_Gemini_API_키_붙여넣기`
   - **Environment**: `Production`, `Preview`, `Development` 모두 체크
5. **Save** 클릭
6. 프로젝트 재배포 (자동)

### 3. Gemini API 키 발급

1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. **Create API Key** 클릭
3. 생성된 키를 Vercel 환경 변수에 추가

## 💰 비용

- **Gemini API**: 무료 (월 60회 제한)
- **Vercel**: 무료 (월 100GB 트래픽)
- **Firebase**: 무료 (Realtime Database)

## 🔒 보안

- ✅ API 키는 Vercel 환경 변수에만 저장
- ✅ 서버 함수(`/api/gemini.js`)에서만 API 호출
- ✅ 클라이언트 코드에 API 키 없음
- ✅ `.gitignore`로 민감한 파일 제외

## 📁 프로젝트 구조

```
job/
├── api/
│   └── gemini.js          # Gemini API 서버 함수
├── editor.html            # 메인 에디터 페이지
├── editor-script.js       # 클라이언트 로직
├── editor-style.css       # 스타일
├── index.html            # 시작 페이지
├── vercel.json           # Vercel 설정
└── .gitignore            # Git 제외 파일
```

## 🎯 사용 방법

1. 부서 선택
2. 공고 제목 입력
3. 각 섹션에서 **✨ AI로 작성** 버튼 클릭
4. AI가 자동으로 내용 생성
5. 필요시 수정
6. 📥 이미지 다운로드

## ⚠️ 주의사항

- API 키를 절대 코드에 넣지 마세요
- GitHub에 `.env` 파일을 올리지 마세요
- Vercel 환경 변수만 사용하세요
- API 사용량 모니터링: [Google AI Studio Usage](https://makersuite.google.com/app/apikey)

## 📞 문제 해결

### AI 생성이 안 돼요
- Vercel 환경 변수에 `GEMINI_API_KEY`가 설정되어 있는지 확인
- 프로젝트를 재배포해보세요

### API 키가 노출되었어요
1. [Google AI Studio](https://makersuite.google.com/app/apikey)에서 키 삭제
2. 새 키 발급
3. Vercel 환경 변수 업데이트
4. 코드에서 키 제거 후 GitHub 푸시

## 📄 라이선스

개인/회사 내부 사용 가능

