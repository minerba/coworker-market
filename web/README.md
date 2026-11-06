# 우리끼리 중고마켓 (웹/PWA)

회사 동료끼리 중고 물건을 거래하고 나눔하는 모바일 전용 웹앱입니다. 홈 화면에 추가하면 앱처럼 쓸 수 있습니다(PWA).

- 프론트엔드: Next.js (App Router) + Tailwind CSS, 배포는 Vercel
- 백엔드: Supabase (인증, DB, 사진 저장소, 실시간, 서버 함수)
- 이 저장소의 Android 폴더(`app/`, `bottom-navigation-bar/`)는 처음부터 있던 예제 코드이며 이 서비스와 관련이 없습니다.

## 실행

```bash
cd web
cp .env.example .env.local   # 값 채우기 (아래 환경 변수 참고)
npm install
npm run dev                  # 개발 서버
npm run build && npm start   # 운영 빌드 확인
```

환경 변수(`web/.env.local`, Vercel 프로젝트에도 동일하게 설정)

| 이름 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 주소 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개용(publishable) 키. 브라우저에 노출되어도 되는 키이며, 데이터 보호는 DB의 RLS가 담당 |

## 구조

```
web/src/app          화면 (홈, 탐색, 등록, 채팅, 내 정보, 알림, 관리자, 로그인)
web/src/components   공통 컴포넌트 (아이콘, 카드, 알림/인증 Provider 등)
web/src/lib          Supabase 클라이언트, 조회 함수(queries), 이미지 처리, 푸시
web/public/sw.js     서비스 워커 (정적 파일 캐시, 오프라인 화면, 푸시 수신)
supabase/migrations  DB 변경 이력 (순서대로 적용)
supabase/functions   서버 함수 (send-push: 웹 푸시 발송)
```

## DB 설정 (Supabase)

`supabase/migrations/`의 파일을 날짜 순서대로 적용합니다. 주요 내용:

- 가입 제한: `allowed_email_domains`(도메인)와 `allowed_emails`(개별 예외) 테이블, 가입 트리거가 허용되지 않은 메일의 가입을 거부
- 관리자: `admin_emails`에 등록된 메일은 가입·로그인 시 자동으로 관리자 권한을 받음
- 모든 테이블은 RLS 사용. 클라이언트에서 읽을 수 없는 설정(`push_config` 등)은 정책이 없음

### 운영 시 꼭 확인

1. **테스트용 예외 메일 제거**: `allowed_emails`에 테스트용 개인 메일이 들어 있습니다. 실제 오픈 전에 삭제하세요.
   `delete from public.allowed_emails where note like '%테스트%';`
2. **관리자 추가**: `insert into public.admin_emails (email) values ('user@example.com');` (소문자). 해당 사용자가 다시 로그인하면 반영됩니다.
3. **허용 도메인 추가**: `insert into public.allowed_email_domains (domain) values ('example.com');`

## 인증

- 이메일 인증 코드(8자리)로 가입·로그인하고, 이후 내 정보에서 비밀번호를 설정하면 다른 기기에서는 메일+비밀번호로 로그인합니다.
- 인증 메일은 Supabase 인증 설정의 **커스텀 SMTP**로 발송됩니다. 템플릿(Magic Link, Confirm signup)에 `{{ .Token }}`이 들어 있어야 코드가 보입니다.
- 기본 이메일 서버는 발송 한도가 매우 낮으므로 운영에서는 SMTP를 유지하세요. Gmail은 하루 약 500통 제한이 있어 사용자가 늘면 Resend/Brevo 같은 서비스로 바꾸는 것을 권장합니다.

## 푸시 알림

앱을 닫아도 새 메시지·관심 알림이 오도록 웹 푸시를 사용합니다.

1. 새 알림(`notifications`)이 생기면 DB 트리거가 `send-push` 서버 함수를 호출합니다 (`pg_net`).
2. 함수가 해당 사용자의 등록된 기기(`push_subscriptions`)로 푸시를 보냅니다. 만료된 기기는 자동 정리합니다.
3. 암호 키(VAPID)와 호출용 비밀값은 `push_config` 테이블에만 있으며 코드/저장소에 없습니다. 키는 함수가 첫 호출 때 스스로 만듭니다.
4. 브라우저는 함수의 `GET`으로 공개키를 받아 구독합니다. 알림 권한은 사용자가 내 정보에서 켭니다. iPhone은 홈 화면에 추가한 앱에서만 가능합니다(iOS 16.4 이상).

## 알려진 한계

- 회사 네트워크에서 `*.supabase.co`, `*.vercel.app`이 차단되어 있으면 앱이 동작하지 않습니다. 사내 서비스로 정식 운영하려면 IT/보안팀 승인과 접속 허용(또는 사내 호스팅)이 필요합니다.
- 앱 아이콘(`public/icons/`)은 임시 디자인입니다.
- 사진 썸네일은 새로 올리는 글부터 적용됩니다(기존 글은 원본 사용).
