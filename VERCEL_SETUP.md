# 🔐 Vercel 환경 변수 설정 가이드

## ⚡ 빠른 시작 (5분이면 완료!)

### 📍 현재 상태
- ✅ 코드 GitHub 푸시 완료
- ✅ Vercel 자동 배포 진행 중
- ⏳ **환경 변수 추가 필요** ← 지금 여기!

---

## 🎯 Step-by-Step 가이드

### **Step 1: Vercel 대시보드 열기**

1. 브라우저에서 이 주소를 열어주세요:
   ```
   https://vercel.com/dashboard
   ```

2. GitHub 계정으로 로그인되어 있는지 확인

---

### **Step 2: 프로젝트 선택**

- 프로젝트 목록에서 **"job"** 프로젝트 클릭

---

### **Step 3: Settings 탭으로 이동**

상단 메뉴에서:
- Overview
- Deployments  
- Analytics
- **Settings** ← 클릭!

---

### **Step 4: Environment Variables 메뉴**

왼쪽 사이드바에서:
1. 아래로 스크롤
2. **"Environment Variables"** 찾기
3. 클릭!

---

### **Step 5: 새 변수 추가**

화면 오른쪽 상단의 **"Add New"** 버튼 클릭

---

### **Step 6: 정보 입력**

#### 📝 입력 폼:

**Name (변수 이름):**
```
GEMINI_API_KEY
```
⚠️ 정확히 이대로! 대소문자 구분됩니다.

**Value (API 키):**
```
AIzaSyAFMeGOLAT3Lcorgkcr61zeQjz7vctXuAY
```

**Environment (환경 선택):**
- ☑️ **Production** (체크)
- ☑️ **Preview** (체크)
- ☑️ **Development** (체크)

모두 체크해주세요!

---

### **Step 7: 저장**

**"Save"** 또는 **"Add"** 버튼 클릭!

✅ 환경 변수가 추가되었습니다!

---

### **Step 8: 재배포 (중요!)**

환경 변수를 추가한 후 반드시 재배포해야 합니다:

#### **방법 A: 대시보드에서 재배포**
1. 상단 **"Deployments"** 탭 클릭
2. 가장 최근 배포 찾기
3. 오른쪽 **점 3개 (⋮)** 클릭
4. **"Redeploy"** 선택
5. 팝업에서 **"Redeploy"** 확인

#### **방법 B: 자동 재배포 (더 쉬움!)**
아무 파일이나 수정해서 GitHub에 푸시하면 자동으로 재배포됩니다.

---

## ⏱️ 배포 시간

- 빌드 시작: 즉시
- 배포 완료: **30초 ~ 1분**
- 상태: **"Ready"** 표시되면 완료!

---

## 🧪 테스트 방법

배포 완료 후:

### **1. 웹사이트 열기**
```
https://job-eight-beta.vercel.app/editor.html
```

### **2. 입력하기**
- 부서 선택: 아무거나
- 공고 제목: "백엔드 개발자"

### **3. AI 버튼 클릭**
**"✨ AI로 작성"** 버튼 클릭!

### **4. 결과 확인**
- ⏳ "AI 생성 중..." (3-5초)
- ✅ 내용 자동 생성!

---

## ❌ 문제 해결

### **"API key not configured" 에러**

**원인:**
- 환경 변수 이름이 틀림
- 재배포 안 함
- 환경 선택 안 함

**해결:**
1. 변수 이름 확인: `GEMINI_API_KEY` (정확히)
2. 환경 3개 모두 체크했는지 확인
3. 재배포 실행
4. 5분 대기

---

### **버튼 눌러도 반응 없음**

**확인 방법:**
1. F12 키 누르기
2. **Console** 탭 보기
3. 에러 메시지 확인

**일반적인 원인:**
- 네트워크 오류
- API 키 오타
- Vercel 배포 미완료

---

### **"Too Many Requests" 에러**

**원인:**
- Gemini API 무료 한도 초과 (분당 1회)

**해결:**
- 1분 대기 후 다시 시도
- [Google AI Studio](https://makersuite.google.com/app/apikey)에서 사용량 확인

---

## 💰 비용 모니터링

### **Gemini API 사용량 확인:**

1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. **API Keys** 페이지
3. 사용량 그래프 확인

### **무료 한도:**
- 월 60회 요청
- 분당 1회 제한
- 하루 1,500회 제한

### **예상 사용량:**
- 버튼 1번 클릭 = 1회
- 4개 섹션 생성 = 4회
- 하루 15번 사용 = 월 450회 (무료 한도 내)

---

## 🔒 보안 체크리스트

- ✅ API 키가 코드에 없음 (GitHub 안전)
- ✅ 환경 변수만 사용 (Vercel)
- ✅ 서버 함수에서만 API 호출
- ✅ .gitignore로 민감 파일 제외
- ✅ HTTPS 자동 암호화

---

## 🎉 완료 후 기능

AI 자동 생성:
- ✨ 이런분들에게 추천합니다
- ✨ 담당 업무
- ✨ 필수 자격
- ✨ 우대 사항

각 섹션마다 AI가 자동으로 5-7개 항목 생성!

---

## 📞 도움이 필요하면

문제가 생기면:
1. 에러 메시지 스크린샷
2. F12 Console 내용
3. 어느 단계에서 막혔는지

알려주시면 도와드릴게요! 😊

---

## ✅ 완료 체크리스트

- [ ] Vercel 대시보드 접속
- [ ] job 프로젝트 선택
- [ ] Settings → Environment Variables
- [ ] GEMINI_API_KEY 추가
- [ ] 환경 3개 모두 체크
- [ ] Save 클릭
- [ ] 재배포 실행
- [ ] 배포 완료 대기 (1분)
- [ ] 웹사이트 테스트
- [ ] AI 버튼 작동 확인

---

**현재 웹사이트 주소:**
```
https://job-eight-beta.vercel.app/editor.html
```

**Vercel 대시보드:**
```
https://vercel.com/dashboard
```

**Google AI Studio (사용량 확인):**
```
https://makersuite.google.com/app/apikey
```

---

🎯 **지금 바로 시작하세요!**

