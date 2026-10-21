# Oprava GitHub Actions Android SDK Pipeline (`Failed to find package 'tools'`)

Oprava selhání v **GitHub Actions** způsobeného akcí `android-actions/setup-android@v3`, která se ve výchozím nastavení pokouší přes `sdkmanager` nainstalovat historický balíček `tools` odstraněný z repozitáře Google Android SDK.

### User Review & Critical Decisions

> [!IMPORTANT]
> Příčina chyby a způsob jejího trvalého vyřešení:

- **Proč build na GitHubu selhal (`Warning: Failed to find package 'tools'`)**:
  - Akce třetí strany `android-actions/setup-android@v3` má natvrdo nastavený výchozí argument `packages: 'tools platform-tools'`.
  - Google z oficiálního repozitáře Android SDK (Command-line Tools 16.0) definitivně odstranil zastaralý balíček `tools`, takže volání `sdkmanager` uvnitř této akce okamžitě skončí s návratovým kódem `exit code 1`.
- **Jak opravíme `.github/workflows/build-apk.yml`**:
  - Úplně odstraníme problematický krok `android-actions/setup-android@v3`.
  - Využijeme přímo předinstalované **Android SDK** na GitHub runneru (`ubuntu-latest` má SDK připravené v `/usr/local/lib/android/sdk`), exportujeme `ANDROID_HOME` a `ANDROID_SDK_ROOT` do prostředí (`$GITHUB_ENV`) a zapíšeme oficiální hashe licencí přímo do `$ANDROID_HOME/licenses/` (spolu s potvrzením přes `sdkmanager --licenses`).
  - Android Gradle Plugin (AGP 9.1.0) si pak během kroku `gradle :app:assembleDebug` automaticky a bez interakce stáhne přesnou platformu (`android-36.1`) a `build-tools`.

---

### 1. Overview & Core Concept

- **Co tato oprava řeší**: Odstraňuje pád v kroku inicializace Android SDK na GitHub Actions runneru s Node.js 24 a `cmdline-tools/16.0`.
- **Hlavní přidaná hodnota**: Odstranění závislosti na neudržovaném wrapperu `android-actions/setup-android@v3` a přímé, deterministické nastavení `ANDROID_HOME`, `ANDROID_SDK_ROOT` a licenčních souborů Android SDK.

---

### 2. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                 OPRAVENÁ GITHUB ACTIONS PIPELINE (Ubuntu Latest)             │
│                                                                              │
│  1. Checkout & JDK 21 (actions/setup-java@v4, Temurin 21)                    │
│                                      │                                       │
│                                      ▼                                       │
│  2. Direct Android SDK & License Setup (BEZ android-actions/setup-android)   │
│     • Nastaví ANDROID_HOME=/usr/local/lib/android/sdk                        │
│     • Zapíše oficiální licenční hashe do $ANDROID_HOME/licenses/             │
│     • Potvrdí licence přes nalezený binární sdkmanager --licenses            │
│                                      │                                       │
│                                      ▼                                       │
│  3. Keystore Decode (base64 -d debug.keystore.base64 > debug.keystore)       │
│                                      │                                       │
│                                      ▼                                       │
│  4. Gradle 9.3.1 (gradle/actions/setup-gradle@v4)                            │
│     • gradle :app:testDebugUnitTest --no-daemon                              │
│     • gradle :app:assembleDebug --no-daemon                                  │
│                                      │                                       │
│                                      ▼                                       │
│  5. Upload APK Artifact (iOS-Hybrid-Launcher-Pro-V3-APK) & GitHub Release    │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Přesný seznam licenčních hashů zapisovaných do `$ANDROID_HOME/licenses/`**:
  - `android-sdk-license`: `24333f8a63b6825ea9c5514f83c2829b004d1fee` a `d56f5187479451eabf01fb78af6dfcb131a6481e`
  - `android-sdk-preview-license`: `84831b9409646a918e30573bab4c9c91346d8abd` a `504667f4c0de7af1a06de9f4b1727b84351f2910`
  - Tím je 100% zaručeno, že Gradle může během buildu doinstalovat libovolnou revizi `compileSdk = 36` (`36.1`) bez selhání na nepřijatých licencích nebo chybějícím balíčku `tools`.
