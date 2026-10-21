(function () {
    "use strict";

    const hasNativeBridge = typeof window.AndroidBridge !== "undefined";

    const Bridge = {
        getInstalledApps() {
            if (hasNativeBridge && window.AndroidBridge.getInstalledAppsJson) {
                try {
                    return JSON.parse(window.AndroidBridge.getInstalledAppsJson() || "[]");
                } catch (_) {
                    return [];
                }
            }
            return [];
        },
        loadState() {
            if (hasNativeBridge && window.AndroidBridge.loadLauncherState) {
                try {
                    const raw = window.AndroidBridge.loadLauncherState();
                    if (raw && raw.trim().length > 0) {
                        return JSON.parse(raw);
                    }
                } catch (_) {}
            }
            try {
                const v3Local = localStorage.getItem("ios_hybrid_launcher_state_v3");
                if (v3Local) return JSON.parse(v3Local);
                const v2Local = localStorage.getItem("ios_hybrid_launcher_state_v2");
                if (v2Local) return JSON.parse(v2Local);
                const v1Local = localStorage.getItem("ios_hybrid_launcher_state_v1");
                return v1Local ? JSON.parse(v1Local) : null;
            } catch (_) {
                return null;
            }
        },
        saveState(stateObj) {
            const jsonStr = JSON.stringify(stateObj);
            if (hasNativeBridge && window.AndroidBridge.saveLauncherState) {
                try {
                    window.AndroidBridge.saveLauncherState(jsonStr);
                } catch (_) {}
            }
            try {
                localStorage.setItem("ios_hybrid_launcher_state_v3", jsonStr);
            } catch (_) {}
        },
        launchApp(pkg) {
            this.haptic("light");
            incrementAppUsage(pkg);
            if (hasNativeBridge && window.AndroidBridge.launchApp) {
                const ok = window.AndroidBridge.launchApp(pkg);
                if (!ok) {
                    showToast("Aplikaci nelze spustit");
                }
            } else {
                showToast("Spouštím: " + pkg);
            }
        },
        uninstallApp(pkg) {
            this.haptic("medium");
            if (hasNativeBridge && window.AndroidBridge.uninstallApp) {
                window.AndroidBridge.uninstallApp(pkg);
            }
        },
        openAppInfo(pkg) {
            this.haptic("light");
            if (hasNativeBridge && window.AndroidBridge.openAppInfo) {
                window.AndroidBridge.openAppInfo(pkg);
            }
        },
        getSystemStatus() {
            if (hasNativeBridge && window.AndroidBridge.getSystemStatusJson) {
                try {
                    return JSON.parse(window.AndroidBridge.getSystemStatusJson());
                } catch (_) {}
            }
            return {
                battery: { level: 92, isCharging: false, temperature: 27.2 },
                metrics: {
                    ramUsedPercent: 48,
                    ramUsedGb: 3.8,
                    ramTotalGb: 8.0,
                    storageUsedPercent: 42,
                    storageFreeGb: 74.2,
                    storageTotalGb: 128.0
                },
                badges: {},
                notificationAccessGranted: false,
                hasCustomWallpaper: false,
                fileAccessGranted: false,
                isMusicActive: false
            };
        },
        dispatchMediaKey(action) {
            this.haptic("light");
            if (hasNativeBridge && window.AndroidBridge.dispatchMediaKey) {
                try {
                    return !!window.AndroidBridge.dispatchMediaKey(action);
                } catch (_) {
                    return false;
                }
            }
            return true;
        },
        searchWeb(query) {
            this.haptic("light");
            if (hasNativeBridge && window.AndroidBridge.searchWeb) {
                try {
                    return !!window.AndroidBridge.searchWeb(query);
                } catch (_) {}
            }
            window.open("https://www.google.com/search?q=" + encodeURIComponent(query), "_blank");
            return true;
        },
        openNotificationSettings() {
            if (hasNativeBridge && window.AndroidBridge.openNotificationSettings) {
                window.AndroidBridge.openNotificationSettings();
            }
        },
        expandStatusBar() {
            if (hasNativeBridge && window.AndroidBridge.expandStatusBar) {
                window.AndroidBridge.expandStatusBar();
            }
        },
        openWallpaperPicker() {
            if (hasNativeBridge && window.AndroidBridge.openWallpaperPicker) {
                window.AndroidBridge.openWallpaperPicker();
            }
        },
        openSystemSettings() {
            if (hasNativeBridge && window.AndroidBridge.openSystemSettings) {
                window.AndroidBridge.openSystemSettings();
            }
        },
        hasFilePermissions() {
            if (hasNativeBridge && window.AndroidBridge.hasFilePermissions) {
                try {
                    return !!window.AndroidBridge.hasFilePermissions();
                } catch (_) {}
            }
            return false;
        },
        requestFilePermissions() {
            if (hasNativeBridge && window.AndroidBridge.requestFilePermissions) {
                window.AndroidBridge.requestFilePermissions();
            } else {
                showToast("Oprávnění k souborům je dostupné na zařízení Android");
            }
        },
        searchFiles(query, categoriesOrFilter) {
            if (hasNativeBridge && window.AndroidBridge.searchFilesJson) {
                try {
                    const payload = typeof categoriesOrFilter === "string"
                        ? categoriesOrFilter
                        : JSON.stringify(categoriesOrFilter || {});
                    const raw = window.AndroidBridge.searchFilesJson(query || "", payload);
                    return JSON.parse(raw || "[]");
                } catch (_) {
                    return [];
                }
            }
            return [];
        },
        openFile(uriString, mimeType) {
            this.haptic("light");
            if (hasNativeBridge && window.AndroidBridge.openFile) {
                const ok = window.AndroidBridge.openFile(uriString, mimeType || "*/*");
                if (!ok) showToast("Soubor nelze otevřít");
                return ok;
            }
            showToast("Otevírám soubor: " + uriString);
            return true;
        },
        shareFile(uriString, mimeType) {
            this.haptic("light");
            if (hasNativeBridge && window.AndroidBridge.shareFile) {
                return window.AndroidBridge.shareFile(uriString, mimeType || "*/*");
            }
            showToast("Sdílím soubor");
            return true;
        },
        haptic(type) {
            if (hasNativeBridge && window.AndroidBridge.hapticFeedback) {
                try {
                    window.AndroidBridge.hapticFeedback(type || "light");
                } catch (_) {}
            }
        }
    };

    const FALLBACK_DEMO_APPS = [
        { label: "Telefon", packageName: "com.android.dialer", className: "", isSystemApp: true, firstInstallTime: 1700000000000 },
        { label: "Zprávy", packageName: "com.google.android.apps.messaging", className: "", isSystemApp: true, firstInstallTime: 1700000000000 },
        { label: "Chrome", packageName: "com.android.chrome", className: "", isSystemApp: true, firstInstallTime: 1700000000000 },
        { label: "Fotoaparát", packageName: "com.android.camera2", className: "", isSystemApp: true, firstInstallTime: 1700000000000 },
        { label: "Nastavení", packageName: "com.android.settings", className: "", isSystemApp: true, firstInstallTime: 1700000000000 },
        { label: "Galerie", packageName: "com.google.android.apps.photos", className: "", isSystemApp: false, firstInstallTime: 1715000000000 },
        { label: "Kalendář", packageName: "com.google.android.calendar", className: "", isSystemApp: false, firstInstallTime: 1716000000000 },
        { label: "Kalkulačka", packageName: "com.google.android.calculator", className: "", isSystemApp: true, firstInstallTime: 1700000000000 },
        { label: "Hodiny", packageName: "com.google.android.deskclock", className: "", isSystemApp: true, firstInstallTime: 1700000000000 },
        { label: "Mapy", packageName: "com.google.android.apps.maps", className: "", isSystemApp: false, firstInstallTime: 1718000000000 },
        { label: "YouTube", packageName: "com.google.android.youtube", className: "", isSystemApp: false, firstInstallTime: 1719000000000 },
        { label: "Soubory", packageName: "com.google.android.documentsui", className: "", isSystemApp: true, firstInstallTime: 1700000000000 }
    ];

    const DEFAULT_AGENDA_EVENTS = [
        { id: "ev_1", title: "Product Design Review", time: "10:00 – 11:00", color: "#0A84FF" },
        { id: "ev_2", title: "Oběd v centru Prahy", time: "12:30 – 13:30", color: "#30D158" },
        { id: "ev_3", title: "Release iOS Launcher Pro V3", time: "16:00 – 17:00", color: "#BF5AF2" }
    ];

    const MEDIA_PLAYLIST_TRACKS = [
        { title: "Midnight Titanium", artist: "Spatial Glass Ensemble", progress: 64, emoji: "🎵" },
        { title: "Prague Neon Horizon", artist: "Synthwave Collective", progress: 38, emoji: "🎧" },
        { title: "Aurora Deep Focus", artist: "Ambient Architecture", progress: 81, emoji: "🎹" }
    ];

    let installedApps = [];
    let appMap = new Map();
    let systemStatus = Bridge.getSystemStatus();
    let state = null;

    let isJiggleMode = false;
    let folderNavStack = [];
    let activeFolderModalPage = 0;
    let activeDockPage = 0;
    let activeFileFilterCat = "all";
    let mediaTrackIndex = 0;
    let isMediaPlayingLocal = Boolean(systemStatus && systemStatus.isMusicActive);

    let quickActionTarget = null;
    let editingWidgetId = null;
    let editingPerItemId = null;
    let widgetInsertTargetFolderId = null;
    let folderCreatorParentId = null;
    let pendingPinFolderId = null;
    let pendingPinCallback = null;
    let enteredPinDigits = "";

    let lastEmptyTapTimestamp = 0;
    let clockIntervalId = null;
    let fileSearchDebounceTimer = null;

    // DOM Elementy
    const wallpaperLayer = document.getElementById("wallpaper-layer");
    const workspaceBackdropBlur = document.getElementById("workspace-backdrop-blur");
    const jiggleToolbar = document.getElementById("jiggle-toolbar");
    const jiggleAddPopover = document.getElementById("jiggle-add-popover");
    const focusStatusBanner = document.getElementById("focus-status-banner");
    const focusStatusIcon = document.getElementById("focus-status-icon");
    const focusStatusLabel = document.getElementById("focus-status-label");
    const pagesViewport = document.getElementById("pages-viewport");
    const pagesTrack = document.getElementById("pages-track");
    const pageDots = document.getElementById("page-dots");
    const btnSearchPill = document.getElementById("btn-search-pill");
    const smartSearchWideBar = document.getElementById("smart-search-wide-bar");
    const dockWrapper = document.getElementById("dock-wrapper");
    const iosDock = document.getElementById("ios-dock");
    const iosDockViewport = document.getElementById("ios-dock-viewport");
    const iosDockTrack = document.getElementById("ios-dock-track");
    const dockPageDots = document.getElementById("dock-page-dots");

    const appDrawer = document.getElementById("app-drawer");
    const drawerSearchInput = document.getElementById("drawer-search-input");
    const btnClearSearch = document.getElementById("btn-clear-search");
    const drawerScrollContainer = document.getElementById("drawer-scroll-container");
    const drawerSections = document.getElementById("drawer-sections");
    const drawerFileFilterBar = document.getElementById("drawer-file-filter-bar");
    const drawerFilesSection = document.getElementById("drawer-files-section");
    const drawerFilesList = document.getElementById("drawer-files-list");
    const btnGrantFilesInline = document.getElementById("btn-grant-files-inline");
    const drawerWebSearchBox = document.getElementById("drawer-web-search-box");
    const btnSearchWebQuery = document.getElementById("btn-search-web-query");
    const webSearchQueryTitle = document.getElementById("web-search-query-title");
    const azIndexBar = document.getElementById("az-index-bar");

    const folderModal = document.getElementById("folder-modal");
    const folderBreadcrumbs = document.getElementById("folder-breadcrumbs");
    const folderTitleInput = document.getElementById("folder-title-input");
    const btnClearFolderTitle = document.getElementById("btn-clear-folder-title");
    const folderKindBadge = document.getElementById("folder-kind-badge");
    const folderGrid = document.getElementById("folder-grid");
    const folderPaginationDots = document.getElementById("folder-pagination-dots");

    const quickActionOverlay = document.getElementById("quick-action-overlay");
    const widgetPickerModal = document.getElementById("widget-picker-modal");
    const widgetConfigModal = document.getElementById("widget-config-modal");
    const customizationSheet = document.getElementById("customization-sheet");
    const folderCreatorModal = document.getElementById("folder-creator-modal");
    const folderAppPickerModal = document.getElementById("folder-app-picker-modal");
    const pinVaultModal = document.getElementById("pin-vault-modal");
    const perItemEditorModal = document.getElementById("per-item-editor-modal");
    const aodOverlay = document.getElementById("aod-overlay");
    const toastEl = document.getElementById("launcher-toast");

    function uid(prefix) {
        return (prefix || "node") + "_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
    }

    function showToast(msg) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.remove("hidden");
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => {
            toastEl.classList.add("hidden");
        }, 2300);
    }

    // Dynamická správa rozostření pracovní plochy (#workspace-backdrop-blur)
    function syncWorkspaceBackdropBlur() {
        const anyModalOpen = [
            appDrawer,
            folderModal,
            quickActionOverlay,
            widgetPickerModal,
            widgetConfigModal,
            customizationSheet,
            folderCreatorModal,
            folderAppPickerModal,
            pinVaultModal,
            perItemEditorModal
        ].some((el) => el && !el.classList.contains("hidden"));

        if (workspaceBackdropBlur) {
            workspaceBackdropBlur.classList.toggle("active", anyModalOpen);
        }
        document.body.classList.toggle("workspace-blurred", anyModalOpen);
    }

    function incrementAppUsage(pkg) {
        if (!state || !pkg) return;
        if (!state.appUsageCounts) state.appUsageCounts = {};
        state.appUsageCounts[pkg] = (state.appUsageCounts[pkg] || 0) + 1;
        Bridge.saveState(state);
    }

    // =========================================================================
    // V1 / V2 -> V3 MIGRACE & SELF-HEALING VALIDATOR
    // =========================================================================
    function createDefaultCustomStyle() {
        return {
            customLabel: "",
            customEmoji: "",
            scale: 100,
            bgColor: "",
            borderColor: "",
            hideLabel: false
        };
    }

    function getFolderDimensions(folderSize) {
        switch (folderSize) {
            case "2x1":
                return { colSpan: 2, rowSpan: 1 };
            case "2x2":
                return { colSpan: 2, rowSpan: 2 };
            case "3x3":
                return { colSpan: 3, rowSpan: 3 };
            default:
                return { colSpan: 1, rowSpan: 1 };
        }
    }

    function normalizeNode(rawNode, seenIds) {
        if (!rawNode || typeof rawNode !== "object") return null;

        let id = typeof rawNode.id === "string" && rawNode.id.trim() ? rawNode.id.trim() : uid(rawNode.type || "node");
        if (seenIds.has(id)) {
            id = uid(rawNode.type || "node");
        }
        seenIds.add(id);

        const customStyle = Object.assign(createDefaultCustomStyle(), rawNode.customStyle || {});
        customStyle.scale = Math.max(80, Math.min(140, Number(customStyle.scale) || 100));

        const rawType = String(rawNode.type || "app");
        let type = rawType;
        let forcedFolderKind = null;
        if (rawType === "smart_folder") {
            type = "folder";
            forcedFolderKind = "smart";
        } else if (rawType === "vault_folder") {
            type = "folder";
            forcedFolderKind = "vault";
        } else if (rawType === "file_folder") {
            type = "folder";
            forcedFolderKind = "files";
        }

        if (type === "app") {
            const pkg = typeof rawNode.packageName === "string" ? rawNode.packageName.trim() : "";
            if (!pkg) return null;
            return {
                id,
                type: "app",
                packageName: pkg,
                col: Number.isFinite(rawNode.col) ? rawNode.col : 0,
                row: Number.isFinite(rawNode.row) ? rawNode.row : 0,
                colSpan: 1,
                rowSpan: 1,
                customStyle
            };
        }

        if (type === "widget") {
            const validWidgetTypes = ["weather", "calendar", "clock", "rings", "media", "battery"];
            const widgetType = validWidgetTypes.includes(rawNode.widgetType) ? rawNode.widgetType : "clock";
            const colSpan = rawNode.colSpan === 4 ? 4 : rawNode.colSpan === 1 ? 1 : 2;
            const rowSpan = rawNode.rowSpan === 1 ? 1 : 2;

            return {
                id,
                type: "widget",
                widgetType,
                col: Number.isFinite(rawNode.col) ? rawNode.col : 0,
                row: Number.isFinite(rawNode.row) ? rawNode.row : 0,
                colSpan,
                rowSpan,
                style: rawNode.style || (widgetType === "clock" ? "digital" : "ring"),
                city: typeof rawNode.city === "string" && rawNode.city.trim() ? rawNode.city.trim() : "Praha",
                tempUnit: rawNode.tempUnit === "F" ? "F" : "C",
                weatherCondition: rawNode.weatherCondition || "partly_cloudy",
                agendaItems: Array.isArray(rawNode.agendaItems) && rawNode.agendaItems.length > 0
                    ? rawNode.agendaItems
                    : DEFAULT_AGENDA_EVENTS.map((ev) => Object.assign({}, ev)),
                bgColor: rawNode.bgColor || "#101520",
                accentColor: rawNode.accentColor || "#0A84FF",
                opacity: Math.max(20, Math.min(95, Number(rawNode.opacity) || 68)),
                customStyle
            };
        }

        if (type === "folder") {
            const folderSize = ["1x1", "2x1", "2x2", "3x3"].includes(rawNode.folderSize) ? rawNode.folderSize : "1x1";
            const dims = getFolderDimensions(folderSize);
            const rawKind = forcedFolderKind || rawNode.folderKind;
            const folderKind = ["standard", "smart", "vault", "files"].includes(rawKind) ? rawKind : "standard";

            let rawChildren = [];
            if (Array.isArray(rawNode.children)) {
                rawChildren = rawNode.children;
            } else if (Array.isArray(rawNode.apps)) {
                // Migrace z V1: pole packageName řetězců `apps` na plnohodnotné uzly `LauncherNode`
                rawChildren = rawNode.apps.map((pkg) => ({
                    id: uid("app"),
                    type: "app",
                    packageName: String(pkg)
                }));
            }

            const children = [];
            for (const child of rawChildren) {
                const normalizedChild = normalizeNode(child, seenIds);
                if (normalizedChild) {
                    children.push(normalizedChild);
                }
            }

            return {
                id,
                type: "folder",
                title: typeof rawNode.title === "string" && rawNode.title.trim() ? rawNode.title.trim() : "Složka",
                col: Number.isFinite(rawNode.col) ? rawNode.col : 0,
                row: Number.isFinite(rawNode.row) ? rawNode.row : 0,
                colSpan: dims.colSpan,
                rowSpan: dims.rowSpan,
                folderSize,
                folderKind,
                smartRule: ["games_media", "social", "system", "most_used", "recent", "keyword"].includes(rawNode.smartRule)
                    ? rawNode.smartRule
                    : "games_media",
                smartKeyword: typeof rawNode.smartKeyword === "string" ? rawNode.smartKeyword : "",
                pinCode: typeof rawNode.pinCode === "string" && /^\d{4}$/.test(rawNode.pinCode) ? rawNode.pinCode : "1234",
                fileCategory: ["all", "docs", "images", "videos", "audio", "archives"].includes(rawNode.fileCategory)
                    ? rawNode.fileCategory
                    : "all",
                children,
                customStyle
            };
        }

        return null;
    }

    function buildProWidgetsSecondPage(seenIds) {
        const items = [
            normalizeNode({
                id: uid("widget_weather"),
                type: "widget",
                widgetType: "weather",
                col: 0,
                row: 0,
                colSpan: 2,
                rowSpan: 2,
                city: "Praha",
                tempUnit: "C",
                weatherCondition: "partly_cloudy",
                bgColor: "#101520",
                accentColor: "#0A84FF",
                opacity: 68
            }, seenIds),
            normalizeNode({
                id: uid("widget_rings"),
                type: "widget",
                widgetType: "rings",
                col: 2,
                row: 0,
                colSpan: 2,
                rowSpan: 2,
                bgColor: "#101520",
                accentColor: "#30D158",
                opacity: 68
            }, seenIds),
            normalizeNode({
                id: uid("widget_calendar"),
                type: "widget",
                widgetType: "calendar",
                col: 0,
                row: 2,
                colSpan: 4,
                rowSpan: 2,
                agendaItems: DEFAULT_AGENDA_EVENTS.map((ev) => Object.assign({}, ev)),
                bgColor: "#101520",
                accentColor: "#FF453A",
                opacity: 68
            }, seenIds),
            normalizeNode({
                id: uid("widget_media"),
                type: "widget",
                widgetType: "media",
                col: 0,
                row: 4,
                colSpan: 4,
                rowSpan: 2,
                bgColor: "#141828",
                accentColor: "#BF5AF2",
                opacity: 70
            }, seenIds)
        ].filter(Boolean);

        return {
            id: uid("page_pro_suite"),
            role: "work",
            items
        };
    }

    function buildInitialDefaultStateV3() {
        const apps = installedApps.length > 0 ? installedApps : FALLBACK_DEMO_APPS;
        const page1Items = [];

        // 1. Horní widgety na první obrazovce: Smart Digital Hodiny (2×2) + Baterie (2×2)
        page1Items.push({
            id: uid("widget_clock"),
            type: "widget",
            widgetType: "clock",
            col: 0,
            row: 0,
            colSpan: 2,
            rowSpan: 2,
            style: "digital",
            bgColor: "#101520",
            accentColor: "#0A84FF",
            opacity: 65,
            customStyle: createDefaultCustomStyle()
        });

        page1Items.push({
            id: uid("widget_battery"),
            type: "widget",
            widgetType: "battery",
            col: 2,
            row: 0,
            colSpan: 2,
            rowSpan: 2,
            style: "ring",
            bgColor: "#101520",
            accentColor: "#30D158",
            opacity: 65,
            customStyle: createDefaultCustomStyle()
        });

        const dockCandidates = apps.slice(0, 4);
        const dockPackages = new Set(dockCandidates.map((a) => a.packageName));
        const remainingApps = apps.filter((a) => !dockPackages.has(a.packageName));

        // Ukázková rozbalená Enlarged 2×2 složka na první obrazovce (s vnořenou podsložkou)
        if (remainingApps.length >= 4) {
            const folderApps = remainingApps.slice(0, 3).map((app) => ({
                id: uid("app"),
                type: "app",
                packageName: app.packageName,
                col: 0,
                row: 0,
                colSpan: 1,
                rowSpan: 1,
                customStyle: createDefaultCustomStyle()
            }));

            const nestedSubfolder = {
                id: uid("subfolder"),
                type: "folder",
                title: "Nástroje",
                col: 0,
                row: 0,
                colSpan: 1,
                rowSpan: 1,
                folderSize: "1x1",
                folderKind: "standard",
                smartRule: "system",
                smartKeyword: "",
                pinCode: "1234",
                fileCategory: "all",
                children: remainingApps.slice(3, 5).map((app) => ({
                    id: uid("app"),
                    type: "app",
                    packageName: app.packageName,
                    col: 0,
                    row: 0,
                    colSpan: 1,
                    rowSpan: 1,
                    customStyle: createDefaultCustomStyle()
                })),
                customStyle: createDefaultCustomStyle()
            };

            page1Items.push({
                id: uid("folder_enlarged"),
                type: "folder",
                title: "Oblíbené 2×2",
                col: 0,
                row: 2,
                colSpan: 2,
                rowSpan: 2,
                folderSize: "2x2",
                folderKind: "standard",
                smartRule: "most_used",
                smartKeyword: "",
                pinCode: "1234",
                fileCategory: "all",
                children: [...folderApps, nestedSubfolder],
                customStyle: createDefaultCustomStyle()
            });
        }

        // Doplnění aplikací na první obrazovku
        const gridApps = remainingApps.slice(4, 12);
        let col = 2;
        let row = 2;
        for (const app of gridApps) {
            if (row >= 6) break;
            page1Items.push({
                id: uid("app"),
                type: "app",
                packageName: app.packageName,
                col,
                row,
                colSpan: 1,
                rowSpan: 1,
                customStyle: createDefaultCustomStyle()
            });
            col++;
            if (col >= 4) {
                col = 0;
                row++;
            }
        }

        const dockItems = dockCandidates.map((app, idx) => ({
            id: uid("dock"),
            type: "app",
            packageName: app.packageName,
            col: idx,
            row: 0,
            colSpan: 1,
            rowSpan: 1,
            customStyle: createDefaultCustomStyle()
        }));

        const seenIds = new Set();
        const page2ProSuite = buildProWidgetsSecondPage(seenIds);

        return {
            version: 3,
            activePage: 0,
            focusMode: "personal",
            searchBarStyle: "smart_wide",
            gridCols: 4,
            gridRows: 6,
            drawerLayout: "grid",
            drawerCols: 4,
            searchDeviceFiles: true,
            fileSearchCategories: {
                docs: true,
                images: true,
                videos: true,
                audio: true,
                archives: true
            },
            theme: {
                wallpaper: "titanium-dark",
                accentColor: "#0A84FF",
                blurStrength: 28,
                glassOpacity: 62,
                wallpaperDim: 15,
                iconStyle: "default",
                iconShape: "squircle",
                iconScale: 100,
                pageTransition: "slide",
                showLabels: true,
                labelSize: 11.5,
                labelWeight: "500",
                labelColor: "#FFFFFF",
                labelShadow: true,
                showBadges: true,
                badgeStyle: "number",
                badgePosition: "top-right",
                badgeColor: "#FF453A",
                doubleTapAction: "none",
                lockLayout: false
            },
            dockConfig: {
                style: "pill",
                cols: 4,
                pages: 2,
                height: 84,
                marginBottom: 4,
                cornerRadius: 32,
                blur: 28,
                iconScale: 100,
                showLabels: false
            },
            appUsageCounts: {},
            pages: [
                { id: uid("page_main"), role: "personal", items: page1Items },
                page2ProSuite
            ],
            dock: dockItems
        };
    }

    function runSelfHealingValidator(rawState) {
        const defaults = buildInitialDefaultStateV3();
        if (!rawState || typeof rawState !== "object") {
            state = defaults;
            return;
        }

        const wasOlderVersion = !rawState.version || Number(rawState.version) < 3;
        const seenIds = new Set();

        const gridCols = [4, 5].includes(Number(rawState.gridCols)) ? Number(rawState.gridCols) : 4;
        const gridRows = [6, 7].includes(Number(rawState.gridRows)) ? Number(rawState.gridRows) : 6;

        const theme = Object.assign({}, defaults.theme, rawState.theme || {});
        const dockConfig = Object.assign({}, defaults.dockConfig, rawState.dockConfig || {});
        dockConfig.cols = Math.max(1, Math.min(7, Number(dockConfig.cols) || 4));
        dockConfig.pages = Math.max(1, Math.min(3, Number(dockConfig.pages) || 2));

        const fileSearchCategories = Object.assign(
            {},
            defaults.fileSearchCategories,
            rawState.fileSearchCategories || {}
        );

        const rawPages = Array.isArray(rawState.pages) && rawState.pages.length > 0
            ? rawState.pages
            : defaults.pages;

        const validatedPages = [];
        for (const rawPage of rawPages) {
            const pageItems = [];
            const rawItems = Array.isArray(rawPage.items) ? rawPage.items : [];
            const occupied = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));

            for (const rawItem of rawItems) {
                const node = normalizeNode(rawItem, seenIds);
                if (!node) continue;

                node.colSpan = Math.min(node.colSpan, gridCols);
                node.rowSpan = Math.min(node.rowSpan, gridRows);
                node.col = Math.max(0, Math.min(gridCols - node.colSpan, node.col));
                node.row = Math.max(0, Math.min(gridRows - node.rowSpan, node.row));

                if (!canFitMatrix(occupied, node.col, node.row, node.colSpan, node.rowSpan, gridCols, gridRows)) {
                    const free = findFirstFreeMatrixSlot(occupied, node.colSpan, node.rowSpan, gridCols, gridRows);
                    if (free) {
                        node.col = free.col;
                        node.row = free.row;
                    } else if (node.type === "folder" && node.folderSize !== "1x1") {
                        node.folderSize = "1x1";
                        node.colSpan = 1;
                        node.rowSpan = 1;
                        const fallbackFree = findFirstFreeMatrixSlot(occupied, 1, 1, gridCols, gridRows);
                        if (fallbackFree) {
                            node.col = fallbackFree.col;
                            node.row = fallbackFree.row;
                        } else {
                            continue;
                        }
                    } else {
                        continue;
                    }
                }

                markMatrix(occupied, node.col, node.row, node.colSpan, node.rowSpan, true);
                pageItems.push(node);
            }

            validatedPages.push({
                id: rawPage.id || uid("page"),
                role: rawPage.role || "personal",
                items: pageItems
            });
        }

        if (validatedPages.length === 0) {
            validatedPages.push(defaults.pages[0]);
        }

        // Při přechodu ze starší verze (V1/V2) na V3 zachováme 1. obrazovku a přidáme 2. obrazovku s novými Pro Widgety
        const hasProWidgetsAlready = validatedPages.some((p) =>
            p.items.some((it) =>
                it.type === "widget" && ["weather", "calendar", "rings", "media"].includes(it.widgetType)
            )
        );
        if (wasOlderVersion && !hasProWidgetsAlready) {
            validatedPages.push(buildProWidgetsSecondPage(seenIds));
        }

        const maxDockItems = dockConfig.cols * dockConfig.pages;
        const rawDock = Array.isArray(rawState.dock) ? rawState.dock : defaults.dock;
        const validatedDock = [];
        for (const rawDockItem of rawDock) {
            if (validatedDock.length >= maxDockItems) break;
            const dNode = normalizeNode(rawDockItem, seenIds);
            if (!dNode) continue;
            dNode.colSpan = 1;
            dNode.rowSpan = 1;
            if (dNode.type === "folder") {
                dNode.folderSize = "1x1";
            }
            validatedDock.push(dNode);
        }

        state = {
            version: 3,
            activePage: Math.max(0, Math.min(validatedPages.length - 1, Number(rawState.activePage) || 0)),
            focusMode: ["personal", "work", "minimal"].includes(rawState.focusMode) ? rawState.focusMode : "personal",
            searchBarStyle: ["smart_wide", "ios_pill", "dots_only"].includes(rawState.searchBarStyle)
                ? rawState.searchBarStyle
                : "smart_wide",
            gridCols,
            gridRows,
            drawerLayout: ["grid", "library", "list", "paged"].includes(rawState.drawerLayout)
                ? rawState.drawerLayout
                : "grid",
            drawerCols: [3, 4, 5].includes(Number(rawState.drawerCols)) ? Number(rawState.drawerCols) : 4,
            searchDeviceFiles: rawState.searchDeviceFiles !== false,
            fileSearchCategories,
            theme,
            dockConfig,
            appUsageCounts: rawState.appUsageCounts && typeof rawState.appUsageCounts === "object"
                ? rawState.appUsageCounts
                : {},
            pages: validatedPages,
            dock: validatedDock
        };
    }

    function canFitMatrix(matrix, col, row, colSpan, rowSpan, maxCols, maxRows) {
        if (col < 0 || row < 0 || col + colSpan > maxCols || row + rowSpan > maxRows) return false;
        for (let r = row; r < row + rowSpan; r++) {
            for (let c = col; c < col + colSpan; c++) {
                if (matrix[r][c]) return false;
            }
        }
        return true;
    }

    function markMatrix(matrix, col, row, colSpan, rowSpan, val) {
        for (let r = row; r < row + rowSpan; r++) {
            for (let c = col; c < col + colSpan; c++) {
                if (matrix[r] && typeof matrix[r][c] !== "undefined") {
                    matrix[r][c] = val;
                }
            }
        }
    }

    function findFirstFreeMatrixSlot(matrix, colSpan, rowSpan, maxCols, maxRows) {
        for (let r = 0; r <= maxRows - rowSpan; r++) {
            for (let c = 0; c <= maxCols - colSpan; c++) {
                if (canFitMatrix(matrix, c, r, colSpan, rowSpan, maxCols, maxRows)) {
                    return { col: c, row: r };
                }
            }
        }
        return null;
    }

    // =========================================================================
    // REKURZIVNÍ STROMOVÉ OPERACE & OCHRANA PROTI ZACYKLENÍ
    // =========================================================================
    function findNodeDeep(targetId) {
        if (!state || !targetId) return null;

        function searchList(list, parentFolder, pageIndex, isDock) {
            for (let i = 0; i < list.length; i++) {
                const item = list[i];
                if (item.id === targetId) {
                    return { node: item, parentList: list, index: i, parentFolder, pageIndex, isDock };
                }
                if (item.type === "folder" && Array.isArray(item.children)) {
                    const found = searchList(item.children, item, pageIndex, isDock);
                    if (found) return found;
                }
            }
            return null;
        }

        for (let pIdx = 0; pIdx < state.pages.length; pIdx++) {
            const res = searchList(state.pages[pIdx].items, null, pIdx, false);
            if (res) return res;
        }

        return searchList(state.dock, null, -1, true);
    }

    function isDescendantOrSelf(sourceNodeId, targetFolderId) {
        if (!sourceNodeId || !targetFolderId) return false;
        if (sourceNodeId === targetFolderId) return true;

        const sourceInfo = findNodeDeep(sourceNodeId);
        if (!sourceInfo || sourceInfo.node.type !== "folder") return false;

        function checkChildren(folderNode) {
            if (!Array.isArray(folderNode.children)) return false;
            for (const child of folderNode.children) {
                if (child.id === targetFolderId) return true;
                if (child.type === "folder" && checkChildren(child)) return true;
            }
            return false;
        }

        return checkChildren(sourceInfo.node);
    }

    function removeNodeById(targetId) {
        const found = findNodeDeep(targetId);
        if (!found) return null;
        const [removed] = found.parentList.splice(found.index, 1);
        return removed;
    }

    // =========================================================================
    // MAPA APLIKACÍ, IKONY & NOTIFIKAČNÍ ODZNAKY
    // =========================================================================
    function rebuildAppMap(appsList) {
        installedApps = Array.isArray(appsList) && appsList.length > 0 ? appsList : FALLBACK_DEMO_APPS;
        appMap.clear();
        for (const app of installedApps) {
            appMap.set(app.packageName, app);
        }
    }

    function getAppLabel(pkg) {
        const found = appMap.get(pkg);
        if (found && found.label) return found.label;
        const tail = (pkg || "").split(".").pop() || "App";
        return tail.charAt(0).toUpperCase() + tail.slice(1);
    }

    function getDisplayLabel(node) {
        if (node.customStyle && node.customStyle.customLabel && node.customStyle.customLabel.trim()) {
            return node.customStyle.customLabel.trim();
        }
        if (node.type === "folder") return node.title || "Složka";
        if (node.type === "app") return getAppLabel(node.packageName);
        return "";
    }

    function getAppIconUrl(pkg) {
        if (hasNativeBridge) {
            return "https://launcher.local/icon/" + encodeURIComponent(pkg);
        }
        const label = getAppLabel(pkg);
        const letter = (label.charAt(0) || "A").toUpperCase();
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
            <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#1E293B"/>
                    <stop offset="100%" stop-color="#0F172A"/>
                </linearGradient>
            </defs>
            <rect width="128" height="128" rx="28" fill="url(#g)"/>
            <text x="64" y="80" text-anchor="middle" fill="#0A84FF" font-family="-apple-system, sans-serif" font-size="56" font-weight="700">${letter}</text>
        </svg>`;
        return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
    }

    function getBadgeCountForNode(node) {
        if (!state || !state.theme.showBadges || state.focusMode === "minimal") return 0;
        const badges = (systemStatus && systemStatus.badges) || {};
        if (node.type === "app") {
            return badges[node.packageName] || 0;
        }
        if (node.type === "folder") {
            if (node.folderKind === "vault") return 0;
            const resolved = getEffectiveFolderChildren(node);
            return resolved.reduce((acc, ch) => acc + getBadgeCountForNode(ch), 0);
        }
        return 0;
    }

    function getEffectiveFolderChildren(folderNode) {
        if (!folderNode || folderNode.type !== "folder") return [];
        if (folderNode.folderKind === "smart") {
            return resolveSmartFolderApps(folderNode);
        }
        return Array.isArray(folderNode.children) ? folderNode.children : [];
    }

    function resolveSmartFolderApps(folderNode) {
        const rule = folderNode.smartRule || "games_media";
        const usage = (state && state.appUsageCounts) || {};
        let matched = [];

        if (rule === "games_media") {
            matched = installedApps.filter((a) => {
                const hay = (a.label + " " + a.packageName).toLowerCase();
                return /game|play|youtube|music|spotify|video|photo|galer|tv|film|hry|media/.test(hay);
            });
            if (matched.length === 0) matched = installedApps.slice(0, 8);
        } else if (rule === "social") {
            matched = installedApps.filter((a) => {
                const hay = (a.label + " " + a.packageName).toLowerCase();
                return /chat|messag|zpr|mail|dialer|telefon|phone|whats|insta|face|telegr|social|contact/.test(hay);
            });
            if (matched.length === 0) matched = installedApps.slice(0, 8);
        } else if (rule === "most_used") {
            matched = [...installedApps]
                .sort((a, b) => (usage[b.packageName] || 0) - (usage[a.packageName] || 0))
                .slice(0, 12);
        } else if (rule === "recent") {
            matched = [...installedApps]
                .sort((a, b) => (b.firstInstallTime || 0) - (a.firstInstallTime || 0))
                .slice(0, 12);
        } else if (rule === "system") {
            matched = installedApps.filter((a) => a.isSystemApp).slice(0, 16);
        } else if (rule === "keyword") {
            const kw = (folderNode.smartKeyword || "").trim().toLowerCase();
            if (!kw) {
                matched = installedApps.slice(0, 9);
            } else {
                matched = installedApps.filter(
                    (a) => a.label.toLowerCase().includes(kw) || a.packageName.toLowerCase().includes(kw)
                );
            }
        }

        return matched.map((app) => ({
            id: "smart_" + folderNode.id + "_" + app.packageName,
            type: "app",
            packageName: app.packageName,
            col: 0,
            row: 0,
            colSpan: 1,
            rowSpan: 1,
            customStyle: createDefaultCustomStyle()
        }));
    }

    // =========================================================================
    // APLIKACE TÉMATU, FOCUS REŽIMU, DOCKU A SMART SEARCH LIŠTY
    // =========================================================================
    function applyThemeAndSettings() {
        if (!state) return;
        const t = state.theme;
        const d = state.dockConfig;
        const root = document.documentElement;

        root.style.setProperty("--grid-cols", String(state.gridCols || 4));
        root.style.setProperty("--grid-rows", String(state.gridRows || 6));
        root.style.setProperty("--drawer-cols", String(state.drawerCols || 4));
        root.style.setProperty("--accent-color", t.accentColor || "#0A84FF");
        root.style.setProperty("--glass-blur", (t.blurStrength || 28) + "px");
        root.style.setProperty("--blur-strength", (t.blurStrength || 28) + "px");
        root.style.setProperty("--glass-opacity", ((t.glassOpacity || 62) / 100).toFixed(2));
        root.style.setProperty("--wp-dim", ((t.wallpaperDim ?? 15) / 100).toFixed(2));
        root.style.setProperty("--icon-scale", ((t.iconScale || 100) / 100).toFixed(2));

        root.style.setProperty("--label-size", (t.labelSize || 11.5) + "px");
        root.style.setProperty("--label-weight", String(t.labelWeight || "500"));
        root.style.setProperty("--label-color", t.labelColor || "#FFFFFF");
        root.style.setProperty(
            "--label-shadow",
            t.labelShadow !== false ? "0 1px 4px rgba(0, 0, 0, 0.78)" : "none"
        );
        root.style.setProperty("--badge-bg", t.badgeColor || "#FF453A");

        root.style.setProperty("--dock-cols", String(d.cols || 4));
        root.style.setProperty("--dock-height", (d.height || 84) + "px");
        root.style.setProperty("--dock-margin", (d.marginBottom ?? 4) + "px");
        root.style.setProperty("--dock-radius", (d.cornerRadius ?? 32) + "px");
        root.style.setProperty("--dock-blur", (d.blur ?? 28) + "px");
        root.style.setProperty("--dock-icon-scale", ((d.iconScale || 100) / 100).toFixed(2));

        document.body.setAttribute("data-icon-style", t.iconStyle || "default");
        document.body.setAttribute("data-icon-shape", t.iconShape || "squircle");
        document.body.setAttribute("data-transition", t.pageTransition || "slide");
        document.body.setAttribute("data-dock-style", d.style || "pill");
        document.body.setAttribute("data-focus-mode", state.focusMode || "personal");
        document.body.setAttribute("data-search-bar", state.searchBarStyle || "smart_wide");

        document.body.classList.toggle("hide-app-labels", !t.showLabels);
        document.body.classList.toggle("show-dock-labels", !!d.showLabels);
        document.body.classList.toggle("hide-notification-badges", !t.showBadges);
        document.body.classList.toggle("badge-style-dot", t.badgeStyle === "dot");
        document.body.classList.toggle("badge-pos-left", t.badgePosition === "top-left");

        updateTintFilterMatrix(t.accentColor || "#0A84FF");

        // Tapeta
        wallpaperLayer.className = "wallpaper-layer";
        if (t.wallpaper === "custom" && systemStatus.hasCustomWallpaper) {
            wallpaperLayer.style.backgroundImage = `url("https://launcher.local/wallpaper/custom.jpg?t=${Date.now()}")`;
        } else {
            wallpaperLayer.style.backgroundImage = "";
            const wpClass = "wallpaper-" + (t.wallpaper === "custom" ? "titanium-dark" : (t.wallpaper || "titanium-dark"));
            wallpaperLayer.classList.add(wpClass);
        }

        // Vyhledávací lišta nad Dockem (Smart Search vs iOS Search Pill vs Dots Only)
        const sbar = state.searchBarStyle || "smart_wide";
        if (smartSearchWideBar) {
            smartSearchWideBar.classList.toggle("hidden", sbar !== "smart_wide");
        }
        if (btnSearchPill) {
            btnSearchPill.classList.toggle("hidden", sbar !== "ios_pill");
        }

        // Aktivní Focus Banner
        if (focusStatusBanner) {
            if (state.focusMode === "work") {
                focusStatusBanner.classList.remove("hidden");
                focusStatusIcon.textContent = "💼";
                focusStatusLabel.textContent = "Work Focus · Produktivní režim";
            } else if (state.focusMode === "minimal") {
                focusStatusBanner.classList.remove("hidden");
                focusStatusIcon.textContent = "🌙";
                focusStatusLabel.textContent = "Minimal / Do Not Disturb";
            } else {
                focusStatusBanner.classList.add("hidden");
            }
        }

        syncCustomizationControls();
    }

    function updateTintFilterMatrix(hex) {
        const matrixEl = document.getElementById("ios-tint-matrix");
        if (!matrixEl) return;
        const clean = hex.replace("#", "");
        const r = parseInt(clean.substring(0, 2), 16) / 255 || 0.04;
        const g = parseInt(clean.substring(2, 4), 16) / 255 || 0.52;
        const b = parseInt(clean.substring(4, 6), 16) / 255 || 1.0;

        const values = [
            (0.21 * r * 1.6).toFixed(3), (0.72 * r * 1.6).toFixed(3), (0.07 * r * 1.6).toFixed(3), 0, (r * 0.12).toFixed(3),
            (0.21 * g * 1.6).toFixed(3), (0.72 * g * 1.6).toFixed(3), (0.07 * g * 1.6).toFixed(3), 0, (g * 0.12).toFixed(3),
            (0.21 * b * 1.6).toFixed(3), (0.72 * b * 1.6).toFixed(3), (0.07 * b * 1.6).toFixed(3), 0, (b * 0.12).toFixed(3),
            0, 0, 0, 1, 0
        ].join(" ");
        matrixEl.setAttribute("values", values);
    }

    function applyPerItemCustomStyle(element, node) {
        if (!node || !node.customStyle) return;
        const cs = node.customStyle;
        if (cs.scale && cs.scale !== 100) {
            element.style.setProperty("--item-scale", (cs.scale / 100).toFixed(2));
        } else {
            element.style.removeProperty("--item-scale");
        }
        if (cs.bgColor) {
            element.style.setProperty("--item-bg", cs.bgColor);
        } else {
            element.style.removeProperty("--item-bg");
        }
        if (cs.borderColor) {
            element.style.setProperty("--item-border", cs.borderColor);
        } else {
            element.style.removeProperty("--item-border");
        }
    }

    // =========================================================================
    // VYKRESLENÍ PLOCHY, 2×2 ENLARGED SLOŽEK, PRO WIDGETŮ A DOCKU
    // =========================================================================
    function renderHomeScreen() {
        if (!state) return;

        pagesTrack.innerHTML = "";
        state.pages.forEach((page, pageIndex) => {
            const pageEl = document.createElement("div");
            pageEl.className = "home-page";
            pageEl.dataset.pageIndex = String(pageIndex);

            if (isJiggleMode && state.pages.length > 1) {
                const delPageBtn = document.createElement("button");
                delPageBtn.type = "button";
                delPageBtn.className = "delete-page-pill";
                delPageBtn.textContent = "Smazat stránku";
                delPageBtn.addEventListener("click", (ev) => {
                    ev.stopPropagation();
                    deletePageAt(pageIndex);
                });
                pageEl.appendChild(delPageBtn);
            }

            for (const item of page.items) {
                const nodeEl = createWorkspaceNodeElement(item, { location: "page", pageIndex });
                if (nodeEl) pageEl.appendChild(nodeEl);
            }

            pagesTrack.appendChild(pageEl);
        });

        renderPageDots();
        updatePagesTrackTransform(0);
        renderMultiPageDock();
        syncWorkspaceBackdropBlur();
    }

    function createWorkspaceNodeElement(node, contextInfo) {
        if (!node) return null;
        if (node.type === "widget") {
            if (contextInfo.location === "dock" || (node.colSpan === 1 && node.rowSpan === 1)) {
                return createMini1x1WidgetElement(node, contextInfo);
            }
            return createProWidgetElement(node, contextInfo);
        }
        if (node.type === "folder") {
            const fSize = node.folderSize || "1x1";
            if (contextInfo.location === "page" && fSize !== "1x1") {
                return createExpandedFolderElement(node, contextInfo);
            }
            return createCompact1x1FolderElement(node, contextInfo);
        }
        return createAppElement(node, contextInfo);
    }

    function createAppElement(node, contextInfo) {
        const wrapper = document.createElement("div");
        wrapper.className = "grid-item";
        wrapper.dataset.itemId = node.id;
        wrapper.dataset.itemType = "app";
        wrapper.dataset.packageName = node.packageName;
        applyPerItemCustomStyle(wrapper, node);

        if (contextInfo.location === "page") {
            wrapper.style.gridColumn = `${(node.col || 0) + 1} / span 1`;
            wrapper.style.gridRow = `${(node.row || 0) + 1} / span 1`;
        }

        const squircle = document.createElement("div");
        squircle.className = "icon-squircle";

        if (node.customStyle && node.customStyle.customEmoji) {
            const emojiSpan = document.createElement("span");
            emojiSpan.className = "custom-emoji-glyph";
            emojiSpan.textContent = node.customStyle.customEmoji;
            squircle.appendChild(emojiSpan);
        } else {
            const img = document.createElement("img");
            img.className = "app-icon-img";
            img.src = getAppIconUrl(node.packageName);
            img.alt = getDisplayLabel(node);
            img.loading = "lazy";
            squircle.appendChild(img);
        }

        const badgeCount = getBadgeCountForNode(node);
        if (badgeCount > 0) {
            const badge = document.createElement("span");
            badge.className = "notification-badge";
            badge.textContent = badgeCount > 99 ? "99+" : String(badgeCount);
            squircle.appendChild(badge);
        }

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "jiggle-remove-btn";
        removeBtn.textContent = "−";
        removeBtn.setAttribute("aria-label", "Odebrat z plochy");
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeItemWithConfirmation(node.id);
        });

        wrapper.appendChild(squircle);
        wrapper.appendChild(removeBtn);

        if (!(node.customStyle && node.customStyle.hideLabel)) {
            const labelEl = document.createElement("span");
            labelEl.className = "item-label";
            labelEl.textContent = getDisplayLabel(node);
            wrapper.appendChild(labelEl);
        }

        attachNodeInteraction(wrapper, node, contextInfo);
        return wrapper;
    }

    function createCompact1x1FolderElement(folderNode, contextInfo) {
        const wrapper = document.createElement("div");
        wrapper.className = "grid-item";
        wrapper.dataset.itemId = folderNode.id;
        wrapper.dataset.itemType = "folder";
        applyPerItemCustomStyle(wrapper, folderNode);

        if (contextInfo.location === "page") {
            wrapper.style.gridColumn = `${(folderNode.col || 0) + 1} / span 1`;
            wrapper.style.gridRow = `${(folderNode.row || 0) + 1} / span 1`;
        }

        const squircle = document.createElement("div");
        squircle.className = "icon-squircle folder-icon-box folder-1x1-box";

        if (folderNode.customStyle && folderNode.customStyle.customEmoji) {
            squircle.style.display = "flex";
            const emojiSpan = document.createElement("span");
            emojiSpan.className = "custom-emoji-glyph";
            emojiSpan.textContent = folderNode.customStyle.customEmoji;
            squircle.appendChild(emojiSpan);
        } else if (folderNode.folderKind === "vault") {
            squircle.style.display = "flex";
            const lockSpan = document.createElement("span");
            lockSpan.className = "custom-emoji-glyph";
            lockSpan.textContent = "🔒";
            squircle.appendChild(lockSpan);
        } else if (folderNode.folderKind === "files") {
            squircle.style.display = "flex";
            const fileSpan = document.createElement("span");
            fileSpan.className = "custom-emoji-glyph";
            fileSpan.textContent = "🗂";
            squircle.appendChild(fileSpan);
        } else {
            const children = getEffectiveFolderChildren(folderNode).slice(0, 9);
            for (const child of children) {
                if (child.type === "app") {
                    const miniImg = document.createElement("img");
                    miniImg.className = "folder-mini-icon";
                    miniImg.src = getAppIconUrl(child.packageName);
                    miniImg.alt = "";
                    squircle.appendChild(miniImg);
                } else if (child.type === "folder") {
                    const miniSub = document.createElement("div");
                    miniSub.className = "folder-mini-subfolder";
                    miniSub.textContent = "📁";
                    squircle.appendChild(miniSub);
                } else if (child.type === "widget") {
                    const miniW = document.createElement("div");
                    miniW.className = "folder-mini-widget";
                    miniW.textContent = "⌚";
                    squircle.appendChild(miniW);
                }
            }
        }

        if (folderNode.folderKind && folderNode.folderKind !== "standard") {
            const kindTag = document.createElement("span");
            kindTag.className = "folder-kind-corner-tag";
            kindTag.textContent = folderNode.folderKind === "smart" ? "⚡" : folderNode.folderKind === "vault" ? "🔒" : "📂";
            squircle.appendChild(kindTag);
        }

        const badgeCount = getBadgeCountForNode(folderNode);
        if (badgeCount > 0) {
            const badge = document.createElement("span");
            badge.className = "notification-badge";
            badge.textContent = badgeCount > 99 ? "99+" : String(badgeCount);
            squircle.appendChild(badge);
        }

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "jiggle-remove-btn";
        removeBtn.textContent = "−";
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeItemWithConfirmation(folderNode.id);
        });

        wrapper.appendChild(squircle);
        wrapper.appendChild(removeBtn);

        if (!(folderNode.customStyle && folderNode.customStyle.hideLabel)) {
            const labelEl = document.createElement("span");
            labelEl.className = "item-label";
            labelEl.textContent = getDisplayLabel(folderNode);
            wrapper.appendChild(labelEl);
        }

        attachNodeInteraction(wrapper, folderNode, contextInfo);
        return wrapper;
    }

    /**
     * Vykreslí Zvětšenou složku na ploše (Enlarged Folder 2×2, případně 2×1 a 3×3).
     * Ve stavu 2×2 první 3 kvadranty přímo spouštějí aplikaci a 4. pravý spodní kvadrant
     * zobrazuje mini-mřížku 2×2 zbývajících položek a otevírá modal celé složky.
     */
    function createExpandedFolderElement(folderNode, contextInfo) {
        const fSize = folderNode.folderSize || "2x2";
        const dims = getFolderDimensions(fSize);

        const card = document.createElement("div");
        card.className = "folder-expanded-card";
        card.dataset.itemId = folderNode.id;
        card.dataset.itemType = "folder";
        card.style.gridColumn = `${(folderNode.col || 0) + 1} / span ${dims.colSpan}`;
        card.style.gridRow = `${(folderNode.row || 0) + 1} / span ${dims.rowSpan}`;
        applyPerItemCustomStyle(card, folderNode);

        const header = document.createElement("div");
        header.className = "folder-expanded-header";
        const titleSpan = document.createElement("span");
        titleSpan.className = "folder-expanded-title";
        titleSpan.textContent = getDisplayLabel(folderNode);
        const badgeSpan = document.createElement("span");
        badgeSpan.className = "folder-expanded-badge";
        badgeSpan.textContent = folderNode.folderKind === "smart"
            ? "⚡ Smart"
            : folderNode.folderKind === "vault"
                ? "🔒 Trezor"
                : folderNode.folderKind === "files"
                    ? "📂 Soubory"
                    : fSize;

        header.appendChild(titleSpan);
        header.appendChild(badgeSpan);
        header.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!isJiggleMode) requestOpenFolder(folderNode.id);
        });
        card.appendChild(header);

        if (folderNode.folderKind === "vault") {
            const lockedSurface = document.createElement("div");
            lockedSurface.className = "folder-vault-locked-surface";
            lockedSurface.innerHTML = `<span class="folder-vault-lock-glyph">🔒</span><span class="folder-vault-lock-text">Soukromé · Klepněte pro PIN</span>`;
            lockedSurface.addEventListener("click", (e) => {
                e.stopPropagation();
                if (!isJiggleMode) requestOpenFolder(folderNode.id);
            });
            card.appendChild(lockedSurface);
        } else {
            const slotsGrid = document.createElement("div");
            slotsGrid.className = `folder-expanded-slots folder-slots-${fSize}`;

            const children = getEffectiveFolderChildren(folderNode);
            const directCount = fSize === "2x1" ? 2 : fSize === "2x2" ? 3 : 8;
            const directItems = children.slice(0, directCount);
            const remainingItems = children.slice(directCount);

            for (const child of directItems) {
                const slot = document.createElement("div");
                slot.className = "folder-direct-slot";

                if (child.type === "app") {
                    const img = document.createElement("img");
                    img.src = getAppIconUrl(child.packageName);
                    img.alt = getDisplayLabel(child);
                    slot.appendChild(img);
                    slot.addEventListener("click", (e) => {
                        e.stopPropagation();
                        if (isJiggleMode) return;
                        Bridge.launchApp(child.packageName);
                    });
                } else if (child.type === "folder") {
                    slot.innerHTML = `<span style="font-size:20px;">📁</span>`;
                    slot.title = getDisplayLabel(child);
                    slot.addEventListener("click", (e) => {
                        e.stopPropagation();
                        if (isJiggleMode) return;
                        folderNavStack = [folderNode.id];
                        requestOpenFolder(child.id, true);
                    });
                } else if (child.type === "widget") {
                    slot.innerHTML = `<span style="font-size:12px;font-weight:700;color:var(--accent-color);">${child.widgetType === "clock" ? formatCurrentTimeShort() : systemStatus.battery.level + "%"}</span>`;
                    slot.addEventListener("click", (e) => {
                        e.stopPropagation();
                        if (!isJiggleMode) requestOpenFolder(folderNode.id);
                    });
                }

                slotsGrid.appendChild(slot);
            }

            // 4. (resp. poslední) rohový kvadrant zobrazuje mini-mřížku 2×2 zbývajících položek a otevírá celou složku
            const moreSlot = document.createElement("div");
            moreSlot.className = "folder-direct-slot folder-more-slot";
            moreSlot.title = "Otevřít složku";
            const previewFour = remainingItems.length > 0 ? remainingItems.slice(0, 4) : children.slice(0, 4);
            for (let i = 0; i < 4; i++) {
                const item = previewFour[i];
                if (item && item.type === "app") {
                    const miniImg = document.createElement("img");
                    miniImg.className = "folder-more-mini";
                    miniImg.src = getAppIconUrl(item.packageName);
                    miniImg.alt = "";
                    moreSlot.appendChild(miniImg);
                } else {
                    const dot = document.createElement("div");
                    dot.className = "folder-more-mini";
                    moreSlot.appendChild(dot);
                }
            }
            moreSlot.addEventListener("click", (e) => {
                e.stopPropagation();
                if (!isJiggleMode) requestOpenFolder(folderNode.id);
            });
            slotsGrid.appendChild(moreSlot);

            card.appendChild(slotsGrid);
        }

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "jiggle-remove-btn";
        removeBtn.textContent = "−";
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeItemWithConfirmation(folderNode.id);
        });
        card.appendChild(removeBtn);

        attachNodeInteraction(card, folderNode, contextInfo);
        return card;
    }

    // =========================================================================
    // PRO WIDGET SUITE V3 (POČASÍ, KALENDÁŘ & AGENDA, HODINY, KROUŽKY, MÉDIA)
    // =========================================================================
    function createMini1x1WidgetElement(widgetNode, contextInfo) {
        const wrapper = document.createElement("div");
        wrapper.className = "grid-item";
        wrapper.dataset.itemId = widgetNode.id;
        wrapper.dataset.itemType = "widget";

        if (contextInfo.location === "page") {
            wrapper.style.gridColumn = `${(widgetNode.col || 0) + 1} / span 1`;
            wrapper.style.gridRow = `${(widgetNode.row || 0) + 1} / span 1`;
        }

        const squircle = document.createElement("div");
        squircle.className = "icon-squircle";
        squircle.style.background = hexToRgba(widgetNode.bgColor || "#101520", (widgetNode.opacity || 68) / 100);
        squircle.style.borderColor = widgetNode.accentColor || "#0A84FF";

        const labelSpan = document.createElement("span");
        labelSpan.style.fontSize = "12px";
        labelSpan.style.fontWeight = "800";
        labelSpan.style.color = widgetNode.accentColor || "#0A84FF";
        labelSpan.dataset.liveMiniWidget = widgetNode.widgetType;
        labelSpan.textContent = widgetNode.widgetType === "clock"
            ? formatCurrentTimeShort()
            : (systemStatus.battery.level + "%");

        squircle.appendChild(labelSpan);
        wrapper.appendChild(squircle);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "jiggle-remove-btn";
        removeBtn.textContent = "−";
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeItemWithConfirmation(widgetNode.id);
        });
        wrapper.appendChild(removeBtn);

        attachNodeInteraction(wrapper, widgetNode, contextInfo);
        return wrapper;
    }

    function createProWidgetElement(widget, contextInfo) {
        const card = document.createElement("div");
        card.className = "widget-card";
        card.dataset.itemId = widget.id;
        card.dataset.itemType = "widget";
        card.dataset.widgetType = widget.widgetType;

        if (contextInfo.location === "page") {
            const cSpan = Math.min(widget.colSpan || 2, state.gridCols);
            const rSpan = Math.min(widget.rowSpan || 2, state.gridRows);
            card.style.gridColumn = `${(widget.col || 0) + 1} / span ${cSpan}`;
            card.style.gridRow = `${(widget.row || 0) + 1} / span ${rSpan}`;
        } else if (contextInfo.location === "folder") {
            card.style.gridColumn = "1 / span 3";
            card.style.minHeight = "128px";
        }

        const bgHex = widget.bgColor || "#101520";
        const alpha = ((widget.opacity ?? 68) / 100).toFixed(2);
        card.style.background = hexToRgba(bgHex, alpha);
        card.style.setProperty("--widget-accent", widget.accentColor || "var(--accent-color)");

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "jiggle-remove-btn";
        removeBtn.textContent = "−";
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeItemWithConfirmation(widget.id);
        });

        const gearBtn = document.createElement("button");
        gearBtn.type = "button";
        gearBtn.className = "widget-edit-gear";
        gearBtn.setAttribute("aria-label", "Upravit Pro Widget");
        gearBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
        gearBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openWidgetConfigModal(widget.id);
        });

        const body = document.createElement("div");
        body.style.width = "100%";
        body.style.height = "100%";

        switch (widget.widgetType) {
            case "weather":
                renderWeatherWidgetContent(body, widget);
                break;
            case "calendar":
                renderCalendarWidgetContent(body, widget);
                break;
            case "rings":
                renderRingsWidgetContent(body, widget);
                break;
            case "media":
                renderMediaWidgetContent(body, widget);
                break;
            case "battery":
                renderBatteryWidgetContent(body, widget);
                break;
            case "clock":
            default:
                renderClockWidgetContent(body, widget);
                break;
        }

        card.appendChild(removeBtn);
        card.appendChild(gearBtn);
        card.appendChild(body);

        attachNodeInteraction(card, widget, contextInfo);
        return card;
    }

    // 1. Acrylic Weather & Environment Widget
    function renderWeatherWidgetContent(container, widget) {
        const city = widget.city || "Praha";
        const isFahrenheit = widget.tempUnit === "F";
        const cond = widget.weatherCondition || "partly_cloudy";

        // Deterministický výpočet teploty podle města a podmínky
        let baseCelsius = 21;
        if (cond === "sunny") baseCelsius = 25;
        else if (cond === "rain") baseCelsius = 15;
        else if (cond === "storm") baseCelsius = 17;

        const formatTemp = (c) => isFahrenheit ? Math.round(c * 1.8 + 32) + "°" : Math.round(c) + "°";
        const tempDisplay = formatTemp(baseCelsius);
        const highDisplay = formatTemp(baseCelsius + 3);
        const lowDisplay = formatTemp(baseCelsius - 6);

        const condLabelMap = {
            partly_cloudy: "Mostly Cloudy",
            sunny: "Clear Sky",
            rain: "Light Showers",
            storm: "Thunderstorm"
        };
        const condLabel = condLabelMap[cond] || "Mostly Cloudy";

        const gradSuffix = String(widget.id || "w").replace(/[^a-zA-Z0-9_-]/g, "");
        const weatherSvg = `<svg viewBox="0 0 64 64" width="44" height="44">
            <defs>
                <linearGradient id="sunGrad-${gradSuffix}" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#FFD60A"/>
                    <stop offset="100%" stop-color="#FF9F0A"/>
                </linearGradient>
                <linearGradient id="cloudGrad-${gradSuffix}" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
                    <stop offset="100%" stop-color="#94A3B8" stop-opacity="0.85"/>
                </linearGradient>
            </defs>
            <circle cx="24" cy="24" r="12" fill="url(#sunGrad-${gradSuffix})"/>
            <path d="M22 46h24a10 10 0 0 0 1-19.9A14 14 0 0 0 20 24a9 9 0 0 0 2 22z" fill="url(#cloudGrad-${gradSuffix})"/>
        </svg>`;

        if (widget.colSpan === 4) {
            container.innerHTML = `
                <div class="weather-wide-layout">
                    <div class="weather-widget-body">
                        <div class="weather-top-row">
                            <div>
                                <div class="weather-city-name"><span>📍</span><span>${escapeHtml(city)}</span></div>
                                <div class="weather-big-temp">${tempDisplay}</div>
                            </div>
                            <div class="weather-svg-wrap">${weatherSvg}</div>
                        </div>
                        <div class="weather-bottom-row">
                            <span class="weather-condition-text">${condLabel}</span>
                            <span class="weather-hl-text">H:${highDisplay}  L:${lowDisplay}</span>
                        </div>
                    </div>
                    <div class="weather-hourly-strip">
                        <div class="weather-hour-col"><span class="weather-hour-time">Teď</span><span>⛅</span><span class="weather-hour-temp">${tempDisplay}</span></div>
                        <div class="weather-hour-col"><span class="weather-hour-time">14:00</span><span>☀</span><span class="weather-hour-temp">${formatTemp(baseCelsius + 2)}</span></div>
                        <div class="weather-hour-col"><span class="weather-hour-time">17:00</span><span>⛅</span><span class="weather-hour-temp">${formatTemp(baseCelsius + 1)}</span></div>
                        <div class="weather-hour-col"><span class="weather-hour-time">20:00</span><span>🌙</span><span class="weather-hour-temp">${formatTemp(baseCelsius - 3)}</span></div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="weather-widget-body">
                    <div class="weather-top-row">
                        <div>
                            <div class="weather-city-name"><span>📍</span><span>${escapeHtml(city)}</span></div>
                            <div class="weather-big-temp">${tempDisplay}</div>
                        </div>
                        <div class="weather-svg-wrap">${weatherSvg}</div>
                    </div>
                    <div class="weather-bottom-row">
                        <span class="weather-condition-text">${condLabel}</span>
                        <span class="weather-hl-text">H:${highDisplay}  L:${lowDisplay}</span>
                    </div>
                </div>
            `;
        }

        container.addEventListener("click", (e) => {
            if (isJiggleMode) return;
            e.stopPropagation();
            openWidgetConfigModal(widget.id);
        });
    }

    // 2. iOS 17 Calendar & Agenda Glass Widget
    function renderCalendarWidgetContent(container, widget) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const todayDate = now.getDate();

        const monthName = now.toLocaleDateString("cs-CZ", { month: "long" }).toUpperCase();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Ne, 1 = Po
        const startOffset = (firstDayOfMonth + 6) % 7; // Pondělí = 0
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const dows = ["P", "Ú", "S", "Č", "P", "S", "N"];
        let gridCellsHtml = dows.map((d) => `<span class="cal-dow-cell">${d}</span>`).join("");

        for (let i = 0; i < startOffset; i++) {
            gridCellsHtml += `<span class="cal-day-cell"></span>`;
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = d === todayDate;
            gridCellsHtml += `<span class="cal-day-cell ${isToday ? "today" : ""}">${d}</span>`;
        }

        const agendaList = Array.isArray(widget.agendaItems) && widget.agendaItems.length > 0
            ? widget.agendaItems
            : DEFAULT_AGENDA_EVENTS;

        if (widget.colSpan === 4) {
            const agendaRowsHtml = agendaList.slice(0, 3).map((ev) => `
                <div class="cal-agenda-row">
                    <span class="cal-agenda-bar" style="background:${ev.color || "#0A84FF"};"></span>
                    <div class="cal-agenda-info">
                        <span class="cal-agenda-title">${escapeHtml(ev.title)}</span>
                        <span class="cal-agenda-time">${escapeHtml(ev.time)}</span>
                    </div>
                </div>
            `).join("");

            container.innerHTML = `
                <div class="calendar-widget-4x2">
                    <div class="calendar-widget-2x2">
                        <div class="cal-header-row">
                            <span class="cal-month-title" style="color:${widget.accentColor || "#FF453A"};">${monthName}</span>
                            <button type="button" class="cal-add-event-mini-btn" title="Upravit události">+</button>
                        </div>
                        <div class="cal-mini-grid">${gridCellsHtml}</div>
                    </div>
                    <div class="cal-agenda-pane">
                        <div class="cal-agenda-header">
                            <span>Nadcházející</span>
                            <span>${agendaList.length}</span>
                        </div>
                        <div class="cal-agenda-items">${agendaRowsHtml}</div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="calendar-widget-2x2">
                    <div class="cal-header-row">
                        <span class="cal-month-title" style="color:${widget.accentColor || "#FF453A"};">${monthName}</span>
                        <button type="button" class="cal-add-event-mini-btn" title="Přidat událost">+</button>
                    </div>
                    <div class="cal-mini-grid">${gridCellsHtml}</div>
                </div>
            `;
        }

        const addBtn = container.querySelector(".cal-add-event-mini-btn");
        if (addBtn) {
            addBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openWidgetConfigModal(widget.id);
            });
        }
    }

    // 3. Pro Clock & World Time Widget
    function renderClockWidgetContent(container, widget) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const ss = String(now.getSeconds()).padStart(2, "0");
        const dateStr = now.toLocaleDateString("cs-CZ", {
            weekday: "short",
            day: "numeric",
            month: "short"
        });

        const clockStyle = widget.style || "digital";

        if (clockStyle === "world" || (widget.colSpan === 4 && clockStyle === "world")) {
            const cities = [
                { name: "New York", tz: "America/New_York", diff: "-6 HRS" },
                { name: "London", tz: "Europe/London", diff: "-1 HR" },
                { name: "Prague", tz: "Europe/Prague", diff: "LOCAL" },
                { name: "Tokyo", tz: "Asia/Tokyo", diff: "+7 HRS" }
            ];
            const colsHtml = cities.map((c) => {
                let timeText = `${hh}:${mm}`;
                try {
                    timeText = now.toLocaleTimeString("cs-CZ", {
                        timeZone: c.tz,
                        hour: "2-digit",
                        minute: "2-digit"
                    });
                } catch (_) {}
                return `
                    <div class="world-city-card">
                        <span class="world-city-name">${c.name}</span>
                        <span class="world-city-time" data-world-tz="${c.tz}">${timeText}</span>
                        <span class="world-city-offset" style="color:${widget.accentColor || "#0A84FF"};">${c.diff}</span>
                    </div>
                `;
            }).join("");

            container.innerHTML = `<div class="world-clock-grid">${colsHtml}</div>`;
            return;
        }

        if (clockStyle === "analog") {
            const secAngle = now.getSeconds() * 6;
            const minAngle = now.getMinutes() * 6 + now.getSeconds() * 0.1;
            const hrAngle = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5;
            const accent = widget.accentColor || "#0A84FF";

            container.innerHTML = `
                <div class="analog-clock-wrap">
                    <svg class="analog-clock-svg" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="46" fill="rgba(8,12,20,0.65)" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
                        <line x1="50" y1="8" x2="50" y2="14" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
                        <line x1="92" y1="50" x2="86" y2="50" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
                        <line x1="50" y1="92" x2="50" y2="86" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
                        <line x1="8" y1="50" x2="14" y2="50" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
                        <line class="analog-hr" x1="50" y1="50" x2="50" y2="26" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" transform="rotate(${hrAngle} 50 50)"/>
                        <line class="analog-min" x1="50" y1="50" x2="50" y2="16" stroke="#E2E8F0" stroke-width="2.4" stroke-linecap="round" transform="rotate(${minAngle} 50 50)"/>
                        <line class="analog-sec" x1="50" y1="56" x2="50" y2="13" stroke="${accent}" stroke-width="1.6" stroke-linecap="round" transform="rotate(${secAngle} 50 50)"/>
                        <circle cx="50" cy="50" r="3.5" fill="${accent}"/>
                    </svg>
                </div>
            `;
            return;
        }

        const showSeconds = clockStyle !== "minimal";
        container.innerHTML = `
            <div style="display:flex;flex-direction:column;justify-content:space-between;height:100%;">
                <div>
                    <div class="clock-digital-time" style="color:${widget.accentColor || "#FFFFFF"};">
                        <span class="clock-hhmm">${hh}:${mm}</span>${showSeconds ? `<span class="clock-digital-sec">${ss}</span>` : ""}
                    </div>
                    <div class="clock-date-label">${dateStr}</div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--text-secondary);">
                    <span>Praha · CET</span>
                    <span style="color:${widget.accentColor || "#0A84FF"};font-weight:700;">iOS 18 Pro</span>
                </div>
            </div>
        `;
    }

    // 4. Battery & System Activity Rings Widget
    function renderRingsWidgetContent(container, widget) {
        const bat = (systemStatus && systemStatus.battery) || { level: 92, isCharging: false, temperature: 27.0 };
        const met = (systemStatus && systemStatus.metrics) || {
            ramUsedPercent: 48,
            ramUsedGb: 3.8,
            ramTotalGb: 8.0,
            storageUsedPercent: 42,
            storageFreeGb: 74.2,
            storageTotalGb: 128.0
        };

        const r1 = 38;
        const c1 = 2 * Math.PI * r1;
        const o1 = c1 - (Math.max(1, Math.min(100, bat.level)) / 100) * c1;

        const r2 = 29;
        const c2 = 2 * Math.PI * r2;
        const o2 = c2 - (Math.max(1, Math.min(100, met.ramUsedPercent)) / 100) * c2;

        const r3 = 20;
        const c3 = 2 * Math.PI * r3;
        const o3 = c3 - (Math.max(1, Math.min(100, met.storageUsedPercent)) / 100) * c3;

        container.innerHTML = `
            <div class="rings-widget-layout">
                <div class="rings-svg-box">
                    <svg width="92" height="92" viewBox="0 0 92 92">
                        <circle cx="46" cy="46" r="${r1}" fill="none" stroke="rgba(48,209,88,0.18)" stroke-width="6.5"/>
                        <circle cx="46" cy="46" r="${r1}" fill="none" stroke="#30D158" stroke-width="6.5" stroke-linecap="round"
                            stroke-dasharray="${c1.toFixed(1)}" stroke-dashoffset="${o1.toFixed(1)}" transform="rotate(-90 46 46)"/>

                        <circle cx="46" cy="46" r="${r2}" fill="none" stroke="rgba(10,132,255,0.18)" stroke-width="6.5"/>
                        <circle cx="46" cy="46" r="${r2}" fill="none" stroke="#0A84FF" stroke-width="6.5" stroke-linecap="round"
                            stroke-dasharray="${c2.toFixed(1)}" stroke-dashoffset="${o2.toFixed(1)}" transform="rotate(-90 46 46)"/>

                        <circle cx="46" cy="46" r="${r3}" fill="none" stroke="rgba(191,90,242,0.18)" stroke-width="6.5"/>
                        <circle cx="46" cy="46" r="${r3}" fill="none" stroke="#BF5AF2" stroke-width="6.5" stroke-linecap="round"
                            stroke-dasharray="${c3.toFixed(1)}" stroke-dashoffset="${o3.toFixed(1)}" transform="rotate(-90 46 46)"/>
                    </svg>
                    <span class="rings-center-label">${bat.isCharging ? "⚡" : ""}${bat.level}%</span>
                </div>
                <div class="rings-metrics-col">
                    <div class="ring-stat-row">
                        <span class="ring-dot-label"><span class="ring-dot" style="background:#30D158;"></span>BAT</span>
                        <span class="ring-stat-val">${bat.level}% · ${bat.temperature.toFixed(1)}°C</span>
                    </div>
                    <div class="ring-stat-row">
                        <span class="ring-dot-label"><span class="ring-dot" style="background:#0A84FF;"></span>RAM</span>
                        <span class="ring-stat-val">${met.ramUsedGb} / ${met.ramTotalGb} GB</span>
                    </div>
                    <div class="ring-stat-row">
                        <span class="ring-dot-label"><span class="ring-dot" style="background:#BF5AF2;"></span>VOLNÉ</span>
                        <span class="ring-stat-val">${met.storageFreeGb} GB</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 5. Glass Music / Media Controller Widget
    function renderMediaWidgetContent(container, widget) {
        const track = MEDIA_PLAYLIST_TRACKS[mediaTrackIndex % MEDIA_PLAYLIST_TRACKS.length];
        const accent = widget.accentColor || "#BF5AF2";

        container.innerHTML = `
            <div class="media-widget-layout">
                <div class="media-top-row">
                    <div class="media-art-box">${track.emoji}</div>
                    <div class="media-track-meta">
                        <div class="media-track-title">${escapeHtml(track.title)}</div>
                        <div class="media-track-artist">${escapeHtml(track.artist)}</div>
                    </div>
                </div>
                <div class="media-progress-bar">
                    <div class="media-progress-fill" style="width:${track.progress}%;background:${accent};"></div>
                </div>
                <div class="media-controls-row">
                    <button type="button" class="media-ctrl-btn" data-media-cmd="prev" aria-label="Předchozí skladba">⏮</button>
                    <button type="button" class="media-ctrl-btn media-ctrl-play" data-media-cmd="play_pause" style="background:${accent};" aria-label="Přehrát / Pozastavit">
                        ${isMediaPlayingLocal ? "⏸" : "▶"}
                    </button>
                    <button type="button" class="media-ctrl-btn" data-media-cmd="next" aria-label="Další skladba">⏭</button>
                </div>
            </div>
        `;

        container.querySelectorAll("[data-media-cmd]").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const cmd = btn.getAttribute("data-media-cmd");
                if (cmd === "prev") {
                    mediaTrackIndex = (mediaTrackIndex - 1 + MEDIA_PLAYLIST_TRACKS.length) % MEDIA_PLAYLIST_TRACKS.length;
                    isMediaPlayingLocal = true;
                    Bridge.dispatchMediaKey("previous");
                } else if (cmd === "next") {
                    mediaTrackIndex = (mediaTrackIndex + 1) % MEDIA_PLAYLIST_TRACKS.length;
                    isMediaPlayingLocal = true;
                    Bridge.dispatchMediaKey("next");
                } else {
                    isMediaPlayingLocal = !isMediaPlayingLocal;
                    Bridge.dispatchMediaKey("play_pause");
                }
                renderMediaWidgetContent(container, widget);
            });
        });
    }

    // Klasický Battery Widget
    function renderBatteryWidgetContent(container, widget) {
        const bat = (systemStatus && systemStatus.battery) || { level: 90, isCharging: false, temperature: 26.5 };
        const pct = Math.max(0, Math.min(100, bat.level));
        const accent = widget.accentColor || "#30D158";
        const r = 32;
        const c = 2 * Math.PI * r;
        const offset = c - (pct / 100) * c;

        container.innerHTML = `
            <div class="rings-widget-layout">
                <div class="rings-svg-box" style="width:76px;height:76px;">
                    <svg width="76" height="76" viewBox="0 0 76 76">
                        <circle cx="38" cy="38" r="${r}" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="7"/>
                        <circle cx="38" cy="38" r="${r}" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round"
                            stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}" transform="rotate(-90 38 38)"/>
                    </svg>
                    <span class="rings-center-label">${bat.isCharging ? "⚡" : ""}${pct}%</span>
                </div>
                <div class="rings-metrics-col">
                    <div style="font-size:13px;font-weight:700;color:#FFFFFF;">${bat.isCharging ? "Nabíjení" : "Baterie"}</div>
                    <div style="font-size:11px;color:var(--text-secondary);">Teplota ${bat.temperature.toFixed(1)} °C</div>
                </div>
            </div>
        `;
    }

    function updateLiveWidgetsInDom() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const ss = String(now.getSeconds()).padStart(2, "0");
        const dateStr = now.toLocaleDateString("cs-CZ", {
            weekday: "short",
            day: "numeric",
            month: "short"
        });

        document.querySelectorAll(".clock-hhmm").forEach((el) => {
            el.textContent = `${hh}:${mm}`;
        });
        document.querySelectorAll(".clock-digital-sec").forEach((el) => {
            el.textContent = ss;
        });
        document.querySelectorAll(".clock-date-label").forEach((el) => {
            el.textContent = dateStr;
        });

        const secAngle = now.getSeconds() * 6;
        const minAngle = now.getMinutes() * 6 + now.getSeconds() * 0.1;
        const hrAngle = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5;

        document.querySelectorAll(".analog-hr").forEach((el) => {
            el.setAttribute("transform", `rotate(${hrAngle} 50 50)`);
        });
        document.querySelectorAll(".analog-min").forEach((el) => {
            el.setAttribute("transform", `rotate(${minAngle} 50 50)`);
        });
        document.querySelectorAll(".analog-sec").forEach((el) => {
            el.setAttribute("transform", `rotate(${secAngle} 50 50)`);
        });

        document.querySelectorAll("[data-world-tz]").forEach((el) => {
            const tz = el.getAttribute("data-world-tz");
            try {
                el.textContent = now.toLocaleTimeString("cs-CZ", {
                    timeZone: tz,
                    hour: "2-digit",
                    minute: "2-digit"
                });
            } catch (_) {}
        });

        document.querySelectorAll("[data-live-mini-widget]").forEach((el) => {
            const wType = el.getAttribute("data-live-mini-widget");
            el.textContent = wType === "clock" ? `${hh}:${mm}` : `${systemStatus.battery.level}%`;
        });

        const aodTime = document.getElementById("aod-time");
        const aodDate = document.getElementById("aod-date");
        const aodBat = document.getElementById("aod-battery");
        if (aodTime) aodTime.textContent = `${hh}:${mm}`;
        if (aodDate) {
            aodDate.textContent = now.toLocaleDateString("cs-CZ", {
                weekday: "long",
                day: "numeric",
                month: "long"
            });
        }
        if (aodBat && systemStatus && systemStatus.battery) {
            aodBat.textContent = `${systemStatus.battery.isCharging ? "⚡ Nabíjení " : "Baterie "}${systemStatus.battery.level} %`;
        }
    }

    function formatCurrentTimeShort() {
        const now = new Date();
        return String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    }

    function hexToRgba(hex, alpha) {
        const clean = (hex || "#101520").replace("#", "");
        const r = parseInt(clean.substring(0, 2), 16) || 16;
        const g = parseInt(clean.substring(2, 4), 16) || 21;
        const b = parseInt(clean.substring(4, 6), 16) || 32;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // =========================================================================
    // VÍCESTRÁNKOVÝ DOCK & STRÁNKOVACÍ TEČKY
    // =========================================================================
    function renderMultiPageDock() {
        if (!state) return;
        const dConf = state.dockConfig;
        const cols = dConf.cols || 4;
        const pagesCount = dConf.pages || 1;

        iosDockTrack.innerHTML = "";
        for (let p = 0; p < pagesCount; p++) {
            const pageDiv = document.createElement("div");
            pageDiv.className = "dock-page";
            const slice = state.dock.slice(p * cols, (p + 1) * cols);
            for (const dockNode of slice) {
                const el = createWorkspaceNodeElement(dockNode, { location: "dock", dockPage: p });
                if (el) pageDiv.appendChild(el);
            }
            iosDockTrack.appendChild(pageDiv);
        }

        activeDockPage = Math.max(0, Math.min(pagesCount - 1, activeDockPage));
        updateDockTrackTransform();

        if (pagesCount > 1) {
            dockPageDots.classList.remove("hidden");
            dockPageDots.innerHTML = "";
            for (let p = 0; p < pagesCount; p++) {
                const dot = document.createElement("span");
                dot.className = "dock-dot" + (p === activeDockPage ? " active" : "");
                dot.addEventListener("click", (e) => {
                    e.stopPropagation();
                    activeDockPage = p;
                    updateDockTrackTransform();
                    renderMultiPageDock();
                });
                dockPageDots.appendChild(dot);
            }
        } else {
            dockPageDots.classList.add("hidden");
        }
    }

    function updateDockTrackTransform() {
        const w = iosDockViewport.clientWidth || 320;
        iosDockTrack.style.transform = `translate3d(${-activeDockPage * w}px, 0, 0)`;
    }

    function renderPageDots() {
        pageDots.innerHTML = "";
        state.pages.forEach((_, idx) => {
            const dot = document.createElement("span");
            dot.className = "page-dot" + (idx === state.activePage ? " active" : "");
            dot.addEventListener("click", (e) => {
                e.stopPropagation();
                goToPage(idx);
            });
            pageDots.appendChild(dot);
        });
    }

    function updatePagesTrackTransform(dragOffsetPx = 0) {
        const viewportWidth = pagesViewport.clientWidth || window.innerWidth;
        const baseTranslate = -state.activePage * viewportWidth + dragOffsetPx;
        pagesTrack.style.transform = `translate3d(${baseTranslate}px, 0, 0)`;

        const trans = (state && state.theme.pageTransition) || "slide";
        const pageEls = pagesTrack.querySelectorAll(".home-page");
        pageEls.forEach((pEl, idx) => {
            const rel = idx - state.activePage - dragOffsetPx / viewportWidth;
            if (trans === "cube") {
                pEl.style.transform = `rotateY(${rel * -55}deg)`;
                pEl.style.opacity = String(Math.max(0.35, 1 - Math.abs(rel) * 0.4));
            } else if (trans === "stack") {
                const sc = rel > 0 ? Math.max(0.84, 1 - rel * 0.16) : 1;
                pEl.style.transform = `scale(${sc})`;
                pEl.style.opacity = String(Math.max(0.3, 1 - Math.abs(rel) * 0.5));
            } else if (trans === "zoom") {
                const sc = Math.max(0.82, 1 - Math.abs(rel) * 0.2);
                pEl.style.transform = `scale(${sc})`;
                pEl.style.opacity = String(Math.max(0.25, 1 - Math.abs(rel) * 0.65));
            } else if (trans === "flip") {
                pEl.style.transform = `rotateY(${rel * 75}deg) scale(${Math.max(0.85, 1 - Math.abs(rel) * 0.15)})`;
                pEl.style.opacity = String(Math.max(0.2, 1 - Math.abs(rel) * 0.6));
            } else {
                pEl.style.transform = "none";
                pEl.style.opacity = "1";
            }
        });
    }

    function goToPage(index) {
        if (!state) return;
        const clamped = Math.max(0, Math.min(state.pages.length - 1, index));
        state.activePage = clamped;
        pagesTrack.style.transition = "transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)";
        updatePagesTrackTransform(0);
        renderPageDots();
        Bridge.saveState(state);
    }

    function addNewPage() {
        state.pages.push({ id: uid("page"), role: "personal", items: [] });
        state.activePage = state.pages.length - 1;
        Bridge.saveState(state);
        renderHomeScreen();
        showToast("Přidána nová obrazovka");
    }

    function deletePageAt(pageIndex) {
        if (state.pages.length <= 1) return;
        state.pages.splice(pageIndex, 1);
        if (state.activePage >= state.pages.length) {
            state.activePage = state.pages.length - 1;
        }
        Bridge.saveState(state);
        renderHomeScreen();
        showToast("Obrazovka odstraněna");
    }

    // =========================================================================
    // OTEVÍRÁNÍ REKURZIVNÍCH SLOŽEK, BREADCRUMBS & PIN VAULT
    // =========================================================================
    function requestOpenFolder(folderId, pushToStack = false) {
        const found = findNodeDeep(folderId);
        if (!found || found.node.type !== "folder") return;

        const folderNode = found.node;
        if (folderNode.folderKind === "vault") {
            openPinVaultPrompt(folderNode, () => {
                openFolderModalInternal(folderId, pushToStack);
            });
            return;
        }

        openFolderModalInternal(folderId, pushToStack);
    }

    function openFolderModalInternal(folderId, pushToStack) {
        Bridge.haptic("light");
        activeFolderModalPage = 0;
        if (!pushToStack) {
            folderNavStack = [folderId];
        } else {
            const existingIdx = folderNavStack.indexOf(folderId);
            if (existingIdx >= 0) {
                folderNavStack = folderNavStack.slice(0, existingIdx + 1);
            } else {
                folderNavStack.push(folderId);
            }
        }
        renderActiveFolderModal();
        folderModal.classList.remove("hidden");
        syncWorkspaceBackdropBlur();
    }

    function renderActiveFolderModal() {
        if (folderNavStack.length === 0) {
            closeFolderModal();
            return;
        }

        const currentFolderId = folderNavStack[folderNavStack.length - 1];
        const found = findNodeDeep(currentFolderId);
        if (!found || found.node.type !== "folder") {
            closeFolderModal();
            return;
        }

        const folder = found.node;
        folderTitleInput.value = folder.title || "Složka";
        folderKindBadge.textContent = folder.folderKind === "smart"
            ? "⚡ Smart Folder"
            : folder.folderKind === "vault"
                ? "🔒 PIN Vault"
                : folder.folderKind === "files"
                    ? "📂 Live Soubory"
                    : `Složka (${folder.folderSize || "1x1"})`;

        const cycleBtn = document.getElementById("btn-folder-size-cycle");
        if (cycleBtn) {
            cycleBtn.textContent = (folder.folderSize === "2x2") ? "Shrink 1×1" : "Enlarge 2×2";
        }

        // Drobečková navigace (Breadcrumbs: Home › Složka › Podsložka)
        folderBreadcrumbs.innerHTML = "";
        const rootCrumb = document.createElement("button");
        rootCrumb.type = "button";
        rootCrumb.className = "breadcrumb-pill";
        rootCrumb.textContent = "Home";
        rootCrumb.addEventListener("click", () => closeFolderModal());
        folderBreadcrumbs.appendChild(rootCrumb);

        folderNavStack.forEach((fid, idx) => {
            const sep = document.createElement("span");
            sep.className = "breadcrumb-sep";
            sep.textContent = "›";
            folderBreadcrumbs.appendChild(sep);

            const fInfo = findNodeDeep(fid);
            const pill = document.createElement("button");
            pill.type = "button";
            pill.className = "breadcrumb-pill" + (idx === folderNavStack.length - 1 ? " active" : "");
            pill.textContent = fInfo ? getDisplayLabel(fInfo.node) : "Složka";
            pill.addEventListener("click", () => {
                folderNavStack = folderNavStack.slice(0, idx + 1);
                renderActiveFolderModal();
            });
            folderBreadcrumbs.appendChild(pill);
        });

        folderGrid.innerHTML = "";

        // Pokud jde o Souborovou složku (Live File Folder)
        if (folder.folderKind === "files") {
            renderLiveFileFolderInsideModal(folder);
            return;
        }

        const children = getEffectiveFolderChildren(folder);
        const itemsPerPage = 9;
        const totalPages = Math.max(1, Math.ceil(children.length / itemsPerPage));
        activeFolderModalPage = Math.max(0, Math.min(totalPages - 1, activeFolderModalPage));
        const pageSlice = children.slice(
            activeFolderModalPage * itemsPerPage,
            (activeFolderModalPage + 1) * itemsPerPage
        );

        if (children.length === 0) {
            const emptyHint = document.createElement("div");
            emptyHint.style.gridColumn = "1 / span 3";
            emptyHint.style.padding = "22px 10px";
            emptyHint.style.textAlign = "center";
            emptyHint.style.color = "var(--text-secondary)";
            emptyHint.style.fontSize = "12.5px";
            emptyHint.textContent = "Složka je prázdná. Pomocí tlačítek nahoře přidejte podsložku, Pro widget nebo aplikaci.";
            folderGrid.appendChild(emptyHint);
        } else {
            for (const child of pageSlice) {
                if (child.type === "widget") {
                    const wEl = createProWidgetElement(child, { location: "folder", folderId: folder.id });
                    folderGrid.appendChild(wEl);
                } else if (child.type === "folder") {
                    const subEl = createCompact1x1FolderElement(child, { location: "folder", folderId: folder.id });
                    folderGrid.appendChild(subEl);
                } else {
                    const appEl = createAppElement(child, { location: "folder", folderId: folder.id });
                    folderGrid.appendChild(appEl);
                }
            }
        }

        // Stránkovací tečky složky
        if (folderPaginationDots) {
            folderPaginationDots.innerHTML = "";
            for (let i = 0; i < totalPages; i++) {
                const d = document.createElement("span");
                d.className = "page-dot" + (i === activeFolderModalPage ? " active" : "");
                d.addEventListener("click", (ev) => {
                    ev.stopPropagation();
                    activeFolderModalPage = i;
                    renderActiveFolderModal();
                });
                folderPaginationDots.appendChild(d);
            }
        }
    }

    function renderLiveFileFolderInsideModal(folder) {
        const cat = folder.fileCategory || "all";
        const files = Bridge.searchFiles("", cat);

        const container = document.createElement("div");
        container.style.gridColumn = "1 / span 3";
        container.style.width = "100%";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "8px";

        if (!Bridge.hasFilePermissions() && hasNativeBridge) {
            const permBox = document.createElement("div");
            permBox.className = "file-result-card";
            permBox.innerHTML = `
                <div class="file-cat-badge">🔐</div>
                <div class="file-result-meta">
                    <div class="file-result-name">Povolit přístup k souborům</div>
                    <div class="file-result-sub">Pro živé načítání souborů v této složce</div>
                </div>
            `;
            const grantBtn = document.createElement("button");
            grantBtn.type = "button";
            grantBtn.className = "glass-mini-btn accent-mini-btn";
            grantBtn.textContent = "Povolit";
            grantBtn.addEventListener("click", () => Bridge.requestFilePermissions());
            permBox.appendChild(grantBtn);
            container.appendChild(permBox);
        }

        if (files.length === 0) {
            const emptyMsg = document.createElement("div");
            emptyMsg.style.padding = "18px";
            emptyMsg.style.textAlign = "center";
            emptyMsg.style.fontSize = "12.5px";
            emptyMsg.style.color = "var(--text-secondary)";
            emptyMsg.textContent = "Žádné nedávné soubory v této kategorii.";
            container.appendChild(emptyMsg);
        } else {
            for (const f of files.slice(0, 20)) {
                container.appendChild(createFileResultRow(f));
            }
        }

        folderGrid.appendChild(container);
    }

    function closeFolderModal() {
        folderModal.classList.add("hidden");
        folderNavStack = [];
        syncWorkspaceBackdropBlur();
    }

    // =========================================================================
    // PIN VAULT ČÍSELNÍK
    // =========================================================================
    function openPinVaultPrompt(folderNode, onSuccess) {
        pendingPinFolderId = folderNode.id;
        pendingPinCallback = onSuccess;
        enteredPinDigits = "";
        document.getElementById("pin-vault-title").textContent = getDisplayLabel(folderNode);
        document.getElementById("pin-vault-subtitle").textContent = "Zadejte 4místný PIN kód (výchozí 1234)";
        updatePinDotsUi();
        pinVaultModal.classList.remove("hidden");
        syncWorkspaceBackdropBlur();
    }

    function updatePinDotsUi() {
        const dots = document.querySelectorAll("#pin-dots-row .pin-dot");
        dots.forEach((dot, idx) => {
            dot.classList.toggle("filled", idx < enteredPinDigits.length);
        });
    }

    function handlePinDigitPress(digit) {
        if (enteredPinDigits.length >= 4) return;
        Bridge.haptic("light");
        enteredPinDigits += digit;
        updatePinDotsUi();

        if (enteredPinDigits.length === 4) {
            const found = findNodeDeep(pendingPinFolderId);
            const expectedPin = (found && found.node.pinCode) || "1234";
            if (enteredPinDigits === expectedPin) {
                Bridge.haptic("medium");
                pinVaultModal.classList.add("hidden");
                const cb = pendingPinCallback;
                pendingPinCallback = null;
                syncWorkspaceBackdropBlur();
                if (typeof cb === "function") cb();
            } else {
                Bridge.haptic("heavy");
                document.getElementById("pin-vault-subtitle").textContent = "Nesprávný PIN kód, zkuste to znovu";
                setTimeout(() => {
                    enteredPinDigits = "";
                    updatePinDotsUi();
                }, 260);
            }
        }
    }

    // =========================================================================
    // INTERAKCE S POLOŽKAMI, JIGGLE MODE & DRAG AND DROP
    // =========================================================================
    function setJiggleMode(enabled) {
        if (enabled && state && state.theme.lockLayout) {
            showToast("Rozložení plochy je uzamčeno v nastavení");
            return;
        }
        isJiggleMode = enabled;
        document.body.classList.toggle("jiggle-active", enabled);
        jiggleToolbar.classList.toggle("hidden", !enabled);
        if (!enabled && jiggleAddPopover) {
            jiggleAddPopover.classList.add("hidden");
        }
        if (enabled) {
            Bridge.haptic("heavy");
        }
        renderHomeScreen();
    }

    function attachNodeInteraction(el, node, contextInfo) {
        let startX = 0;
        let startY = 0;
        let moved = false;
        let longPressTimer = null;
        let isDraggingThis = false;
        let ghostEl = null;
        let lastDropHoverEl = null;

        const clearTimer = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        el.addEventListener("pointerdown", (e) => {
            if (e.button && e.button !== 0) return;
            if (e.target.closest(".jiggle-remove-btn") || e.target.closest(".widget-edit-gear") || e.target.closest(".media-ctrl-btn") || e.target.closest(".cal-add-event-mini-btn")) {
                return;
            }

            startX = e.clientX;
            startY = e.clientY;
            moved = false;
            isDraggingThis = false;

            clearTimer();
            longPressTimer = setTimeout(() => {
                longPressTimer = null;
                if (!moved) {
                    if (!isJiggleMode && (node.type === "app" || node.type === "folder")) {
                        openQuickActionMenu(node, contextInfo);
                    } else if (!state.theme.lockLayout) {
                        setJiggleMode(true);
                        startInteractiveDrag(e);
                    }
                }
            }, 460);
        });

        el.addEventListener("pointermove", (e) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.hypot(dx, dy) > 10) {
                moved = true;
                if (longPressTimer && !isJiggleMode) {
                    clearTimer();
                } else if (isJiggleMode && !isDraggingThis && !state.theme.lockLayout) {
                    clearTimer();
                    startInteractiveDrag(e);
                }
            }

            if (isDraggingThis && ghostEl) {
                e.preventDefault();
                ghostEl.style.left = `${e.clientX}px`;
                ghostEl.style.top = `${e.clientY}px`;
                highlightFolderHoverTarget(e.clientX, e.clientY);
            }
        });

        const endPointer = (e) => {
            clearTimer();
            clearHoverHighlight();
            if (isDraggingThis) {
                finishInteractiveDrag(e);
                return;
            }
            if (!moved) {
                handleNodeTap(node, contextInfo);
            }
        };

        el.addEventListener("pointerup", endPointer);
        el.addEventListener("pointercancel", () => {
            clearTimer();
            clearHoverHighlight();
            if (isDraggingThis) cleanupGhost();
        });

        function highlightFolderHoverTarget(cx, cy) {
            clearHoverHighlight();
            if (node.type === "widget") return;
            const elemBelow = document.elementFromPoint(cx, cy);
            const targetGridItem = elemBelow ? elemBelow.closest(".grid-item") : null;
            if (targetGridItem && targetGridItem.dataset.itemId !== node.id) {
                targetGridItem.classList.add("folder-drop-target");
                lastDropHoverEl = targetGridItem;
            }
        }

        function clearHoverHighlight() {
            if (lastDropHoverEl) {
                lastDropHoverEl.classList.remove("folder-drop-target");
                lastDropHoverEl = null;
            }
        }

        function startInteractiveDrag(e) {
            if (state.theme.lockLayout) return;
            isDraggingThis = true;
            Bridge.haptic("medium");
            closeQuickActionMenu();

            el.classList.add("dragging-source");
            ghostEl = el.cloneNode(true);
            ghostEl.classList.remove("dragging-source");
            ghostEl.classList.add("drag-floating-ghost");
            ghostEl.style.width = `${el.offsetWidth || 68}px`;
            ghostEl.style.height = `${el.offsetHeight || 68}px`;
            ghostEl.style.left = `${e.clientX}px`;
            ghostEl.style.top = `${e.clientY}px`;
            document.body.appendChild(ghostEl);
        }

        function cleanupGhost() {
            isDraggingThis = false;
            el.classList.remove("dragging-source");
            if (ghostEl && ghostEl.parentNode) {
                ghostEl.parentNode.removeChild(ghostEl);
            }
            ghostEl = null;
        }

        function finishInteractiveDrag(e) {
            const dropX = e.clientX;
            const dropY = e.clientY;
            cleanupGhost();

            if (!folderModal.classList.contains("hidden")) {
                const folderCard = folderModal.querySelector(".folder-card");
                const cardRect = folderCard ? folderCard.getBoundingClientRect() : null;
                const isOutsideCard =
                    cardRect &&
                    (dropX < cardRect.left - 16 ||
                        dropX > cardRect.right + 16 ||
                        dropY < cardRect.top - 16 ||
                        dropY > cardRect.bottom + 16);

                if (isOutsideCard && contextInfo.location === "folder") {
                    const movedOut = removeNodeById(node.id);
                    if (movedOut) {
                        closeFolderModal();
                        const activePage = state.pages[state.activePage];
                        const cols = state.gridCols;
                        const rows = state.gridRows;
                        const occupied = Array.from({ length: rows }, () => Array(cols).fill(false));
                        for (const it of activePage.items) {
                            markMatrix(occupied, it.col, it.row, it.colSpan || 1, it.rowSpan || 1, true);
                        }
                        const free = findFirstFreeMatrixSlot(
                            occupied,
                            movedOut.colSpan || 1,
                            movedOut.rowSpan || 1,
                            cols,
                            rows
                        );
                        if (free) {
                            movedOut.col = free.col;
                            movedOut.row = free.row;
                            activePage.items.push(movedOut);
                        } else {
                            state.pages.push({
                                id: uid("page"),
                                role: "personal",
                                items: [Object.assign(movedOut, { col: 0, row: 0 })]
                            });
                            state.activePage = state.pages.length - 1;
                        }
                        Bridge.saveState(state);
                        renderHomeScreen();
                        showToast("Položka přesunuta ze složky na plochu");
                    }
                    return;
                }

                // Přeřazení uvnitř otevřené složky
                const elemBelow = document.elementFromPoint(dropX, dropY);
                const targetItemEl = elemBelow ? elemBelow.closest(".grid-item") : null;
                if (
                    targetItemEl &&
                    targetItemEl.dataset.itemId &&
                    targetItemEl.dataset.itemId !== node.id &&
                    folderNavStack.length > 0
                ) {
                    const currentFolderId = folderNavStack[folderNavStack.length - 1];
                    const folderFound = findNodeDeep(currentFolderId);
                    if (folderFound && folderFound.node.type === "folder" && Array.isArray(folderFound.node.children)) {
                        const arr = folderFound.node.children;
                        const fromIdx = arr.findIndex((c) => c.id === node.id);
                        const toIdx = arr.findIndex((c) => c.id === targetItemEl.dataset.itemId);
                        if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
                            const [movedItem] = arr.splice(fromIdx, 1);
                            arr.splice(toIdx, 0, movedItem);
                            Bridge.saveState(state);
                            renderHomeScreen();
                            renderActiveFolderModal();
                        }
                    }
                }
                return;
            }

            // 1. Kontrola puštění do Docku
            const dockRect = iosDock.getBoundingClientRect();
            if (
                dropY >= dockRect.top - 12 &&
                dropY <= dockRect.bottom + 12 &&
                dropX >= dockRect.left &&
                dropX <= dockRect.right
            ) {
                moveNodeToDock(node.id);
                return;
            }

            // 2. Kontrola puštění na jinou položku na aktivní stránce (vytvoření složky nebo vložení do složky)
            const activePageEl = pagesTrack.querySelector(`.home-page[data-page-index="${state.activePage}"]`);
            if (!activePageEl) return;

            const rect = activePageEl.getBoundingClientRect();
            const cellW = rect.width / state.gridCols;
            const cellH = rect.height / state.gridRows;
            const targetCol = Math.max(0, Math.min(state.gridCols - 1, Math.floor((dropX - rect.left) / cellW)));
            const targetRow = Math.max(0, Math.min(state.gridRows - 1, Math.floor((dropY - rect.top) / cellH)));

            const activePage = state.pages[state.activePage];
            const occupant = activePage.items.find(
                (it) =>
                    it.id !== node.id &&
                    targetCol >= it.col &&
                    targetCol < it.col + (it.colSpan || 1) &&
                    targetRow >= it.row &&
                    targetRow < it.row + (it.rowSpan || 1)
            );

            if (occupant && node.type !== "widget") {
                if (occupant.type === "folder" && occupant.folderKind === "standard") {
                    if (node.type === "folder" && isDescendantOrSelf(node.id, occupant.id)) {
                        showToast("Složku nelze přesunout do sebe samé");
                        renderHomeScreen();
                        return;
                    }
                    const movedNode = removeNodeById(node.id);
                    if (movedNode) {
                        if (movedNode.type === "folder") {
                            movedNode.folderSize = "1x1";
                            movedNode.colSpan = 1;
                            movedNode.rowSpan = 1;
                        }
                        occupant.children.push(movedNode);
                        Bridge.saveState(state);
                        renderHomeScreen();
                        showToast(`Přidáno do složky ${occupant.title}`);
                        return;
                    }
                } else if (occupant.type === "app") {
                    const movedNode = removeNodeById(node.id);
                    if (movedNode) {
                        const occIdx = activePage.items.findIndex((it) => it.id === occupant.id);
                        if (occIdx >= 0) {
                            const [occNode] = activePage.items.splice(occIdx, 1);
                            const newFolder = {
                                id: uid("folder"),
                                type: "folder",
                                title: "Složka",
                                col: occNode.col,
                                row: occNode.row,
                                colSpan: 1,
                                rowSpan: 1,
                                folderSize: "1x1",
                                folderKind: "standard",
                                smartRule: "games_media",
                                smartKeyword: "",
                                pinCode: "1234",
                                fileCategory: "all",
                                children: [occNode, movedNode],
                                customStyle: createDefaultCustomStyle()
                            };
                            activePage.items.push(newFolder);
                            Bridge.saveState(state);
                            renderHomeScreen();
                            showToast("Vytvořena nová složka");
                            return;
                        }
                    }
                }
            }

            moveNodeToPageGrid(node.id, state.activePage, targetCol, targetRow);
        }
    }

    function handleNodeTap(node, contextInfo) {
        if (isJiggleMode) {
            if (node.type === "widget") {
                openWidgetConfigModal(node.id);
            } else if (node.type === "folder") {
                requestOpenFolder(node.id, contextInfo.location === "folder");
            }
            return;
        }

        if (node.type === "app") {
            Bridge.launchApp(node.packageName);
        } else if (node.type === "folder") {
            requestOpenFolder(node.id, contextInfo.location === "folder");
        } else if (node.type === "widget" && (node.widgetType === "weather" || node.widgetType === "calendar")) {
            openWidgetConfigModal(node.id);
        }
    }

    function moveNodeToDock(nodeId) {
        const maxDock = state.dockConfig.cols * state.dockConfig.pages;
        if (state.dock.some((d) => d.id === nodeId)) {
            renderHomeScreen();
            return;
        }
        if (state.dock.length >= maxDock) {
            showToast("Dock je plný (zvyšte počet pozic nebo stránek v nastavení)");
            renderHomeScreen();
            return;
        }

        const removed = removeNodeById(nodeId);
        if (!removed) return;

        removed.colSpan = 1;
        removed.rowSpan = 1;
        if (removed.type === "folder") {
            removed.folderSize = "1x1";
        }
        state.dock.push(removed);
        Bridge.saveState(state);
        renderHomeScreen();
    }

    function moveNodeToPageGrid(nodeId, pageIndex, desiredCol, desiredRow) {
        const found = findNodeDeep(nodeId);
        if (!found) return;

        const node = removeNodeById(nodeId);
        if (!node) return;

        const page = state.pages[pageIndex];
        const cols = state.gridCols;
        const rows = state.gridRows;
        const cSpan = Math.min(node.colSpan || 1, cols);
        const rSpan = Math.min(node.rowSpan || 1, rows);

        const occupied = Array.from({ length: rows }, () => Array(cols).fill(false));
        for (const it of page.items) {
            markMatrix(occupied, it.col, it.row, it.colSpan || 1, it.rowSpan || 1, true);
        }

        const clampedCol = Math.max(0, Math.min(cols - cSpan, desiredCol));
        const clampedRow = Math.max(0, Math.min(rows - rSpan, desiredRow));

        if (canFitMatrix(occupied, clampedCol, clampedRow, cSpan, rSpan, cols, rows)) {
            node.col = clampedCol;
            node.row = clampedRow;
        } else {
            const free = findFirstFreeMatrixSlot(occupied, cSpan, rSpan, cols, rows);
            if (free) {
                node.col = free.col;
                node.row = free.row;
            }
        }

        page.items.push(node);
        Bridge.saveState(state);
        renderHomeScreen();
    }

    function removeItemWithConfirmation(nodeId) {
        if (state.theme.lockLayout) {
            showToast("Plocha je uzamčena");
            return;
        }
        const removed = removeNodeById(nodeId);
        if (removed) {
            Bridge.haptic("medium");
            Bridge.saveState(state);
            renderHomeScreen();
            if (!folderModal.classList.contains("hidden")) {
                renderActiveFolderModal();
            }
            showToast("Položka odebrána");
        }
    }

    // =========================================================================
    // iOS 18 QUICK ACTION POPOVER MENU & PŘEPÍNÁNÍ 1×1 / 2×2 SLOŽEK
    // =========================================================================
    function openQuickActionMenu(node, contextInfo) {
        Bridge.haptic("medium");
        quickActionTarget = { nodeId: node.id, contextInfo };

        const qaIcon = document.getElementById("qa-icon");
        const qaEmoji = document.getElementById("qa-emoji");
        const qaTitle = document.getElementById("qa-title");
        const qaSubtitle = document.getElementById("qa-subtitle");
        const qaFolderSizeBox = document.getElementById("qa-folder-size-box");

        const btnEnlargeToggle = document.getElementById("qa-btn-enlarge-toggle");
        const enlargeLabel = document.getElementById("qa-enlarge-label");
        const btnRenameFolder = document.getElementById("qa-btn-rename-folder");
        const btnFolderAddChild = document.getElementById("qa-btn-folder-add-child");
        const btnLockFolder = document.getElementById("qa-btn-lock-folder");
        const lockFolderLabel = document.getElementById("qa-lock-folder-label");

        const btnCreateFolder = document.getElementById("qa-btn-create-folder");
        const btnInfo = document.getElementById("qa-btn-info");
        const btnRemove = document.getElementById("qa-btn-remove");
        const removeLabel = document.getElementById("qa-remove-label");
        const btnUninstall = document.getElementById("qa-btn-uninstall");

        qaTitle.textContent = getDisplayLabel(node);

        if (node.customStyle && node.customStyle.customEmoji) {
            qaIcon.classList.add("hidden");
            qaEmoji.classList.remove("hidden");
            qaEmoji.textContent = node.customStyle.customEmoji;
        } else if (node.type === "folder") {
            qaIcon.classList.add("hidden");
            qaEmoji.classList.remove("hidden");
            qaEmoji.textContent = node.folderKind === "vault" ? "🔒" : node.folderKind === "smart" ? "⚡" : "📁";
        } else {
            qaEmoji.classList.add("hidden");
            qaIcon.classList.remove("hidden");
            qaIcon.src = getAppIconUrl(node.packageName);
        }

        if (node.type === "folder") {
            qaSubtitle.textContent = `Složka · ${getEffectiveFolderChildren(node).length} položek`;
            qaFolderSizeBox.classList.toggle("hidden", contextInfo.location !== "page");
            document.querySelectorAll("#qa-folder-size-box .qa-size-pill").forEach((b) => {
                b.classList.toggle("active", b.dataset.fsize === (node.folderSize || "1x1"));
            });

            btnEnlargeToggle.classList.toggle("hidden", contextInfo.location !== "page");
            enlargeLabel.textContent = (node.folderSize === "2x2") ? "Shrink to 1×1" : "Enlarge Folder (2×2)";
            btnRenameFolder.classList.remove("hidden");
            btnFolderAddChild.classList.remove("hidden");
            btnLockFolder.classList.remove("hidden");
            lockFolderLabel.textContent = node.folderKind === "vault" ? "Unlock Folder (Standard)" : "Lock Folder (PIN)";

            btnCreateFolder.classList.add("hidden");
            btnInfo.classList.add("hidden");
            btnUninstall.classList.add("hidden");
            btnRemove.classList.remove("hidden");
            removeLabel.textContent = "Remove Folder";
        } else {
            qaSubtitle.textContent = node.packageName;
            qaFolderSizeBox.classList.add("hidden");
            btnEnlargeToggle.classList.add("hidden");
            btnRenameFolder.classList.add("hidden");
            btnFolderAddChild.classList.add("hidden");
            btnLockFolder.classList.add("hidden");

            btnCreateFolder.classList.remove("hidden");
            btnInfo.classList.remove("hidden");
            const appObj = appMap.get(node.packageName);
            btnUninstall.classList.toggle("hidden", Boolean(appObj && appObj.isSystemApp));
            btnRemove.classList.toggle("hidden", contextInfo.location === "drawer");
            removeLabel.textContent = "Remove App";
        }

        quickActionOverlay.classList.remove("hidden");
        syncWorkspaceBackdropBlur();
    }

    function closeQuickActionMenu() {
        quickActionOverlay.classList.add("hidden");
        quickActionTarget = null;
        syncWorkspaceBackdropBlur();
    }

    function resizeFolderOnWorkspace(folderId, newSize) {
        const found = findNodeDeep(folderId);
        if (!found || found.node.type !== "folder" || found.pageIndex < 0) return;

        const folder = found.node;
        const dims = getFolderDimensions(newSize);
        const page = state.pages[found.pageIndex];
        const cols = state.gridCols;
        const rows = state.gridRows;

        if (dims.colSpan > cols || dims.rowSpan > rows) {
            showToast("Tato velikost přesahuje mřížku plochy");
            return;
        }

        const occupied = Array.from({ length: rows }, () => Array(cols).fill(false));
        for (const it of page.items) {
            if (it.id === folder.id) continue;
            markMatrix(occupied, it.col, it.row, it.colSpan || 1, it.rowSpan || 1, true);
        }

        const desiredCol = Math.max(0, Math.min(cols - dims.colSpan, folder.col));
        const desiredRow = Math.max(0, Math.min(rows - dims.rowSpan, folder.row));

        if (canFitMatrix(occupied, desiredCol, desiredRow, dims.colSpan, dims.rowSpan, cols, rows)) {
            folder.col = desiredCol;
            folder.row = desiredRow;
        } else {
            const free = findFirstFreeMatrixSlot(occupied, dims.colSpan, dims.rowSpan, cols, rows);
            if (!free) {
                showToast("Na této obrazovce není dostatek volného místa pro " + newSize);
                return;
            }
            folder.col = free.col;
            folder.row = free.row;
        }

        folder.folderSize = newSize;
        folder.colSpan = dims.colSpan;
        folder.rowSpan = dims.rowSpan;

        Bridge.haptic("medium");
        Bridge.saveState(state);
        renderHomeScreen();
        if (!folderModal.classList.contains("hidden")) {
            renderActiveFolderModal();
        }
        showToast(`Velikost složky nastavena na ${newSize}`);
    }

    // =========================================================================
    // PER-ITEM STUDIO (INDIVIDUÁLNÍ ÚPRAVA IKONY / SLOŽKY)
    // =========================================================================
    function openPerItemEditor(nodeId) {
        const found = findNodeDeep(nodeId);
        if (!found) return;
        editingPerItemId = nodeId;
        const cs = Object.assign(createDefaultCustomStyle(), found.node.customStyle || {});

        document.getElementById("per-item-label-input").value = cs.customLabel || "";
        document.getElementById("per-item-emoji-input").value = cs.customEmoji || "";
        document.getElementById("per-item-scale-slider").value = String(cs.scale || 100);
        document.getElementById("per-item-scale-value").textContent = (cs.scale || 100) + "%";
        document.getElementById("per-item-hide-label").checked = !!cs.hideLabel;

        document.querySelectorAll("#per-item-bg-swatches .color-swatch").forEach((sw) => {
            sw.classList.toggle("active", (sw.dataset.color || "") === (cs.bgColor || ""));
        });
        document.querySelectorAll("#per-item-border-swatches .color-swatch").forEach((sw) => {
            sw.classList.toggle("active", (sw.dataset.color || "") === (cs.borderColor || ""));
        });

        perItemEditorModal.classList.remove("hidden");
        syncWorkspaceBackdropBlur();
    }

    function savePerItemEditor() {
        const found = findNodeDeep(editingPerItemId);
        if (!found) {
            perItemEditorModal.classList.add("hidden");
            syncWorkspaceBackdropBlur();
            return;
        }

        const activeBg = document.querySelector("#per-item-bg-swatches .color-swatch.active");
        const activeBorder = document.querySelector("#per-item-border-swatches .color-swatch.active");

        found.node.customStyle = {
            customLabel: document.getElementById("per-item-label-input").value.trim(),
            customEmoji: document.getElementById("per-item-emoji-input").value.trim(),
            scale: Number(document.getElementById("per-item-scale-slider").value) || 100,
            bgColor: activeBg ? activeBg.dataset.color || "" : "",
            borderColor: activeBorder ? activeBorder.dataset.color || "" : "",
            hideLabel: document.getElementById("per-item-hide-label").checked
        };

        Bridge.saveState(state);
        perItemEditorModal.classList.add("hidden");
        renderHomeScreen();
        if (!folderModal.classList.contains("hidden")) {
            renderActiveFolderModal();
        }
        showToast("Vzhled položky uložen");
    }

    // =========================================================================
    // APP DRAWER V3 (4 LAYOUTY + UNIVERZÁLNÍ HLEDÁNÍ APLIKACÍ, SOUBORŮ A WEBU)
    // =========================================================================
    function openAppDrawer(focusSearchInput = false) {
        Bridge.haptic("light");
        drawerSearchInput.value = "";
        btnClearSearch.classList.add("hidden");
        renderAppDrawerContent("");
        appDrawer.classList.remove("hidden");
        syncWorkspaceBackdropBlur();
        if (focusSearchInput) {
            setTimeout(() => {
                try {
                    drawerSearchInput.focus();
                } catch (_) {}
            }, 120);
        }
    }

    function closeAppDrawer() {
        appDrawer.classList.add("hidden");
        drawerSearchInput.blur();
        syncWorkspaceBackdropBlur();
    }

    function renderAppDrawerContent(query) {
        const cleanQuery = (query || "").trim().toLowerCase();
        const layout = (state && state.drawerLayout) || "grid";

        document.querySelectorAll("#drawer-layout-switcher .drawer-layout-pill").forEach((pill) => {
            pill.classList.toggle("active", pill.dataset.drawerLayout === layout);
        });

        const filteredApps = cleanQuery
            ? installedApps.filter(
                  (a) =>
                      a.label.toLowerCase().includes(cleanQuery) ||
                      a.packageName.toLowerCase().includes(cleanQuery)
              )
            : installedApps;

        drawerSections.innerHTML = "";
        azIndexBar.innerHTML = "";

        if (filteredApps.length === 0) {
            drawerSections.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:24px 0;">Žádné odpovídající aplikace</p>`;
        } else if (layout === "library" && !cleanQuery) {
            renderDrawerLibraryLayout(filteredApps);
        } else if (layout === "list") {
            renderDrawerMinimalListLayout(filteredApps);
        } else if (layout === "paged" && !cleanQuery) {
            renderDrawerPagedLayout(filteredApps);
        } else {
            renderDrawerStandardGridLayout(filteredApps);
        }

        // Univerzální vyhledávání: Soubory v telefonu + Web
        renderDrawerFileSearchResults(cleanQuery);
        renderDrawerWebSearchOption(query);
    }

    function renderDrawerStandardGridLayout(apps) {
        const groups = new Map();
        for (const app of apps) {
            const firstChar = (app.label.trim().charAt(0) || "#").toUpperCase();
            const letter = /[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/i.test(firstChar) ? firstChar : "#";
            if (!groups.has(letter)) groups.set(letter, []);
            groups.get(letter).push(app);
        }

        for (const [letter, groupApps] of groups.entries()) {
            const sectionEl = document.createElement("div");
            sectionEl.className = "drawer-letter-group";
            sectionEl.id = "drawer-sec-" + letter;

            const titleEl = document.createElement("div");
            titleEl.className = "drawer-letter-title";
            titleEl.textContent = letter;

            const gridEl = document.createElement("div");
            gridEl.className = "drawer-apps-grid";

            for (const app of groupApps) {
                gridEl.appendChild(createDrawerAppItemElement(app));
            }

            sectionEl.appendChild(titleEl);
            sectionEl.appendChild(gridEl);
            drawerSections.appendChild(sectionEl);

            const azBtn = document.createElement("span");
            azBtn.className = "az-letter";
            azBtn.textContent = letter;
            azBtn.addEventListener("click", () => {
                Bridge.haptic("light");
                sectionEl.scrollIntoView({ behavior: "smooth", block: "start" });
            });
            azIndexBar.appendChild(azBtn);
        }
    }

    function renderDrawerLibraryLayout(apps) {
        const categories = [
            { title: "Komunikace & Sociální", items: [] },
            { title: "Média, Hudba & Foto", items: [] },
            { title: "Produktivita & Nástroje", items: [] },
            { title: "Systém & Ostatní", items: [] }
        ];

        for (const app of apps) {
            const hay = (app.label + " " + app.packageName).toLowerCase();
            if (/dialer|phone|telefon|messag|zpr|chat|mail|social|whats|telegr|chrome|browser/.test(hay)) {
                categories[0].items.push(app);
            } else if (/camera|foto|photo|galer|youtub|music|video|play|media|spotif/.test(hay)) {
                categories[1].items.push(app);
            } else if (/calen|kalk|calc|clock|hodin|map|doc|file|soubor|note|work/.test(hay)) {
                categories[2].items.push(app);
            } else {
                categories[3].items.push(app);
            }
        }

        const libGrid = document.createElement("div");
        libGrid.className = "library-categories-grid";

        for (const cat of categories) {
            if (cat.items.length === 0) continue;
            const card = document.createElement("div");
            card.className = "library-category-card";

            const title = document.createElement("div");
            title.className = "library-cat-title";
            title.textContent = cat.title;

            const itemsBox = document.createElement("div");
            itemsBox.className = "library-cat-items";
            for (const app of cat.items.slice(0, 4)) {
                itemsBox.appendChild(createDrawerAppItemElement(app));
            }

            card.appendChild(itemsBox);
            card.appendChild(title);
            libGrid.appendChild(card);
        }

        drawerSections.appendChild(libGrid);
    }

    function renderDrawerMinimalListLayout(apps) {
        const listWrap = document.createElement("div");
        listWrap.className = "drawer-minimal-list";
        const badges = (systemStatus && systemStatus.badges) || {};

        for (const app of apps) {
            const row = document.createElement("div");
            row.className = "drawer-list-row";

            const img = document.createElement("img");
            img.src = getAppIconUrl(app.packageName);
            img.alt = app.label;

            const lbl = document.createElement("span");
            lbl.className = "drawer-list-label";
            lbl.textContent = app.label;

            row.appendChild(img);
            row.appendChild(lbl);

            const bCount = badges[app.packageName] || 0;
            if (state.theme.showBadges && state.focusMode !== "minimal" && bCount > 0) {
                const b = document.createElement("span");
                b.className = "glass-mini-btn accent-mini-btn";
                b.textContent = String(bCount);
                row.appendChild(b);
            }

            const addHomeBtn = document.createElement("button");
            addHomeBtn.type = "button";
            addHomeBtn.className = "glass-mini-btn";
            addHomeBtn.textContent = "+ Plocha";
            addHomeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                addAppFromDrawerToHome(app.packageName);
            });
            row.appendChild(addHomeBtn);

            row.addEventListener("click", () => {
                closeAppDrawer();
                Bridge.launchApp(app.packageName);
            });

            listWrap.appendChild(row);
        }

        drawerSections.appendChild(listWrap);
    }

    function renderDrawerPagedLayout(apps) {
        const pageSize = (state.drawerCols || 4) * 5;
        const wrap = document.createElement("div");
        wrap.className = "drawer-paged-wrapper";

        for (let i = 0; i < apps.length; i += pageSize) {
            const pageApps = apps.slice(i, i + pageSize);
            const pageDiv = document.createElement("div");
            pageDiv.className = "drawer-paged-page";
            for (const app of pageApps) {
                pageDiv.appendChild(createDrawerAppItemElement(app));
            }
            wrap.appendChild(pageDiv);
        }

        drawerSections.appendChild(wrap);
    }

    function createDrawerAppItemElement(app) {
        const item = document.createElement("div");
        item.className = "grid-item";

        const squircle = document.createElement("div");
        squircle.className = "icon-squircle";

        const img = document.createElement("img");
        img.className = "app-icon-img";
        img.src = getAppIconUrl(app.packageName);
        img.alt = app.label;
        img.loading = "lazy";
        squircle.appendChild(img);

        const bCount = (systemStatus && systemStatus.badges && systemStatus.badges[app.packageName]) || 0;
        if (state.theme.showBadges && state.focusMode !== "minimal" && bCount > 0) {
            const badge = document.createElement("span");
            badge.className = "notification-badge";
            badge.textContent = bCount > 99 ? "99+" : String(bCount);
            squircle.appendChild(badge);
        }

        const label = document.createElement("span");
        label.className = "item-label";
        label.textContent = app.label;

        item.appendChild(squircle);
        item.appendChild(label);

        let pressTimer = null;
        item.addEventListener("pointerdown", () => {
            pressTimer = setTimeout(() => {
                pressTimer = null;
                addAppFromDrawerToHome(app.packageName);
            }, 480);
        });
        item.addEventListener("pointerup", () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
                closeAppDrawer();
                Bridge.launchApp(app.packageName);
            }
        });
        item.addEventListener("pointermove", () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });

        return item;
    }

    function addAppFromDrawerToHome(packageName) {
        Bridge.haptic("heavy");
        const page = state.pages[state.activePage];
        const cols = state.gridCols;
        const rows = state.gridRows;
        const occupied = Array.from({ length: rows }, () => Array(cols).fill(false));
        for (const it of page.items) {
            markMatrix(occupied, it.col, it.row, it.colSpan || 1, it.rowSpan || 1, true);
        }
        const free = findFirstFreeMatrixSlot(occupied, 1, 1, cols, rows);
        const newAppNode = {
            id: uid("app"),
            type: "app",
            packageName,
            col: free ? free.col : 0,
            row: free ? free.row : 0,
            colSpan: 1,
            rowSpan: 1,
            customStyle: createDefaultCustomStyle()
        };

        if (free) {
            page.items.push(newAppNode);
        } else {
            state.pages.push({
                id: uid("page"),
                role: "personal",
                items: [newAppNode]
            });
            state.activePage = state.pages.length - 1;
        }

        Bridge.saveState(state);
        closeAppDrawer();
        setJiggleMode(true);
        showToast("Aplikace přidána na plochu");
    }

    function renderDrawerFileSearchResults(cleanQuery) {
        if (!state || !state.searchDeviceFiles || cleanQuery.length < 1) {
            drawerFilesSection.classList.add("hidden");
            if (drawerFileFilterBar) drawerFileFilterBar.classList.add("hidden");
            return;
        }

        drawerFilesSection.classList.remove("hidden");
        if (drawerFileFilterBar) drawerFileFilterBar.classList.remove("hidden");

        const hasPerm = Bridge.hasFilePermissions();
        btnGrantFilesInline.classList.toggle("hidden", hasPerm);

        clearTimeout(fileSearchDebounceTimer);
        fileSearchDebounceTimer = setTimeout(() => {
            const filterArg = activeFileFilterCat === "all"
                ? state.fileSearchCategories
                : activeFileFilterCat;
            const files = Bridge.searchFiles(cleanQuery, filterArg);
            drawerFilesList.innerHTML = "";

            if (files.length === 0) {
                const emptyEl = document.createElement("div");
                emptyEl.style.fontSize = "12px";
                emptyEl.style.color = "var(--text-secondary)";
                emptyEl.style.padding = "8px 4px";
                emptyEl.textContent = hasPerm
                    ? "Žádné odpovídající soubory v telefonu."
                    : "Povolte přístup k souborům tlačítkem výše pro prohledávání dokumentů, obrázků, videí a hudby.";
                drawerFilesList.appendChild(emptyEl);
                return;
            }

            for (const f of files) {
                drawerFilesList.appendChild(createFileResultRow(f));
            }
        }, 140);
    }

    function renderDrawerWebSearchOption(rawQuery) {
        const trimmed = (rawQuery || "").trim();
        if (!drawerWebSearchBox) return;
        if (trimmed.length < 1) {
            drawerWebSearchBox.classList.add("hidden");
            return;
        }
        drawerWebSearchBox.classList.remove("hidden");
        if (webSearchQueryTitle) {
            webSearchQueryTitle.textContent = `Hledat na webu: „${trimmed}“`;
        }
    }

    function createFileResultRow(fileItem) {
        const card = document.createElement("div");
        card.className = "file-result-card";

        const badge = document.createElement("div");
        badge.className = "file-cat-badge";
        badge.textContent = fileItem.category === "images"
            ? "🖼"
            : fileItem.category === "videos"
                ? "🎬"
                : fileItem.category === "audio"
                    ? "🎵"
                    : fileItem.category === "archives"
                        ? "📦"
                        : "📄";

        const meta = document.createElement("div");
        meta.className = "file-result-meta";

        const nameEl = document.createElement("div");
        nameEl.className = "file-result-name";
        nameEl.textContent = fileItem.name;

        const subEl = document.createElement("div");
        subEl.className = "file-result-sub";
        subEl.textContent = `${fileItem.path} • ${formatBytes(fileItem.sizeBytes)}`;

        meta.appendChild(nameEl);
        meta.appendChild(subEl);

        const actions = document.createElement("div");
        actions.className = "file-result-actions";

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "glass-mini-btn accent-mini-btn";
        openBtn.textContent = "Otevřít";
        openBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            Bridge.openFile(fileItem.uriString, fileItem.mimeType);
        });

        const shareBtn = document.createElement("button");
        shareBtn.type = "button";
        shareBtn.className = "glass-mini-btn";
        shareBtn.textContent = "Sdílet";
        shareBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            Bridge.shareFile(fileItem.uriString, fileItem.mimeType);
        });

        actions.appendChild(openBtn);
        actions.appendChild(shareBtn);

        card.appendChild(badge);
        card.appendChild(meta);
        card.appendChild(actions);
        return card;
    }

    function formatBytes(bytes) {
        const b = Number(bytes) || 0;
        if (b < 1024) return b + " B";
        if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
        return (b / (1024 * 1024)).toFixed(1) + " MB";
    }

    function escapeHtml(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // =========================================================================
    // SPECIÁLNÍ SLOŽKY, PODSLOŽKY & PRO WIDGET STUDIO
    // =========================================================================
    function openFolderCreatorModal(parentFolderId = null) {
        folderCreatorParentId = parentFolderId;
        document.getElementById("new-folder-title-input").value = parentFolderId ? "Podsložka" : "Nová složka";
        folderCreatorModal.classList.remove("hidden");
        syncWorkspaceBackdropBlur();
    }

    function confirmCreateSpecialOrNestedFolder() {
        const title = document.getElementById("new-folder-title-input").value.trim() || "Složka";
        const activeKindBtn = document.querySelector("#new-folder-kind-control .seg-btn.active");
        const activeSizeBtn = document.querySelector("#new-folder-size-control .seg-btn.active");
        const activeRuleBtn = document.querySelector("#smart-folder-rule-control .seg-btn.active");
        const activeCatBtn = document.querySelector("#file-folder-cat-control .seg-btn.active");

        const folderKind = activeKindBtn ? activeKindBtn.dataset.fkind : "standard";
        const folderSize = folderCreatorParentId ? "1x1" : (activeSizeBtn ? activeSizeBtn.dataset.fsize : "1x1");
        const dims = getFolderDimensions(folderSize);
        const smartRule = activeRuleBtn ? activeRuleBtn.dataset.srule : "games_media";
        const smartKeyword = document.getElementById("smart-folder-keyword-input").value.trim();
        const rawPin = document.getElementById("vault-folder-pin-input").value.trim();
        const pinCode = /^\d{4}$/.test(rawPin) ? rawPin : "1234";
        const fileCategory = activeCatBtn ? activeCatBtn.dataset.fcat : "all";

        const defaultChildren = folderKind === "standard" && installedApps.length >= 2
            ? installedApps.slice(0, 2).map((a) => ({
                  id: uid("app"),
                  type: "app",
                  packageName: a.packageName,
                  col: 0,
                  row: 0,
                  colSpan: 1,
                  rowSpan: 1,
                  customStyle: createDefaultCustomStyle()
              }))
            : [];

        const newFolder = {
            id: uid("folder"),
            type: "folder",
            title,
            col: 0,
            row: 0,
            colSpan: dims.colSpan,
            rowSpan: dims.rowSpan,
            folderSize,
            folderKind,
            smartRule,
            smartKeyword,
            pinCode,
            fileCategory,
            children: defaultChildren,
            customStyle: createDefaultCustomStyle()
        };

        if (folderCreatorParentId) {
            const parentFound = findNodeDeep(folderCreatorParentId);
            if (parentFound && parentFound.node.type === "folder") {
                parentFound.node.children.push(newFolder);
                Bridge.saveState(state);
                folderCreatorModal.classList.add("hidden");
                renderHomeScreen();
                renderActiveFolderModal();
                showToast("Podsložka přidána");
                return;
            }
        }

        const page = state.pages[state.activePage];
        const cols = state.gridCols;
        const rows = state.gridRows;
        const occupied = Array.from({ length: rows }, () => Array(cols).fill(false));
        for (const it of page.items) {
            markMatrix(occupied, it.col, it.row, it.colSpan || 1, it.rowSpan || 1, true);
        }

        const free = findFirstFreeMatrixSlot(occupied, dims.colSpan, dims.rowSpan, cols, rows);
        if (free) {
            newFolder.col = free.col;
            newFolder.row = free.row;
            page.items.push(newFolder);
        } else {
            state.pages.push({
                id: uid("page"),
                role: "personal",
                items: [newFolder]
            });
            state.activePage = state.pages.length - 1;
        }

        Bridge.saveState(state);
        folderCreatorModal.classList.add("hidden");
        renderHomeScreen();
        showToast("Složka vytvořena");
    }

    function openFolderAppPicker() {
        if (folderNavStack.length === 0) return;
        document.getElementById("folder-app-picker-search").value = "";
        renderFolderAppPickerList("");
        folderAppPickerModal.classList.remove("hidden");
        syncWorkspaceBackdropBlur();
    }

    function renderFolderAppPickerList(query) {
        const listEl = document.getElementById("folder-app-picker-list");
        listEl.innerHTML = "";
        const q = (query || "").trim().toLowerCase();
        const apps = q
            ? installedApps.filter((a) => a.label.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q))
            : installedApps;

        for (const app of apps) {
            const row = document.createElement("div");
            row.className = "drawer-list-row";
            row.innerHTML = `
                <img src="${getAppIconUrl(app.packageName)}" alt="" />
                <span class="drawer-list-label">${escapeHtml(app.label)}</span>
                <span class="glass-mini-btn accent-mini-btn">+ Přidat</span>
            `;
            row.addEventListener("click", () => {
                const currentFolderId = folderNavStack[folderNavStack.length - 1];
                const found = findNodeDeep(currentFolderId);
                if (found && found.node.type === "folder") {
                    found.node.children.push({
                        id: uid("app"),
                        type: "app",
                        packageName: app.packageName,
                        col: 0,
                        row: 0,
                        colSpan: 1,
                        rowSpan: 1,
                        customStyle: createDefaultCustomStyle()
                    });
                    Bridge.saveState(state);
                    folderAppPickerModal.classList.add("hidden");
                    renderHomeScreen();
                    renderActiveFolderModal();
                    showToast("Aplikace přidána do složky");
                }
            });
            listEl.appendChild(row);
        }
    }

    function addProWidget(widgetType, colSpan, rowSpan, targetFolderId = null, initialStyle = null) {
        const newWidget = {
            id: uid("widget"),
            type: "widget",
            widgetType,
            col: 0,
            row: 0,
            colSpan,
            rowSpan,
            style: initialStyle || (widgetType === "clock" ? "digital" : "ring"),
            city: "Praha",
            tempUnit: "C",
            weatherCondition: "partly_cloudy",
            agendaItems: DEFAULT_AGENDA_EVENTS.map((ev) => Object.assign({}, ev)),
            bgColor: "#101520",
            accentColor: widgetType === "rings" || widgetType === "battery"
                ? "#30D158"
                : widgetType === "calendar"
                    ? "#FF453A"
                    : widgetType === "media"
                        ? "#BF5AF2"
                        : "#0A84FF",
            opacity: 68,
            customStyle: createDefaultCustomStyle()
        };

        if (targetFolderId) {
            const found = findNodeDeep(targetFolderId);
            if (found && found.node.type === "folder") {
                found.node.children.push(newWidget);
                Bridge.saveState(state);
                widgetPickerModal.classList.add("hidden");
                renderHomeScreen();
                renderActiveFolderModal();
                showToast("Pro Widget vložen do složky");
                return;
            }
        }

        const page = state.pages[state.activePage];
        const cols = state.gridCols;
        const rows = state.gridRows;
        const occupied = Array.from({ length: rows }, () => Array(cols).fill(false));
        for (const it of page.items) {
            markMatrix(occupied, it.col, it.row, it.colSpan || 1, it.rowSpan || 1, true);
        }

        const cSpan = Math.min(colSpan, cols);
        const rSpan = Math.min(rowSpan, rows);
        const free = findFirstFreeMatrixSlot(occupied, cSpan, rSpan, cols, rows);

        if (free) {
            newWidget.col = free.col;
            newWidget.row = free.row;
            page.items.push(newWidget);
        } else {
            state.pages.push({
                id: uid("page"),
                role: "personal",
                items: [newWidget]
            });
            state.activePage = state.pages.length - 1;
        }

        Bridge.saveState(state);
        widgetPickerModal.classList.add("hidden");
        renderHomeScreen();
        showToast("Pro Widget přidán na plochu");
    }

    function openWidgetConfigModal(widgetId) {
        const found = findNodeDeep(widgetId);
        if (!found || found.node.type !== "widget") return;

        const w = found.node;
        editingWidgetId = widgetId;

        const sizeKey = `${w.colSpan}x${w.rowSpan}`;
        document.querySelectorAll("#widget-size-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.size === sizeKey);
        });

        const styleGroup = document.getElementById("widget-style-group");
        const weatherGroup = document.getElementById("widget-weather-group");
        const calendarGroup = document.getElementById("widget-calendar-group");

        styleGroup.classList.toggle("hidden", w.widgetType !== "clock");
        weatherGroup.classList.toggle("hidden", w.widgetType !== "weather");
        calendarGroup.classList.toggle("hidden", w.widgetType !== "calendar");

        document.querySelectorAll("#widget-style-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.style === (w.style || "digital"));
        });

        if (w.widgetType === "weather") {
            document.getElementById("widget-weather-city-input").value = w.city || "Praha";
            document.querySelectorAll("#widget-weather-unit-control .seg-btn").forEach((b) => {
                b.classList.toggle("active", b.dataset.unit === (w.tempUnit || "C"));
            });
            document.querySelectorAll("#widget-weather-cond-control .seg-btn").forEach((b) => {
                b.classList.toggle("active", b.dataset.cond === (w.weatherCondition || "partly_cloudy"));
            });
        }

        if (w.widgetType === "calendar") {
            renderAgendaEditorList(w);
        }

        document.querySelectorAll("#widget-bg-swatches .color-swatch").forEach((sw) => {
            sw.classList.toggle("active", (sw.dataset.color || "").toLowerCase() === (w.bgColor || "#101520").toLowerCase());
        });

        document.querySelectorAll("#widget-accent-swatches .color-swatch").forEach((sw) => {
            sw.classList.toggle("active", (sw.dataset.color || "").toLowerCase() === (w.accentColor || "#0A84FF").toLowerCase());
        });

        const opSlider = document.getElementById("widget-opacity-slider");
        const opVal = document.getElementById("widget-opacity-value");
        opSlider.value = String(w.opacity ?? 68);
        opVal.textContent = `${w.opacity ?? 68}%`;

        widgetConfigModal.classList.remove("hidden");
        syncWorkspaceBackdropBlur();
    }

    function renderAgendaEditorList(widget) {
        const listEl = document.getElementById("widget-agenda-list");
        if (!listEl) return;
        listEl.innerHTML = "";
        if (!Array.isArray(widget.agendaItems)) {
            widget.agendaItems = DEFAULT_AGENDA_EVENTS.map((ev) => Object.assign({}, ev));
        }

        widget.agendaItems.forEach((ev, idx) => {
            const row = document.createElement("div");
            row.className = "agenda-edit-item";
            row.innerHTML = `<span><strong>${escapeHtml(ev.time)}</strong> · ${escapeHtml(ev.title)}</span>`;
            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "agenda-del-btn";
            delBtn.textContent = "Smazat";
            delBtn.addEventListener("click", () => {
                widget.agendaItems.splice(idx, 1);
                renderAgendaEditorList(widget);
            });
            row.appendChild(delBtn);
            listEl.appendChild(row);
        });
    }

    function saveWidgetConfigModal() {
        const found = findNodeDeep(editingWidgetId);
        if (!found || found.node.type !== "widget") {
            widgetConfigModal.classList.add("hidden");
            syncWorkspaceBackdropBlur();
            return;
        }

        const w = found.node;
        const activeSizeBtn = document.querySelector("#widget-size-control .seg-btn.active");
        const activeStyleBtn = document.querySelector("#widget-style-control .seg-btn.active");
        const activeBgSw = document.querySelector("#widget-bg-swatches .color-swatch.active");
        const activeAccSw = document.querySelector("#widget-accent-swatches .color-swatch.active");
        const opSlider = document.getElementById("widget-opacity-slider");

        if (activeSizeBtn) {
            if (activeSizeBtn.dataset.size === "4x2") {
                w.colSpan = 4;
                w.rowSpan = 2;
                w.col = 0;
            } else if (activeSizeBtn.dataset.size === "1x1") {
                w.colSpan = 1;
                w.rowSpan = 1;
            } else {
                w.colSpan = 2;
                w.rowSpan = 2;
            }
        }

        if (activeStyleBtn && w.widgetType === "clock") {
            w.style = activeStyleBtn.dataset.style;
        }

        if (w.widgetType === "weather") {
            w.city = document.getElementById("widget-weather-city-input").value.trim() || "Praha";
            const activeUnitBtn = document.querySelector("#widget-weather-unit-control .seg-btn.active");
            const activeCondBtn = document.querySelector("#widget-weather-cond-control .seg-btn.active");
            w.tempUnit = activeUnitBtn ? activeUnitBtn.dataset.unit : "C";
            w.weatherCondition = activeCondBtn ? activeCondBtn.dataset.cond : "partly_cloudy";
        }

        if (activeBgSw) w.bgColor = activeBgSw.dataset.color;
        if (activeAccSw) w.accentColor = activeAccSw.dataset.color;
        w.opacity = Number(opSlider.value) || 68;

        Bridge.saveState(state);
        widgetConfigModal.classList.add("hidden");
        editingWidgetId = null;
        renderHomeScreen();
        if (!folderModal.classList.contains("hidden")) {
            renderActiveFolderModal();
        }
        showToast("Pro Widget aktualizován");
    }

    // =========================================================================
    // SYNCHRONIZACE OLED iOS SETTINGS & BENTO FOCUS CENTER
    // =========================================================================
    function syncCustomizationControls() {
        if (!state) return;
        const t = state.theme;
        const d = state.dockConfig;

        // Bento Focus Cards
        document.querySelectorAll("#focus-bento-grid .focus-bento-card").forEach((card) => {
            const isActive = card.dataset.focus === (state.focusMode || "personal");
            card.classList.toggle("active", isActive);
            const statusSpan = card.querySelector(".focus-bento-status");
            if (statusSpan) statusSpan.textContent = isActive ? "Active" : "Off";
        });

        // Search bar style
        document.querySelectorAll("#search-bar-style-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.sbar === (state.searchBarStyle || "smart_wide"));
        });

        document.querySelectorAll("#wallpaper-presets .wp-preset-item").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.wp === t.wallpaper);
        });

        document.querySelectorAll("#icon-style-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.iconStyle === t.iconStyle);
        });

        document.querySelectorAll("#icon-shape-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.shape === (t.iconShape || "squircle"));
        });

        document.querySelectorAll("#page-transition-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.trans === (t.pageTransition || "slide"));
        });

        document.querySelectorAll("#theme-accent-swatches .color-swatch").forEach((sw) => {
            sw.classList.toggle("active", (sw.dataset.color || "").toLowerCase() === (t.accentColor || "#0A84FF").toLowerCase());
        });

        const gridKey = `${state.gridCols}x${state.gridRows}`;
        document.querySelectorAll("#grid-size-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.grid === gridKey);
        });

        document.getElementById("blur-slider").value = String(t.blurStrength || 28);
        document.getElementById("blur-slider-value").textContent = `${t.blurStrength || 28}px`;

        document.getElementById("glass-slider").value = String(t.glassOpacity || 62);
        document.getElementById("glass-slider-value").textContent = `${t.glassOpacity || 62}%`;

        document.getElementById("dim-slider").value = String(t.wallpaperDim ?? 15);
        document.getElementById("dim-slider-value").textContent = `${t.wallpaperDim ?? 15}%`;

        document.getElementById("icon-scale-slider").value = String(t.iconScale || 100);
        document.getElementById("icon-scale-value").textContent = `${t.iconScale || 100}%`;

        // Dock
        document.querySelectorAll("#dock-style-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.dockStyle === (d.style || "pill"));
        });
        document.getElementById("dock-cols-slider").value = String(d.cols || 4);
        document.getElementById("dock-cols-value").textContent = String(d.cols || 4);

        document.querySelectorAll("#dock-pages-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", Number(b.dataset.dockPages) === (d.pages || 2));
        });

        document.getElementById("dock-height-slider").value = String(d.height || 84);
        document.getElementById("dock-height-value").textContent = `${d.height || 84}px`;

        document.getElementById("dock-margin-slider").value = String(d.marginBottom ?? 4);
        document.getElementById("dock-margin-value").textContent = `${d.marginBottom ?? 4}px`;

        document.getElementById("dock-radius-slider").value = String(d.cornerRadius ?? 32);
        document.getElementById("dock-radius-value").textContent = `${d.cornerRadius ?? 32}px`;

        document.getElementById("dock-blur-slider").value = String(d.blur ?? 28);
        document.getElementById("dock-blur-value").textContent = `${d.blur ?? 28}px`;

        document.getElementById("dock-icon-scale-slider").value = String(d.iconScale || 100);
        document.getElementById("dock-icon-scale-value").textContent = `${d.iconScale || 100}%`;

        document.getElementById("toggle-dock-labels").checked = !!d.showLabels;

        // App Drawer & Soubory
        document.querySelectorAll("#drawer-layout-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.dlayout === (state.drawerLayout || "grid"));
        });
        document.querySelectorAll("#drawer-cols-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", Number(b.dataset.dcols) === (state.drawerCols || 4));
        });

        document.getElementById("toggle-search-files").checked = state.searchDeviceFiles !== false;
        const fc = state.fileSearchCategories || {};
        document.getElementById("chk-cat-docs").checked = fc.docs !== false;
        document.getElementById("chk-cat-images").checked = fc.images !== false;
        document.getElementById("chk-cat-videos").checked = fc.videos !== false;
        document.getElementById("chk-cat-audio").checked = fc.audio !== false;
        document.getElementById("chk-cat-archives").checked = fc.archives !== false;

        const filePermText = document.getElementById("file-permission-status-text");
        if (filePermText) {
            filePermText.textContent = Bridge.hasFilePermissions()
                ? "Oprávnění k souborům je aktivní"
                : "Klepněte na Povolit pro vyhledávání v MediaStore";
        }

        // Popisky & Odznaky
        document.getElementById("toggle-show-labels").checked = !!t.showLabels;
        document.getElementById("label-size-slider").value = String(t.labelSize || 11.5);
        document.getElementById("label-size-value").textContent = `${t.labelSize || 11.5}px`;

        document.querySelectorAll("#label-weight-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.weight === String(t.labelWeight || "500"));
        });
        document.querySelectorAll("#label-color-swatches .color-swatch").forEach((sw) => {
            sw.classList.toggle("active", (sw.dataset.color || "").toLowerCase() === (t.labelColor || "#FFFFFF").toLowerCase());
        });
        document.getElementById("toggle-label-shadow").checked = t.labelShadow !== false;

        document.getElementById("toggle-show-badges").checked = !!t.showBadges;
        document.querySelectorAll("#badge-style-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.bstyle === (t.badgeStyle || "number"));
        });
        document.querySelectorAll("#badge-pos-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.bpos === (t.badgePosition || "top-right"));
        });
        document.querySelectorAll("#badge-color-swatches .color-swatch").forEach((sw) => {
            sw.classList.toggle("active", (sw.dataset.color || "").toLowerCase() === (t.badgeColor || "#FF453A").toLowerCase());
        });

        document.getElementById("toggle-lock-layout").checked = !!t.lockLayout;
        document.querySelectorAll("#double-tap-control .seg-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.dt === (t.doubleTapAction || "none"));
        });

        const btnGrantBadges = document.getElementById("btn-grant-badges");
        const badgeStatus = document.getElementById("badge-permission-status");
        if (systemStatus && systemStatus.notificationAccessGranted) {
            btnGrantBadges.classList.add("hidden");
            badgeStatus.textContent = "Přístup k oznámením je povolen";
        } else {
            btnGrantBadges.classList.remove("hidden");
            badgeStatus.textContent = "Volitelné: Povolte přístup pro živé počty";
        }
    }

    // =========================================================================
    // GESTA PLOCHY (SWIPE STRÁNEK, SWIPE DOCKU, SWIPE NAHORU/DOLŮ, DVOJKLIK)
    // =========================================================================
    function initWorkspaceGestures() {
        let startX = 0;
        let startY = 0;
        let currentDx = 0;
        let currentDy = 0;
        let gestureMode = null;
        let emptyHoldTimer = null;

        pagesViewport.addEventListener("pointerdown", (e) => {
            if (e.target.closest(".grid-item") || e.target.closest(".widget-card") || e.target.closest(".folder-expanded-card") || e.target.closest(".delete-page-pill")) {
                return;
            }

            startX = e.clientX;
            startY = e.clientY;
            currentDx = 0;
            currentDy = 0;
            gestureMode = "pending";

            clearTimeout(emptyHoldTimer);
            emptyHoldTimer = setTimeout(() => {
                if (gestureMode === "pending") {
                    setJiggleMode(!isJiggleMode);
                    gestureMode = null;
                }
            }, 520);
        });

        pagesViewport.addEventListener("pointermove", (e) => {
            if (!gestureMode) return;
            currentDx = e.clientX - startX;
            currentDy = e.clientY - startY;

            if (gestureMode === "pending") {
                if (Math.abs(currentDx) > 12 || Math.abs(currentDy) > 12) {
                    clearTimeout(emptyHoldTimer);
                    gestureMode = Math.abs(currentDx) >= Math.abs(currentDy) ? "horizontal" : "vertical";
                    if (gestureMode === "horizontal") {
                        pagesTrack.style.transition = "none";
                    }
                }
            }

            if (gestureMode === "horizontal") {
                updatePagesTrackTransform(currentDx * 0.92);
            }
        });

        const finishViewportGesture = () => {
            clearTimeout(emptyHoldTimer);
            if (!gestureMode) return;

            if (gestureMode === "pending") {
                const now = Date.now();
                if (now - lastEmptyTapTimestamp < 320) {
                    handleEmptyWorkspaceDoubleTap();
                    lastEmptyTapTimestamp = 0;
                } else {
                    lastEmptyTapTimestamp = now;
                    if (isJiggleMode) {
                        setJiggleMode(false);
                    }
                }
            } else if (gestureMode === "horizontal") {
                const threshold = (pagesViewport.clientWidth || 320) * 0.18;
                if (currentDx < -threshold && state.activePage < state.pages.length - 1) {
                    goToPage(state.activePage + 1);
                } else if (currentDx > threshold && state.activePage > 0) {
                    goToPage(state.activePage - 1);
                } else {
                    goToPage(state.activePage);
                }
            } else if (gestureMode === "vertical") {
                if (currentDy < -55) {
                    openAppDrawer();
                } else if (currentDy > 65) {
                    Bridge.expandStatusBar();
                }
            }

            gestureMode = null;
        };

        pagesViewport.addEventListener("pointerup", finishViewportGesture);
        pagesViewport.addEventListener("pointercancel", finishViewportGesture);

        // Vodorovný Swipe ve vícestránkovém Docku + Dlouhé podržení Docku
        let dockStartX = 0;
        let dockHoldTimer = null;
        iosDock.addEventListener("pointerdown", (e) => {
            dockStartX = e.clientX;
            if (!e.target.closest(".grid-item")) {
                dockHoldTimer = setTimeout(() => {
                    customizationSheet.classList.remove("hidden");
                    syncWorkspaceBackdropBlur();
                }, 520);
            }
        });
        iosDock.addEventListener("pointermove", (e) => {
            if (Math.abs(e.clientX - dockStartX) > 10) {
                clearTimeout(dockHoldTimer);
            }
        });
        iosDock.addEventListener("pointerup", (e) => {
            clearTimeout(dockHoldTimer);
            const dx = e.clientX - dockStartX;
            const maxPages = state.dockConfig.pages || 1;
            if (maxPages > 1 && Math.abs(dx) > 40) {
                if (dx < 0 && activeDockPage < maxPages - 1) {
                    activeDockPage++;
                    Bridge.haptic("light");
                    renderMultiPageDock();
                } else if (dx > 0 && activeDockPage > 0) {
                    activeDockPage--;
                    Bridge.haptic("light");
                    renderMultiPageDock();
                }
            }
        });
    }

    function handleEmptyWorkspaceDoubleTap() {
        const action = (state && state.theme && state.theme.doubleTapAction) || "none";
        if (action === "aod") {
            Bridge.haptic("medium");
            updateLiveWidgetsInDom();
            aodOverlay.classList.remove("hidden");
        } else if (action === "drawer") {
            openAppDrawer();
        }
    }

    // =========================================================================
    // EVENT LISTENERY PRO VŠECHNY OVLÁDACÍ PRVKY V3
    // =========================================================================
    function bindUiListeners() {
        // Jiggle Mode lišta & plovoucí + menu
        document.getElementById("btn-jiggle-plus").addEventListener("click", (e) => {
            e.stopPropagation();
            jiggleAddPopover.classList.toggle("hidden");
        });
        document.getElementById("btn-pop-add-widget").addEventListener("click", () => {
            jiggleAddPopover.classList.add("hidden");
            widgetInsertTargetFolderId = null;
            document.getElementById("widget-picker-target-hint").textContent = "Klepnutím vložíte skleněný Pro widget na plochu";
            widgetPickerModal.classList.remove("hidden");
            syncWorkspaceBackdropBlur();
        });
        document.getElementById("btn-pop-add-folder").addEventListener("click", () => {
            jiggleAddPopover.classList.add("hidden");
            openFolderCreatorModal(null);
        });
        document.getElementById("btn-pop-add-page").addEventListener("click", () => {
            jiggleAddPopover.classList.add("hidden");
            addNewPage();
        });
        document.getElementById("btn-pop-open-settings").addEventListener("click", () => {
            jiggleAddPopover.classList.add("hidden");
            syncCustomizationControls();
            customizationSheet.classList.remove("hidden");
            syncWorkspaceBackdropBlur();
        });

        document.getElementById("btn-exit-jiggle").addEventListener("click", () => setJiggleMode(false));
        document.getElementById("btn-add-page").addEventListener("click", () => addNewPage());
        document.getElementById("btn-add-widget").addEventListener("click", () => {
            widgetInsertTargetFolderId = null;
            document.getElementById("widget-picker-target-hint").textContent = "Klepnutím vložíte skleněný Pro widget na plochu";
            widgetPickerModal.classList.remove("hidden");
            syncWorkspaceBackdropBlur();
        });
        document.getElementById("btn-add-special-folder").addEventListener("click", () => {
            openFolderCreatorModal(null);
        });
        document.getElementById("btn-open-theme").addEventListener("click", () => {
            syncCustomizationControls();
            customizationSheet.classList.remove("hidden");
            syncWorkspaceBackdropBlur();
        });

        // Focus Banner přepínač
        document.getElementById("btn-focus-banner-switch").addEventListener("click", () => {
            syncCustomizationControls();
            customizationSheet.classList.remove("hidden");
            syncWorkspaceBackdropBlur();
        });

        // Smart Search Wide Bar & iOS Search Pill
        btnSearchPill.addEventListener("click", () => openAppDrawer(true));
        smartSearchWideBar.addEventListener("click", (e) => {
            if (e.target.closest("#btn-smart-bar-settings")) return;
            openAppDrawer(true);
        });
        document.getElementById("btn-smart-bar-settings").addEventListener("click", (e) => {
            e.stopPropagation();
            syncCustomizationControls();
            customizationSheet.classList.remove("hidden");
            syncWorkspaceBackdropBlur();
        });

        // App Drawer
        document.getElementById("btn-drawer-settings").addEventListener("click", () => {
            closeAppDrawer();
            syncCustomizationControls();
            customizationSheet.classList.remove("hidden");
            syncWorkspaceBackdropBlur();
        });

        drawerSearchInput.addEventListener("input", () => {
            const val = drawerSearchInput.value;
            btnClearSearch.classList.toggle("hidden", val.length === 0);
            renderAppDrawerContent(val);
        });

        btnClearSearch.addEventListener("click", () => {
            drawerSearchInput.value = "";
            btnClearSearch.classList.add("hidden");
            renderAppDrawerContent("");
        });

        btnGrantFilesInline.addEventListener("click", () => {
            Bridge.requestFilePermissions();
        });

        btnSearchWebQuery.addEventListener("click", () => {
            const q = drawerSearchInput.value.trim();
            if (q) Bridge.searchWeb(q);
        });

        document.querySelectorAll("#drawer-layout-switcher .drawer-layout-pill").forEach((pill) => {
            pill.addEventListener("click", () => {
                state.drawerLayout = pill.dataset.drawerLayout;
                Bridge.saveState(state);
                syncCustomizationControls();
                renderAppDrawerContent(drawerSearchInput.value);
            });
        });

        // Filtry kategorií souborů v App Draweru
        document.querySelectorAll("#drawer-file-filter-bar .file-filter-chip").forEach((chip) => {
            chip.addEventListener("click", () => {
                document.querySelectorAll("#drawer-file-filter-bar .file-filter-chip").forEach((c) => c.classList.remove("active"));
                chip.classList.add("active");
                activeFileFilterCat = chip.dataset.fileCat || "all";
                renderDrawerFileSearchResults(drawerSearchInput.value.trim().toLowerCase());
            });
        });

        // Zavření App Draweru swipem dolů na horní části
        let drawerTouchStartY = 0;
        appDrawer.querySelector(".drawer-header").addEventListener("pointerdown", (e) => {
            drawerTouchStartY = e.clientY;
        });
        appDrawer.querySelector(".drawer-header").addEventListener("pointerup", (e) => {
            if (e.clientY - drawerTouchStartY > 50) {
                closeAppDrawer();
            }
        });

        // Rekurzivní Modal Složky
        folderModal.addEventListener("click", (e) => {
            if (e.target === folderModal) closeFolderModal();
        });

        let folderSwipeStartX = 0;
        let folderSwipeStartY = 0;
        folderGrid.addEventListener("pointerdown", (e) => {
            folderSwipeStartX = e.clientX;
            folderSwipeStartY = e.clientY;
        });
        folderGrid.addEventListener("pointerup", (e) => {
            if (isJiggleMode || folderNavStack.length === 0) return;
            const dx = e.clientX - folderSwipeStartX;
            const dy = e.clientY - folderSwipeStartY;
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
                const currentId = folderNavStack[folderNavStack.length - 1];
                const found = findNodeDeep(currentId);
                if (!found || found.node.type !== "folder") return;
                const totalPages = Math.max(1, Math.ceil(getEffectiveFolderChildren(found.node).length / 9));
                if (totalPages > 1) {
                    if (dx < 0 && activeFolderModalPage < totalPages - 1) {
                        activeFolderModalPage++;
                        Bridge.haptic("light");
                        renderActiveFolderModal();
                    } else if (dx > 0 && activeFolderModalPage > 0) {
                        activeFolderModalPage--;
                        Bridge.haptic("light");
                        renderActiveFolderModal();
                    }
                }
            }
        });

        folderTitleInput.addEventListener("change", () => {
            if (folderNavStack.length === 0) return;
            const currentId = folderNavStack[folderNavStack.length - 1];
            const found = findNodeDeep(currentId);
            if (found && found.node.type === "folder") {
                found.node.title = folderTitleInput.value.trim() || "Složka";
                Bridge.saveState(state);
                renderHomeScreen();
                renderActiveFolderModal();
            }
        });

        if (btnClearFolderTitle) {
            btnClearFolderTitle.addEventListener("click", () => {
                folderTitleInput.value = "";
                folderTitleInput.focus();
            });
        }

        document.getElementById("btn-folder-add-subfolder").addEventListener("click", () => {
            if (folderNavStack.length === 0) return;
            openFolderCreatorModal(folderNavStack[folderNavStack.length - 1]);
        });

        document.getElementById("btn-folder-add-widget").addEventListener("click", () => {
            if (folderNavStack.length === 0) return;
            widgetInsertTargetFolderId = folderNavStack[folderNavStack.length - 1];
            document.getElementById("widget-picker-target-hint").textContent = "Vyberte Pro widget pro vložení přímo do této složky";
            widgetPickerModal.classList.remove("hidden");
            syncWorkspaceBackdropBlur();
        });

        document.getElementById("btn-folder-add-app").addEventListener("click", () => {
            openFolderAppPicker();
        });

        document.getElementById("btn-folder-size-cycle").addEventListener("click", () => {
            if (folderNavStack.length === 0) return;
            const currentId = folderNavStack[0];
            const found = findNodeDeep(currentId);
            if (!found || found.node.type !== "folder" || found.pageIndex < 0) {
                showToast("Velikost lze měnit u kořenové složky na ploše");
                return;
            }
            const nextSize = found.node.folderSize === "2x2" ? "1x1" : "2x2";
            resizeFolderOnWorkspace(currentId, nextSize);
        });

        // Quick Action Menu
        quickActionOverlay.addEventListener("click", (e) => {
            if (e.target === quickActionOverlay) closeQuickActionMenu();
        });

        document.querySelectorAll("#qa-folder-size-box .qa-size-pill").forEach((pill) => {
            pill.addEventListener("click", () => {
                if (!quickActionTarget) return;
                const fId = quickActionTarget.nodeId;
                closeQuickActionMenu();
                resizeFolderOnWorkspace(fId, pill.dataset.fsize);
            });
        });

        document.getElementById("qa-btn-enlarge-toggle").addEventListener("click", () => {
            if (!quickActionTarget) return;
            const found = findNodeDeep(quickActionTarget.nodeId);
            if (!found || found.node.type !== "folder") return;
            const targetSize = found.node.folderSize === "2x2" ? "1x1" : "2x2";
            const fId = found.node.id;
            closeQuickActionMenu();
            resizeFolderOnWorkspace(fId, targetSize);
        });

        document.getElementById("qa-btn-rename-folder").addEventListener("click", () => {
            if (!quickActionTarget) return;
            const fId = quickActionTarget.nodeId;
            closeQuickActionMenu();
            requestOpenFolder(fId, false);
            setTimeout(() => {
                try {
                    folderTitleInput.focus();
                    folderTitleInput.select();
                } catch (_) {}
            }, 120);
        });

        document.getElementById("qa-btn-folder-add-child").addEventListener("click", () => {
            if (!quickActionTarget) return;
            const fId = quickActionTarget.nodeId;
            closeQuickActionMenu();
            requestOpenFolder(fId, false);
        });

        document.getElementById("qa-btn-lock-folder").addEventListener("click", () => {
            if (!quickActionTarget) return;
            const found = findNodeDeep(quickActionTarget.nodeId);
            if (found && found.node.type === "folder") {
                found.node.folderKind = found.node.folderKind === "vault" ? "standard" : "vault";
                if (!found.node.pinCode) found.node.pinCode = "1234";
                Bridge.saveState(state);
                renderHomeScreen();
                showToast(found.node.folderKind === "vault" ? "Složka uzamčena PINem (1234)" : "Zámek složky zrušen");
            }
            closeQuickActionMenu();
        });

        document.getElementById("qa-btn-edit").addEventListener("click", () => {
            closeQuickActionMenu();
            setJiggleMode(true);
        });

        document.getElementById("qa-btn-per-item").addEventListener("click", () => {
            if (!quickActionTarget) return;
            const targetId = quickActionTarget.nodeId;
            closeQuickActionMenu();
            openPerItemEditor(targetId);
        });

        document.getElementById("qa-btn-create-folder").addEventListener("click", () => {
            if (!quickActionTarget) return;
            const found = findNodeDeep(quickActionTarget.nodeId);
            if (found && found.node.type === "app") {
                const appClone = Object.assign({}, found.node, { id: uid("app") });
                const folderNode = {
                    id: uid("folder"),
                    type: "folder",
                    title: "Složka",
                    col: found.node.col || 0,
                    row: found.node.row || 0,
                    colSpan: 1,
                    rowSpan: 1,
                    folderSize: "1x1",
                    folderKind: "standard",
                    smartRule: "games_media",
                    smartKeyword: "",
                    pinCode: "1234",
                    fileCategory: "all",
                    children: [appClone],
                    customStyle: createDefaultCustomStyle()
                };
                found.parentList[found.index] = folderNode;
                Bridge.saveState(state);
                renderHomeScreen();
                if (!folderModal.classList.contains("hidden")) {
                    renderActiveFolderModal();
                }
                showToast("Položka zabalena do složky");
            }
            closeQuickActionMenu();
        });

        document.getElementById("qa-btn-info").addEventListener("click", () => {
            if (quickActionTarget) {
                const found = findNodeDeep(quickActionTarget.nodeId);
                if (found && found.node.packageName) {
                    Bridge.openAppInfo(found.node.packageName);
                }
            }
            closeQuickActionMenu();
        });

        document.getElementById("qa-btn-remove").addEventListener("click", () => {
            if (quickActionTarget) {
                removeItemWithConfirmation(quickActionTarget.nodeId);
            }
            closeQuickActionMenu();
        });

        document.getElementById("qa-btn-uninstall").addEventListener("click", () => {
            if (quickActionTarget) {
                const found = findNodeDeep(quickActionTarget.nodeId);
                if (found && found.node.packageName) {
                    Bridge.uninstallApp(found.node.packageName);
                }
            }
            closeQuickActionMenu();
        });

        // Folder Creator Modal
        document.getElementById("btn-close-folder-creator").addEventListener("click", () => {
            folderCreatorModal.classList.add("hidden");
            syncWorkspaceBackdropBlur();
        });
        document.querySelectorAll("#new-folder-kind-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#new-folder-kind-control .seg-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                const fk = btn.dataset.fkind;
                document.getElementById("smart-folder-options").classList.toggle("hidden", fk !== "smart");
                document.getElementById("vault-folder-options").classList.toggle("hidden", fk !== "vault");
                document.getElementById("file-folder-options").classList.toggle("hidden", fk !== "files");
            });
        });
        document.querySelectorAll("#new-folder-size-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#new-folder-size-control .seg-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
            });
        });
        document.querySelectorAll("#smart-folder-rule-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#smart-folder-rule-control .seg-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                document.getElementById("smart-keyword-box").classList.toggle("hidden", btn.dataset.srule !== "keyword");
            });
        });
        document.querySelectorAll("#file-folder-cat-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#file-folder-cat-control .seg-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
            });
        });
        document.getElementById("btn-create-folder-confirm").addEventListener("click", confirmCreateSpecialOrNestedFolder);

        // Folder App Picker
        document.getElementById("btn-close-folder-app-picker").addEventListener("click", () => {
            folderAppPickerModal.classList.add("hidden");
            syncWorkspaceBackdropBlur();
        });
        document.getElementById("folder-app-picker-search").addEventListener("input", (e) => {
            renderFolderAppPickerList(e.target.value);
        });

        // PIN Vault Keypad
        document.querySelectorAll("#pin-vault-modal .pin-key[data-digit]").forEach((key) => {
            key.addEventListener("click", () => handlePinDigitPress(key.dataset.digit));
        });
        document.getElementById("btn-pin-backspace").addEventListener("click", () => {
            enteredPinDigits = enteredPinDigits.slice(0, -1);
            updatePinDotsUi();
        });
        document.getElementById("btn-pin-cancel").addEventListener("click", () => {
            pinVaultModal.classList.add("hidden");
            pendingPinCallback = null;
            syncWorkspaceBackdropBlur();
        });

        // Per-Item Editor
        document.getElementById("btn-close-per-item").addEventListener("click", () => {
            perItemEditorModal.classList.add("hidden");
            syncWorkspaceBackdropBlur();
        });
        document.querySelectorAll("#per-item-emoji-picks .emoji-chip").forEach((chip) => {
            chip.addEventListener("click", () => {
                document.getElementById("per-item-emoji-input").value = chip.dataset.emoji || "";
            });
        });
        document.getElementById("per-item-scale-slider").addEventListener("input", (e) => {
            document.getElementById("per-item-scale-value").textContent = e.target.value + "%";
        });
        document.querySelectorAll("#per-item-bg-swatches .color-swatch").forEach((sw) => {
            sw.addEventListener("click", () => {
                document.querySelectorAll("#per-item-bg-swatches .color-swatch").forEach((s) => s.classList.remove("active"));
                sw.classList.add("active");
            });
        });
        document.querySelectorAll("#per-item-border-swatches .color-swatch").forEach((sw) => {
            sw.addEventListener("click", () => {
                document.querySelectorAll("#per-item-border-swatches .color-swatch").forEach((s) => s.classList.remove("active"));
                sw.classList.add("active");
            });
        });
        document.getElementById("btn-reset-per-item").addEventListener("click", () => {
            const found = findNodeDeep(editingPerItemId);
            if (found) {
                found.node.customStyle = createDefaultCustomStyle();
                Bridge.saveState(state);
                perItemEditorModal.classList.add("hidden");
                renderHomeScreen();
                if (!folderModal.classList.contains("hidden")) renderActiveFolderModal();
                showToast("Vzhled položky resetován");
            }
        });
        document.getElementById("btn-save-per-item").addEventListener("click", savePerItemEditor);

        // Katalog Pro Widgetů
        document.getElementById("btn-close-widget-picker").addEventListener("click", () => {
            widgetPickerModal.classList.add("hidden");
            syncWorkspaceBackdropBlur();
        });
        document.querySelectorAll(".widget-preview-card").forEach((card) => {
            card.addEventListener("click", () => {
                const wType = card.dataset.widgetType;
                const cSpan = parseInt(card.dataset.colSpan, 10) || 2;
                const rSpan = parseInt(card.dataset.rowSpan, 10) || 2;
                const cStyle = card.dataset.clockStyle || null;
                addProWidget(wType, cSpan, rSpan, widgetInsertTargetFolderId, cStyle);
            });
        });

        // Per-Widget Studio
        document.getElementById("btn-close-widget-config").addEventListener("click", () => {
            widgetConfigModal.classList.add("hidden");
            editingWidgetId = null;
            syncWorkspaceBackdropBlur();
        });
        document.querySelectorAll("#widget-size-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#widget-size-control .seg-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
            });
        });
        document.querySelectorAll("#widget-style-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#widget-style-control .seg-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
            });
        });
        document.querySelectorAll("#widget-weather-unit-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#widget-weather-unit-control .seg-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
            });
        });
        document.querySelectorAll("#widget-weather-cond-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#widget-weather-cond-control .seg-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
            });
        });
        document.getElementById("btn-add-agenda-item").addEventListener("click", () => {
            const found = findNodeDeep(editingWidgetId);
            if (!found || found.node.type !== "widget") return;
            const titleIn = document.getElementById("agenda-new-title-input");
            const timeIn = document.getElementById("agenda-new-time-input");
            const title = titleIn.value.trim();
            const time = timeIn.value.trim() || "Celý den";
            if (!title) return;
            const colors = ["#0A84FF", "#30D158", "#BF5AF2", "#FF9F0A", "#FF375F"];
            if (!Array.isArray(found.node.agendaItems)) found.node.agendaItems = [];
            found.node.agendaItems.push({
                id: uid("ev"),
                title,
                time,
                color: colors[found.node.agendaItems.length % colors.length]
            });
            titleIn.value = "";
            renderAgendaEditorList(found.node);
        });
        document.querySelectorAll("#widget-bg-swatches .color-swatch").forEach((sw) => {
            sw.addEventListener("click", () => {
                document.querySelectorAll("#widget-bg-swatches .color-swatch").forEach((s) => s.classList.remove("active"));
                sw.classList.add("active");
            });
        });
        document.querySelectorAll("#widget-accent-swatches .color-swatch").forEach((sw) => {
            sw.addEventListener("click", () => {
                document.querySelectorAll("#widget-accent-swatches .color-swatch").forEach((s) => s.classList.remove("active"));
                sw.classList.add("active");
            });
        });
        document.getElementById("widget-opacity-slider").addEventListener("input", (e) => {
            document.getElementById("widget-opacity-value").textContent = `${e.target.value}%`;
        });
        document.getElementById("btn-save-widget-config").addEventListener("click", saveWidgetConfigModal);

        // =====================================================================
        // OLED iOS 18 SETTINGS & FOCUS CENTER LISTENERY
        // =====================================================================
        document.getElementById("btn-close-customization").addEventListener("click", () => {
            customizationSheet.classList.add("hidden");
            syncWorkspaceBackdropBlur();
        });
        document.getElementById("btn-cancel-customization").addEventListener("click", () => {
            customizationSheet.classList.add("hidden");
            syncWorkspaceBackdropBlur();
        });
        customizationSheet.addEventListener("click", (e) => {
            if (e.target === customizationSheet) {
                customizationSheet.classList.add("hidden");
                syncWorkspaceBackdropBlur();
            }
        });

        // Bento Focus Cards
        document.querySelectorAll("#focus-bento-grid .focus-bento-card").forEach((card) => {
            card.addEventListener("click", () => {
                Bridge.haptic("medium");
                state.focusMode = card.dataset.focus || "personal";
                if (state.focusMode === "work" && state.pages.length > 1) {
                    state.activePage = 1;
                } else if (state.focusMode === "minimal") {
                    state.activePage = 0;
                }
                Bridge.saveState(state);
                applyThemeAndSettings();
                renderHomeScreen();
                showToast(`Aktivován režim: ${card.dataset.focus.toUpperCase()}`);
            });
        });

        // Search Bar Style
        document.querySelectorAll("#search-bar-style-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.searchBarStyle = btn.dataset.sbar || "smart_wide";
                Bridge.saveState(state);
                applyThemeAndSettings();
            });
        });

        // Tapety & Mód ikon
        document.querySelectorAll("#wallpaper-presets .wp-preset-item").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.theme.wallpaper = btn.dataset.wp;
                Bridge.saveState(state);
                applyThemeAndSettings();
            });
        });
        document.getElementById("btn-pick-custom-wallpaper").addEventListener("click", () => {
            Bridge.openWallpaperPicker();
        });

        document.querySelectorAll("#icon-style-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.theme.iconStyle = btn.dataset.iconStyle;
                Bridge.saveState(state);
                applyThemeAndSettings();
            });
        });

        document.querySelectorAll("#icon-shape-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.theme.iconShape = btn.dataset.shape;
                Bridge.saveState(state);
                applyThemeAndSettings();
            });
        });

        document.querySelectorAll("#page-transition-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.theme.pageTransition = btn.dataset.trans;
                Bridge.saveState(state);
                applyThemeAndSettings();
                updatePagesTrackTransform(0);
            });
        });

        document.querySelectorAll("#theme-accent-swatches .color-swatch").forEach((sw) => {
            sw.addEventListener("click", () => {
                state.theme.accentColor = sw.dataset.color;
                Bridge.saveState(state);
                applyThemeAndSettings();
            });
        });

        document.querySelectorAll("#grid-size-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const [c, r] = btn.dataset.grid.split("x").map(Number);
                state.gridCols = c;
                state.gridRows = r;
                runSelfHealingValidator(state);
                Bridge.saveState(state);
                applyThemeAndSettings();
                renderHomeScreen();
            });
        });

        document.getElementById("blur-slider").addEventListener("input", (e) => {
            state.theme.blurStrength = Number(e.target.value);
            applyThemeAndSettings();
        });
        document.getElementById("blur-slider").addEventListener("change", () => Bridge.saveState(state));

        document.getElementById("glass-slider").addEventListener("input", (e) => {
            state.theme.glassOpacity = Number(e.target.value);
            applyThemeAndSettings();
        });
        document.getElementById("glass-slider").addEventListener("change", () => Bridge.saveState(state));

        document.getElementById("dim-slider").addEventListener("input", (e) => {
            state.theme.wallpaperDim = Number(e.target.value);
            applyThemeAndSettings();
        });
        document.getElementById("dim-slider").addEventListener("change", () => Bridge.saveState(state));

        document.getElementById("icon-scale-slider").addEventListener("input", (e) => {
            state.theme.iconScale = Number(e.target.value);
            applyThemeAndSettings();
        });
        document.getElementById("icon-scale-slider").addEventListener("change", () => Bridge.saveState(state));

        // Nastavení Docku
        document.querySelectorAll("#dock-style-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.dockConfig.style = btn.dataset.dockStyle;
                Bridge.saveState(state);
                applyThemeAndSettings();
            });
        });

        document.getElementById("dock-cols-slider").addEventListener("input", (e) => {
            state.dockConfig.cols = Number(e.target.value);
            applyThemeAndSettings();
            renderMultiPageDock();
        });
        document.getElementById("dock-cols-slider").addEventListener("change", () => Bridge.saveState(state));

        document.querySelectorAll("#dock-pages-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.dockConfig.pages = Number(btn.dataset.dockPages) || 1;
                Bridge.saveState(state);
                applyThemeAndSettings();
                renderMultiPageDock();
            });
        });

        document.getElementById("dock-height-slider").addEventListener("input", (e) => {
            state.dockConfig.height = Number(e.target.value);
            applyThemeAndSettings();
        });
        document.getElementById("dock-height-slider").addEventListener("change", () => Bridge.saveState(state));

        document.getElementById("dock-margin-slider").addEventListener("input", (e) => {
            state.dockConfig.marginBottom = Number(e.target.value);
            applyThemeAndSettings();
        });
        document.getElementById("dock-margin-slider").addEventListener("change", () => Bridge.saveState(state));

        document.getElementById("dock-radius-slider").addEventListener("input", (e) => {
            state.dockConfig.cornerRadius = Number(e.target.value);
            applyThemeAndSettings();
        });
        document.getElementById("dock-radius-slider").addEventListener("change", () => Bridge.saveState(state));

        document.getElementById("dock-blur-slider").addEventListener("input", (e) => {
            state.dockConfig.blur = Number(e.target.value);
            applyThemeAndSettings();
        });
        document.getElementById("dock-blur-slider").addEventListener("change", () => Bridge.saveState(state));

        document.getElementById("dock-icon-scale-slider").addEventListener("input", (e) => {
            state.dockConfig.iconScale = Number(e.target.value);
            applyThemeAndSettings();
        });
        document.getElementById("dock-icon-scale-slider").addEventListener("change", () => Bridge.saveState(state));

        document.getElementById("toggle-dock-labels").addEventListener("change", (e) => {
            state.dockConfig.showLabels = e.target.checked;
            Bridge.saveState(state);
            applyThemeAndSettings();
        });

        // Nastavení App Draweru & Souborů
        document.querySelectorAll("#drawer-layout-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.drawerLayout = btn.dataset.dlayout;
                Bridge.saveState(state);
                syncCustomizationControls();
            });
        });

        document.querySelectorAll("#drawer-cols-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.drawerCols = Number(btn.dataset.dcols) || 4;
                Bridge.saveState(state);
                applyThemeAndSettings();
            });
        });

        document.getElementById("toggle-search-files").addEventListener("change", (e) => {
            state.searchDeviceFiles = e.target.checked;
            Bridge.saveState(state);
        });

        document.getElementById("btn-request-file-perm").addEventListener("click", () => {
            Bridge.requestFilePermissions();
        });

        const updateFileCatCheck = () => {
            state.fileSearchCategories = {
                docs: document.getElementById("chk-cat-docs").checked,
                images: document.getElementById("chk-cat-images").checked,
                videos: document.getElementById("chk-cat-videos").checked,
                audio: document.getElementById("chk-cat-audio").checked,
                archives: document.getElementById("chk-cat-archives").checked
            };
            Bridge.saveState(state);
        };
        ["chk-cat-docs", "chk-cat-images", "chk-cat-videos", "chk-cat-audio", "chk-cat-archives"].forEach((id) => {
            document.getElementById(id).addEventListener("change", updateFileCatCheck);
        });

        // Popisky & Odznaky
        document.getElementById("toggle-show-labels").addEventListener("change", (e) => {
            state.theme.showLabels = e.target.checked;
            Bridge.saveState(state);
            applyThemeAndSettings();
        });

        document.getElementById("label-size-slider").addEventListener("input", (e) => {
            state.theme.labelSize = Number(e.target.value);
            applyThemeAndSettings();
        });
        document.getElementById("label-size-slider").addEventListener("change", () => Bridge.saveState(state));

        document.querySelectorAll("#label-weight-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.theme.labelWeight = btn.dataset.weight;
                Bridge.saveState(state);
                applyThemeAndSettings();
            });
        });

        document.querySelectorAll("#label-color-swatches .color-swatch").forEach((sw) => {
            sw.addEventListener("click", () => {
                state.theme.labelColor = sw.dataset.color;
                Bridge.saveState(state);
                applyThemeAndSettings();
            });
        });

        document.getElementById("toggle-label-shadow").addEventListener("change", (e) => {
            state.theme.labelShadow = e.target.checked;
            Bridge.saveState(state);
            applyThemeAndSettings();
        });

        document.getElementById("toggle-show-badges").addEventListener("change", (e) => {
            state.theme.showBadges = e.target.checked;
            Bridge.saveState(state);
            applyThemeAndSettings();
            renderHomeScreen();
        });

        document.querySelectorAll("#badge-style-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.theme.badgeStyle = btn.dataset.bstyle;
                Bridge.saveState(state);
                applyThemeAndSettings();
            });
        });

        document.querySelectorAll("#badge-pos-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.theme.badgePosition = btn.dataset.bpos;
                Bridge.saveState(state);
                applyThemeAndSettings();
            });
        });

        document.querySelectorAll("#badge-color-swatches .color-swatch").forEach((sw) => {
            sw.addEventListener("click", () => {
                state.theme.badgeColor = sw.dataset.color;
                Bridge.saveState(state);
                applyThemeAndSettings();
            });
        });

        document.getElementById("btn-grant-badges").addEventListener("click", () => {
            Bridge.openNotificationSettings();
        });

        document.getElementById("toggle-lock-layout").addEventListener("change", (e) => {
            state.theme.lockLayout = e.target.checked;
            if (state.theme.lockLayout && isJiggleMode) {
                setJiggleMode(false);
            }
            Bridge.saveState(state);
        });

        document.querySelectorAll("#double-tap-control .seg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.theme.doubleTapAction = btn.dataset.dt;
                Bridge.saveState(state);
                syncCustomizationControls();
            });
        });

        // Záloha a obnovení V3 stavu
        document.getElementById("btn-export-backup").addEventListener("click", () => {
            const jsonStr = JSON.stringify(state, null, 2);
            try {
                const blob = new Blob([jsonStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "ios_hybrid_launcher_v3_backup.json";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast("Export zálohy V3 dokončen");
            } catch (_) {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(jsonStr);
                    showToast("JSON záloha zkopírována do schránky");
                }
            }
        });

        const backupFileInput = document.getElementById("backup-file-input");
        document.getElementById("btn-import-backup").addEventListener("click", () => {
            backupFileInput.click();
        });

        backupFileInput.addEventListener("change", (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parsed = JSON.parse(String(reader.result));
                    runSelfHealingValidator(parsed);
                    Bridge.saveState(state);
                    applyThemeAndSettings();
                    renderHomeScreen();
                    customizationSheet.classList.add("hidden");
                    syncWorkspaceBackdropBlur();
                    showToast("Záloha úspěšně obnovena");
                } catch (_) {
                    showToast("Neplatný soubor zálohy");
                }
            };
            reader.readAsText(file);
        });

        document.getElementById("btn-reset-default-layout").addEventListener("click", () => {
            state = buildInitialDefaultStateV3();
            Bridge.saveState(state);
            applyThemeAndSettings();
            renderHomeScreen();
            customizationSheet.classList.add("hidden");
            syncWorkspaceBackdropBlur();
            showToast("Obnoveno výchozí V3 uspořádání");
        });

        aodOverlay.addEventListener("click", () => {
            aodOverlay.classList.add("hidden");
        });
    }

    // =========================================================================
    // GLOBÁLNÍ CALLBACKY VOLANÉ Z NATIVNÍHO KOTLINU
    // =========================================================================
    window.onNativeAppsUpdated = function (appsArray) {
        rebuildAppMap(appsArray);
        renderHomeScreen();
        if (!appDrawer.classList.contains("hidden")) {
            renderAppDrawerContent(drawerSearchInput.value);
        }
    };

    window.onNativeBatteryUpdated = function (batteryObj) {
        if (!systemStatus) systemStatus = {};
        systemStatus.battery = batteryObj;
        renderHomeScreen();
    };

    window.onNativeBadgesUpdated = function (badgesMap, accessGranted) {
        if (!systemStatus) systemStatus = {};
        systemStatus.badges = badgesMap || {};
        systemStatus.notificationAccessGranted = !!accessGranted;
        syncCustomizationControls();
        renderHomeScreen();
    };

    window.onCustomWallpaperSelected = function () {
        if (!systemStatus) systemStatus = {};
        systemStatus.hasCustomWallpaper = true;
        state.theme.wallpaper = "custom";
        Bridge.saveState(state);
        applyThemeAndSettings();
        showToast("Vlastní tapeta z galerie nastavena");
    };

    window.onFilePermissionResult = function (granted) {
        if (!systemStatus) systemStatus = {};
        systemStatus.fileAccessGranted = !!granted;
        syncCustomizationControls();
        if (!appDrawer.classList.contains("hidden")) {
            renderDrawerFileSearchResults(drawerSearchInput.value.trim().toLowerCase());
        }
        if (!folderModal.classList.contains("hidden")) {
            renderActiveFolderModal();
        }
        showToast(granted ? "Přístup k souborům povolen" : "Přístup k souborům nebyl udělen");
    };

    window.onLauncherResumed = function () {
        const latest = Bridge.getSystemStatus();
        if (latest) {
            systemStatus = latest;
            syncCustomizationControls();
            renderHomeScreen();
        }
    };

    window.onAndroidBackPressed = function () {
        if (!pinVaultModal.classList.contains("hidden")) {
            pinVaultModal.classList.add("hidden");
            pendingPinCallback = null;
            syncWorkspaceBackdropBlur();
            return;
        }
        if (!perItemEditorModal.classList.contains("hidden")) {
            perItemEditorModal.classList.add("hidden");
            syncWorkspaceBackdropBlur();
            return;
        }
        if (!folderAppPickerModal.classList.contains("hidden")) {
            folderAppPickerModal.classList.add("hidden");
            syncWorkspaceBackdropBlur();
            return;
        }
        if (!folderCreatorModal.classList.contains("hidden")) {
            folderCreatorModal.classList.add("hidden");
            syncWorkspaceBackdropBlur();
            return;
        }
        if (!quickActionOverlay.classList.contains("hidden")) {
            closeQuickActionMenu();
            return;
        }
        if (!widgetConfigModal.classList.contains("hidden")) {
            widgetConfigModal.classList.add("hidden");
            editingWidgetId = null;
            syncWorkspaceBackdropBlur();
            return;
        }
        if (!widgetPickerModal.classList.contains("hidden")) {
            widgetPickerModal.classList.add("hidden");
            syncWorkspaceBackdropBlur();
            return;
        }
        if (!customizationSheet.classList.contains("hidden")) {
            customizationSheet.classList.add("hidden");
            syncWorkspaceBackdropBlur();
            return;
        }
        if (!folderModal.classList.contains("hidden")) {
            if (folderNavStack.length > 1) {
                folderNavStack.pop();
                renderActiveFolderModal();
            } else {
                closeFolderModal();
            }
            return;
        }
        if (!appDrawer.classList.contains("hidden")) {
            closeAppDrawer();
            return;
        }
        if (!aodOverlay.classList.contains("hidden")) {
            aodOverlay.classList.add("hidden");
            return;
        }
        if (isJiggleMode) {
            setJiggleMode(false);
            return;
        }
        if (state.activePage > 0) {
            goToPage(0);
        }
    };

    window.onAndroidHomePressed = function () {
        pinVaultModal.classList.add("hidden");
        pendingPinCallback = null;
        perItemEditorModal.classList.add("hidden");
        folderAppPickerModal.classList.add("hidden");
        folderCreatorModal.classList.add("hidden");
        closeQuickActionMenu();
        widgetConfigModal.classList.add("hidden");
        editingWidgetId = null;
        widgetPickerModal.classList.add("hidden");
        customizationSheet.classList.add("hidden");
        closeFolderModal();
        closeAppDrawer();
        aodOverlay.classList.add("hidden");
        if (isJiggleMode) {
            setJiggleMode(false);
        }
        syncWorkspaceBackdropBlur();
        if (state && state.activePage !== 0) {
            goToPage(0);
        }
    };

    window.addEventListener("resize", () => {
        updatePagesTrackTransform(0);
        renderMultiPageDock();
    });

    // =========================================================================
    // INICIALIZACE LAUNCHERU PRO V3 (MIGRACE V1/V2 -> V3 & SELF-HEALING)
    // =========================================================================
    function initLauncherV3() {
        const apps = Bridge.getInstalledApps();
        rebuildAppMap(apps);

        const status = Bridge.getSystemStatus();
        if (status) {
            systemStatus = status;
        }

        const saved = Bridge.loadState();
        if (saved && Array.isArray(saved.pages) && saved.pages.length > 0) {
            runSelfHealingValidator(saved);
        } else {
            state = buildInitialDefaultStateV3();
        }

        Bridge.saveState(state);
        applyThemeAndSettings();
        renderHomeScreen();
        initWorkspaceGestures();
        bindUiListeners();

        if (clockIntervalId) clearInterval(clockIntervalId);
        clockIntervalId = setInterval(() => {
            updateLiveWidgetsInDom();
        }, 1000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initLauncherV3);
    } else {
        initLauncherV3();
    }
})();
