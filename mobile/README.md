# 코워커마켓 앱 (안드로이드 / iOS)

웹앱(`../web`, https://coworker-market.vercel.app)을 [Capacitor](https://capacitorjs.com)로 감싼 앱입니다.

- 앱 화면은 배포된 웹앱을 그대로 불러옵니다. **웹을 수정해 배포하면 앱에도 바로 반영**되어 스토어 재심사 없이 화면을 고칠 수 있습니다.
- 앱 쪽은 기기 기능만 담당합니다: 푸시 알림 등록, 안드로이드 뒤로가기, 상태바, 스플래시, 앱 아이콘.
- 설정은 `capacitor.config.ts` (앱 이름, 앱 ID, 불러올 주소).

## 안드로이드 설치 파일 만들기

필요한 것: JDK 21, Android SDK(플랫폼 36, 빌드도구 36.0.0), Node 22.

```bash
cd mobile
npm install
npx cap sync android
cd android && ./gradlew assembleDebug      # 결과: android/app/build/outputs/apk/debug/app-debug.apk
```

또는 GitHub Actions의 **Android build**를 수동 실행하면 APK를 내려받을 수 있습니다.
debug 빌드는 테스트용입니다. 휴대폰에서 "출처를 알 수 없는 앱 설치"를 허용해야 설치됩니다.

## iOS

iOS 빌드는 **macOS + Xcode**가 필요합니다 (Linux/Windows에서는 불가).

```bash
cd mobile && npm install && npx cap sync ios && npx cap open ios
```

## 스토어에 올리기 전에 정해야 할 것

| 항목 | 내용 |
|---|---|
| **앱 ID** | 현재 `com.coworkermarket.app`(임시). 스토어에 올린 뒤에는 바꿀 수 없으므로, 실제로 소유한 도메인 기준으로 먼저 확정 |
| **Apple Developer Program** | 연 $99. iOS 설치(TestFlight 포함)와 App Store 배포에 필수. 가입 명의(개인/회사)는 회사 승인 필요 |
| **Google Play Console** | 1회 $25. 서명 키(keystore)는 분실하면 업데이트가 불가능하므로 안전하게 보관 |
| **푸시 알림** | Firebase 프로젝트 필요. 안드로이드는 `google-services.json`을 `android/app/`에, iOS는 `GoogleService-Info.plist`와 APNs 인증 키를 Firebase에 등록. 서버 쪽은 `send-push` 함수가 `push_config`의 `fcm_service_account`(서비스 계정 JSON)가 있으면 발송 |
| **스토어 등록 정보** | 앱 설명, 스크린샷, 개인정보 처리방침 주소(`/privacy`), 연령 등급, 데이터 안전/개인정보 항목 설문 |
| **회사 승인** | 임직원 대상 비공식 앱입니다. 공개 스토어 등록은 회사 이름 오인, 정보보안 규정과 충돌할 수 있어 사전 확인 필수 |

### 배포 방식 권장

처음에는 공개 스토어 대신 **비공개 시범 배포**를 권장합니다.

- 안드로이드: Play Console의 *내부 테스트* 트랙(최대 100명) 또는 APK 직접 배포
- iOS: *TestFlight* (App Store 심사 없이 최대 10,000명, 초대 링크)

### 심사 주의 (iOS)

Apple은 웹사이트를 단순히 감싼 앱을 반려할 수 있습니다(가이드라인 4.2). 푸시 알림, 기기 기능 연동 등 앱다운 기능을 갖추고 심사 메모에 설명하는 것이 좋습니다. 그래도 반려될 수 있어, 반려 시에는 웹 화면을 앱에 내장하는 방식으로 바꾸는 추가 작업이 필요합니다.

## 아직 되어 있지 않은 것

- 푸시 알림은 **앱 쪽 코드와 서버 코드까지 준비**되어 있지만, Firebase 설정 파일과 서비스 계정을 연결하기 전에는 동작하지 않습니다.
- 실제 휴대폰에서의 실행 테스트(이 저장소는 빌드까지만 확인함)
- 릴리스 서명(스토어용 AAB)과 iOS 서명
