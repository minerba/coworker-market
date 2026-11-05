# 코워커마켓 네이티브 앱 (React Native / Expo)

안드로이드와 iOS에서 **네이티브 화면**으로 동작하는 앱입니다. (`../mobile`은 웹을 감싼 하이브리드 방식이며, 이 앱이 완성되면 대체됩니다.)

- 서버(Supabase), 로그인, DB 규칙, 푸시 서버 함수는 웹앱과 **같은 것을 그대로 사용**합니다.
- 화면 이동은 Expo Router(`src/app/`), 서버 조회는 SWR 캐시, 아이콘은 웹앱과 같은 선 아이콘(`react-native-svg`)입니다.

## 화면

로그인(인증 코드/비밀번호) · 동의 · 홈(무한 스크롤) · 탐색(검색·필터·정렬) · 물건 등록/수정(사진 선택·압축·업로드) · 상품 상세(사진 넘기기, 좋아요, 채팅 시작) · 채팅 목록/대화방(실시간, 이전 메시지, 전송 실패 재시도) · 알림 · 내 정보(프로필, 알림, 비밀번호, 내 데이터 내려받기, 회원 탈퇴, 차단 목록) · 신고·차단 · 관리자 · 이용약관/개인정보 처리방침

## 실행

```bash
cd native
cp .env.example .env     # Supabase 주소와 공개용 키 입력 (웹앱과 같은 값)
npm install
npx tsc --noEmit         # 타입 검사
npx expo start           # 개발 서버 (개발 빌드 또는 에뮬레이터에서 열기)
```

> 푸시·사진 등 네이티브 기능이 있어 Expo Go가 아니라 **개발 빌드**가 필요합니다: `npx expo run:android` / `npx expo run:ios`

## 설치 파일 만들기

네이티브 폴더(`android/`, `ios/`)는 저장소에 없고 필요할 때 생성합니다(Continuous Native Generation).

```bash
# 안드로이드 APK (JDK 21, Android SDK 36 필요)
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease     # android/app/build/outputs/apk/release/app-release.apk
```

스토어 배포용 서명 빌드와 iOS 빌드는 **EAS Build**(클라우드, Mac 불필요)를 권장합니다.

```bash
npx eas-cli@latest login
npx eas-cli@latest init                    # EAS 프로젝트 연결 (푸시 알림 토큰에 필요)
npx eas-cli@latest build -p android --profile production
npx eas-cli@latest build -p ios --profile production      # Apple Developer 계정 필요
```

## 푸시 알림

- 앱은 Expo 푸시 토큰을 받아 `native_push_tokens`에 등록하고, 서버 함수 `send-push`가 Expo 푸시 서비스로 발송합니다 (별도 비밀 키 불필요).
- **EAS 프로젝트 연결(`eas init`)이 되어야 토큰을 받을 수 있고**, 안드로이드는 FCM 자격 증명을 EAS에 등록해야 실제 발송됩니다. iOS는 Apple Developer 계정(APNs 키)이 필요합니다.

## 스토어 배포 전 정해야 할 것

- 앱 ID `com.coworkermarket.app`(임시): 스토어에 올린 뒤에는 변경 불가
- Apple Developer Program(연 $99), Google Play Console(1회 $25)
- 회사 승인(정보보안·법무), 스토어 등록 정보(스크린샷, 설명, 개인정보 처리방침 주소)
- 처음에는 비공개 시범 배포(Play 내부 테스트, TestFlight)를 권장

## 아직 확인하지 못한 것

- 실제 기기·에뮬레이터에서의 실행(빌드와 번들까지만 검증)
- iOS 빌드
- 푸시 알림의 실제 수신
