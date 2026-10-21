# Stabilizace iOS Hybrid Launcher Pro (V3), Oprava Bugů & GitHub Actions APK Pipeline

Kompletní revize a oprava všech nalezených funkčních i systémových chyb v **iOS Hybrid Launcher Pro (V3)** doplněná o plně automatizovanou **GitHub Actions CI/CD pipeline**, která při každém nahrání kódu (Push, Pull Request i ruční spuštění) automaticky připraví podpisový klíč, zvaliduje testy, zkompiluje instalovatelný APK balíček a zpřístupní jej ke stažení v sekci Artifacts i GitHub Releases.

### User Review & Critical Decisions

> [!IMPORTANT]
> Níže je přehled klíčových oprav a nastavení automatického sestavování APK na GitHubu:

- **Oprava 6 identifikovaných chyb v aplikaci a nativním jádru**:
  1. **Oprava načítání vlastní tapety z galerie**: Sjednocení routování lokálního HTTPS serveru tak, aby bezchybně obsloužil požadavky na vlastní tapetu včetně cache-busting dotazů.
  2. **Oprava systémového tlačítka Home (`onNewIntent`)**: Přidání podpory pro opětovné stisknutí tlačítka Domů v běžícím Launcheru (`singleTask`), které okamžitě zavře otevřené složky, App Drawer či nastavení, ukončí Jiggle Mode a plynule vrátí uživatele na hlavní obrazovku.
  3. **Oprava Drag & Drop uvnitř otevřené složky a přesunu ven na plochu**: Umožnění přeřazování ikon uvnitř otevřeného modalu složky a přetažení ikony mimo kartu složky zpět na domovskou obrazovku.
  4. **Plně funkční stránkování uvnitř otevřené složky**: Pokud složka obsahuje více než 9 položek, lze mezi stránkami složky plynule přecházet vodorovným swipem nebo klepnutím na spodní stránkovací tečky.
  5. **Unikátní SVG gradienty ve widgetech Počasí**: Odstranění kolize duplicitních SVG identifikátorů při zobrazení více widgetů počasí současně.
  6. **Rozšířené filtrování v režimech Focus Center**: V režimu *Minimal / Do Not Disturb* dochází kromě ztlumení odznaků i k vizuálnímu zklidnění plochy na hlavní obrazovku bez ztráty uložených stránek.
- **Automatický GitHub Actions APK Build (`.github/workflows/build-apk.yml`)**:
  - Automaticky dekóduje přiložený podpisový klíč (`debug.keystore.base64` → `debug.keystore`), nastaví **JDK 21** a **Gradle 9.3.1** (bez nutnosti spouštěče `gradlew`), přijme licence Android SDK (API 36.1), spustí testy, sestaví podepsané APK a nahraje jej jako stažitelný artefakt **`iOS-Hybrid-Launcher-Pro-V3-APK`**.

---

### 1. Overview & Core Concept

- **Co tato aktualizace řeší**: Odstraňuje hraniční stavy při každodenním používání Launcheru jako výchozí domovské obrazovky Androidu a řeší specifika sestavování projektu mimo prostředí AI Studia (na GitHubu), kde standardně chybí dekódovaný `debug.keystore` a binární wrapper skript.
- **Cílová skupina**: Uživatelé a vývojáři exportující projekt na GitHub, kteří chtějí po každém commitu okamžitě stáhnout hotový, podepsaný a otestovaný `.apk` soubor připravený k instalaci do telefonu.
- **Hlavní přidaná hodnota**: 100% spolehlivost kompilace v cloudu (GitHub Actions) i při lokálním běhu a přirozené chování systémových gest (tlačítko Home, návrat Zpět, práce s více stránkami ve složkách a vlastní tapetou).

---

### 2. User Experience & Visual Design

- **Vylepšené uživatelské toky po opravě bugů**:
  1. **Přirozená reakce na systémové tlačítko Home**:
     - Kdykoliv je uživatel v otevřené složce, v App Draweru, v nastavení OLED Focus Center nebo na vzdálené stránce plochy a stiskne systémové tlačítko **Domů** (nebo provede gesto návratu domů), Launcher zachytí `onNewIntent` a plynule zavře všechna překryvná okna, zruší rozostření pozadí (`#workspace-backdrop-blur`) a přejede na první obrazovku.
  2. **Přetahování položek ze složky ven a stránkování složek**:
     - V otevřeném modalu složky lze položku v Jiggle Modu přetáhnout mimo skleněnou kartu složky — složka se automaticky zavře a položka se umístí na první volné místo aktivní obrazovky.
     - Pokud má složka více než 9 položek, aktivují se spodní stránkovací tečky a vodorovný swipe přímo uvnitř karty složky.
  3. **Spolehlivé načítání vlastní tapety z galerie**:
     - Po výběru fotografie v systémovém Android Photo Pickeru se obrázek okamžitě uloží, lokální HTTPS handler jej naservíruje se správnými hlavičkami bez cachování a tapeta se bez prodlevy vykreslí pod skleněnými prvky.

---

### 3. Key Product Decisions & Trade-Offs

- **Rozhodnutí 1: Bezobslužná příprava `debug.keystore` a Gradle 9.3.1 v GitHub Actions**
  - *Zvolený přístup*: Workflow nejprve dekóduje `debug.keystore.base64` do kořenového `debug.keystore` (a v případě absence vygeneruje platný debug klíč přes `keytool`) a využije oficiální akci `gradle/actions/setup-gradle@v4`, která si sama přečte verzi `9.3.1` z `gradle-wrapper.properties`.
  - *Proč*: Projekt v AI Studiu nepoužívá soubor `gradlew` a soubor `debug.keystore` je v `.gitignore`. Tento postup zaručuje, že GitHub Actions sestaví APK na první pokus bez nutnosti ručního nahrávání klíčů do GitHub Secrets.

- **Rozhodnutí 2: Robustní správa životního cyklu WebView a `onNewIntent`**
  - *Zvolený přístup*: Nativní aktivita deleguje událost `onNewIntent` do JavaScriptového handleru `window.onAndroidHomePressed()` a chrání veškerá volání `evaluateJavascript` proti neinicializovanému nebo zničenému WebView.
  - *Proč*: Zabraňuje únikům paměti a zajišťuje okamžitou odezvu při přepínání mezi aplikacemi a domovskou obrazovkou.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architektura oprav a GitHub Actions CI/CD Pipeline**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        GITHUB REPOSITORY (PUSH / PR / TAG)                   │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                 GITHUB ACTIONS WORKFLOW (Ubuntu Latest • JDK 21)             │
│                                                                              │
│  ┌──────────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │ 1. Keystore Preparation  │─▶│ 2. Gradle 9.3.1 &  │─▶│ 3. Build & Test  │  │
│  │ • Decode base64 keystore │  │    Android SDK 36  │  │ • Unit/Robol.    │  │
│  │ • Fallback keytool gen   │  │ • Cache Gradle/SDK │  │ • assembleDebug  │  │
│  └──────────────────────────┘  └────────────────────┘  └────────┬─────────┘  │
│                                                                 │            │
│                                                                 ▼            │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ 4. Artifact & Release Publishing                                       │  │
│  │ • Upload iOS-Hybrid-Launcher-Pro-V3.apk to Actions Artifacts           │  │
│  │ • Attach APK automatically to GitHub Release when tag v* is pushed     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                   RUNTIME STABILITY & BUGFIX ARCHITECTURE                    │
│                                                                              │
│  • MainActivity.onNewIntent() ──▶ window.onAndroidHomePressed()              │
│    (Closes all open modals/drawers, exits Jiggle Mode, scrolls to Page 0)    │
│                                                                              │
│  • LauncherAssetPathHandler (/wallpaper/custom & /wallpaper/custom.jpg)      │
│    (Serves custom gallery wallpaper with no-store cache headers)             │
│                                                                              │
│  • Folder Modal Multi-Page & Drag-Out Engine                                 │
│    (Supports 9 items/page swipe + dragging item outside card to Home grid)   │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Mapování opravovaných stavových přechodů**:
  - **Výběr vlastní tapety**: `PhotoPicker URI` → `LauncherRepository.saveCustomWallpaperFromUri()` → `LauncherAssetPathHandler` (podpora `/wallpaper/custom` i `/wallpaper/custom.jpg`) → okamžité překreslení `#wallpaper-layer`.
  - **Stisk tlačítka Home (`ACTION_MAIN` + `CATEGORY_HOME`)**: `MainActivity.onNewIntent()` → `window.onAndroidHomePressed()` → uzavření всех aktivních modálů, deaktivace `#workspace-backdrop-blur`, ukončení Jiggle Modu a návrat na `pageIndex = 0`.
  - **Přetažení položky z otevřené složky na plochu**: Detekce puštění prstu mimo `.folder-card` → odebrání uzlu z `folder.children` → umístění na první volný slot aktivní stránky → uložení do `launcher_state_v3.json`.
