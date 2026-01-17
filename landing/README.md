# 스토리 구성 웹학습지 - 통합 랜딩 페이지

> 학급 모드와 개인 모드를 선택할 수 있는 **공통 진입점**입니다.

```
통합 랜딩 페이지 (이 폴더)
        │
        ├─→ 학급 모드 → classroom-gas/ (GAS)
        │
        └─→ 개인 모드 → personal-app/ (React + Supabase)
```

## 🚀 배포 방법

### GitHub Pages

1. 이 폴더를 GitHub 저장소에 업로드
2. Settings > Pages에서 배포 활성화
3. 자동으로 `https://username.github.io/story-creator/` 형태로 배포됨

### Vercel

1. Vercel에 저장소 연결
2. Root Directory를 `landing`으로 설정
3. 자동 배포

### Netlify

1. Netlify에 저장소 연결
2. Publish directory를 `landing`으로 설정
3. 자동 배포

## 📁 구조

```
landing/
├── index.html     # 메인 랜딩 페이지
└── README.md      # 이 파일
```

## 🔗 연결 설정

배포 후 모달의 링크를 실제 URL로 수정해주세요:

### 학급 모드 (GAS)
```javascript
// index.html에서 수정
href="./GAS-DEPLOYMENT-GUIDE.md"
→ href="https://github.com/your-repo/blob/main/docs/GAS-DEPLOYMENT-GUIDE.md"
```

### 개인 모드 (React App)
```javascript
// index.html에서 수정
href="./personal/"
→ href="https://your-personal-app.vercel.app"
```

## 📱 지원 기기

- Desktop (Chrome, Firefox, Safari, Edge)
- Tablet (iPad, Android)
- Mobile (iOS, Android)
