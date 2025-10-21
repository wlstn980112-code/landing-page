# SumSnap Landing Page - AI 에이전트 가이드

## 프로젝트 개요

**SumSnap**은 AI 기반 콘텐츠 요약 서비스의 랜딩 페이지입니다. 링크, 문서, 영상까지 다양한 콘텐츠를 단 10초 만에 요약해주는 서비스를 소개하는 웹사이트입니다.

- **프로젝트명**: SumSnap Landing Template
- **버전**: 0.1.0
- **프레임워크**: Next.js 14.2.16 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS 4.1.9
- **패키지 매니저**: pnpm

## 폴더 구조

```
landing-template/
├── app/                          # Next.js App Router
│   ├── actions.ts                # 서버 액션 (노션 API 연동)
│   ├── globals.css               # 전역 스타일
│   ├── layout.tsx               # 루트 레이아웃
│   └── page.tsx                  # 메인 페이지
├── components/                   # React 컴포넌트
│   ├── ui/                      # 재사용 가능한 UI 컴포넌트
│   │   ├── button.tsx           # 버튼 컴포넌트
│   │   ├── input.tsx            # 입력 컴포넌트
│   │   ├── form.tsx             # 폼 관련 컴포넌트
│   │   ├── use-toast.ts         # 토스트 상태 관리
│   │   └── ...                  # 기타 UI 컴포넌트들
│   └── waitlist-form.tsx        # 웨이팅 리스트 폼
├── lib/                         # 유틸리티 함수
│   └── utils.ts                 # 클래스명 병합 유틸리티
├── hooks/                       # 커스텀 훅
│   ├── use-mobile.ts           # 모바일 감지 훅
│   └── use-toast.ts            # 토스트 훅
├── public/                     # 정적 파일
└── styles/                     # 추가 스타일
    └── globals.css
```

## 기술 스택

### 핵심 프레임워크

- **Next.js 14.2.16**: React 기반 풀스택 프레임워크
- **React 18**: UI 라이브러리
- **TypeScript 5**: 타입 안전성

### 스타일링

- **Tailwind CSS 4.1.9**: 유틸리티 퍼스트 CSS 프레임워크
- **Radix UI**: 접근성이 좋은 헤드리스 UI 컴포넌트
- **Lucide React**: 아이콘 라이브러리
- **Geist**: 폰트 패밀리

### 상태 관리

- **React useState**: 기본 상태 관리
- **React Hook Form**: 폼 상태 관리
- **Zod**: 스키마 검증

### 외부 서비스

- **Notion API**: 웨이팅 리스트 데이터 저장
- **Vercel Analytics**: 분석 도구

## 애플리케이션 구조

### 라우팅 (App Router)

- **단일 페이지 애플리케이션**: 모든 콘텐츠가 `app/page.tsx`에 포함
- **서버 액션**: `app/actions.ts`에서 노션 API 연동 처리
- **레이아웃**: `app/layout.tsx`에서 전역 설정 및 폰트 로딩

### 컴포넌트 아키텍처

#### 1. 메인 페이지 (`app/page.tsx`)

```typescript
"use client";

export default function SumSnapLanding() {
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 네비게이션, 히어로, 기능, 가격, FAQ, CTA, 푸터 */}
    </div>
  );
}
```

#### 2. 웨이팅 리스트 폼 (`components/waitlist-form.tsx`)

```typescript
export function WaitlistForm({ onClose }: { onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // 서버 액션 호출
    const result = await submitToWaitlist(formData);
  }
}
```

#### 3. 서버 액션 (`app/actions.ts`)

```typescript
"use server";

export async function submitToWaitlist(formData: FormData) {
  // 노션 API 연동
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { database_id: notionDatabaseId },
      properties: {
        /* 데이터 구조 */
      },
    }),
  });
}
```

## 상태 관리 패턴

### 1. 로컬 상태 관리

- **useState**: 간단한 컴포넌트 상태
- **폼 상태**: React Hook Form으로 관리
- **모달 상태**: 부모 컴포넌트에서 관리

### 2. 서버 상태 관리

- **서버 액션**: Next.js의 서버 액션 사용
- **폼 제출**: FormData를 통한 서버 액션 호출

### 3. 전역 상태 관리

- **토스트 시스템**: 커스텀 훅과 리듀서 패턴
- **사이드바 상태**: Context API 사용

## 스타일링 시스템

### 디자인 토큰

```css
:root {
  --background: #1c1f2b; /* 딥네이비 배경 */
  --foreground: #ffffff; /* 흰색 텍스트 */
  --primary: #52e0c8; /* 민트 그린 */
  --secondary: #2d3142; /* 보조 색상 */
  --border: rgba(82, 224, 200, 0.2); /* 투명한 테두리 */
}
```

### 컴포넌트 스타일링

- **CVA (Class Variance Authority)**: 버튼 변형 관리
- **Tailwind Merge**: 클래스명 충돌 방지
- **커스텀 애니메이션**: 그라데이션 시프트, 글로우 효과

## 데이터 플로우

### 웨이팅 리스트 등록 플로우

1. 사용자가 폼 입력
2. `WaitlistForm` 컴포넌트에서 `submitToWaitlist` 서버 액션 호출
3. 서버 액션에서 노션 API로 데이터 전송
4. 결과를 클라이언트로 반환
5. 성공/실패 메시지 표시

### 환경 변수

```env
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_database_id
```

## 개발 가이드라인

### 코드 스타일

- **단일 파일 컴포넌트**: 불필요한 분리 최소화
- **Tailwind CSS**: 모든 스타일링은 클래스명으로 처리
- **타입 안전성**: TypeScript 활용
- **서버 액션**: API 호출은 서버 액션으로 제한

### 컴포넌트 설계 원칙

- **재사용성**: UI 컴포넌트는 `components/ui/`에 배치
- **단순성**: 복잡한 상태 관리 지양
- **접근성**: Radix UI 컴포넌트 활용

## 배포 및 빌드

### 빌드 설정

```javascript
// next.config.mjs
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
};
```

### 스크립트

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

## 주요 기능

### 1. 반응형 디자인

- 모바일 퍼스트 접근
- Tailwind CSS 브레이크포인트 활용

### 2. 다크 테마

- CSS 변수를 통한 테마 시스템
- 브랜드 색상 (딥네이비 + 민트)

### 3. 인터랙티브 요소

- 호버 효과
- 애니메이션
- 모달 시스템

### 4. 접근성

- Radix UI 컴포넌트
- 키보드 네비게이션
- 스크린 리더 지원

## 확장 가능성

### 추가 가능한 기능

- 다국어 지원 (i18n)
- 다크/라이트 테마 토글
- 애니메이션 라이브러리 통합
- SEO 최적화
- 성능 모니터링

### 아키텍처 개선점

- 컴포넌트 분리 고려
- 상태 관리 라이브러리 도입 (필요시)
- 테스트 코드 추가
- 스토리북 도입

---

이 문서는 SumSnap 랜딩 페이지 프로젝트의 구조와 패턴을 이해하는 데 도움이 됩니다. 프로젝트는 단순하고 효율적인 구조를 유지하면서도 확장 가능성을 고려하여 설계되었습니다.
