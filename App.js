import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, BackHandler, Linking, Animated, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const TRANSLATIONS = {
  ru: {
    langTitle: "ВЫБЕРИТЕ ЯЗЫК",
    start: "НАЧАТЬ",
    exit: "ВЫЙТИ",
    infoTitle: "ДЛЯ ЧЕГО ЭТО?",
    infoDisclaimer: "⚠️ Дисклеймер: Я не являюсь автором оригинальных модов. Это приложение создано исключительно для удобства, чтобы убрать рамки браузера и дать вам чистый тактический интерфейс.",
    infoServer: "Важно: Для работы требуется запущенный сервер",
    getDesktop: "Скачать Pulse Pad (ПК)",
    nextCam: "ДАЛЕЕ (К КАМЕРЕ)",
    scanPulse: "СКАНИРУЙТЕ QR-КОД ВО ВКЛАДКЕ 'PZ PULSE'",
    scanMap: "СКАНИРУЙТЕ QR-КОД ВО ВКЛАДКЕ 'PZ MAP'",
    pulseScanned: "PULSE УСПЕШНО ОТСКАНИРОВАН",
    nextScanMap: "Теперь откройте вкладку 'PZ Map' в программе на ПК и отсканируйте второй QR-код.",
    scanNext: "СКАНИРОВАТЬ КАРТУ",
    skip: "ПРОПУСТИТЬ",
    cancel: "ОТМЕНА",
    settings: "НАСТРОЙКИ",
    rescanPulse: "ОБНОВИТЬ QR (PULSE)",
    rescanMap: "ОБНОВИТЬ QR (MAP)",
    reset: "СБРОСИТЬ ВСЕ ДАННЫЕ",
    camDenied: "Доступ к камере заблокирован.",
    grantAccess: "ДАТЬ ДОСТУП",
    invalidQr: "Ошибка: Отсканирован чужой QR-код. Откройте Pulse Pad на ПК."
  },
  ua: {
    langTitle: "ОБЕРІТЬ МОВУ",
    start: "ПОЧАТИ",
    exit: "ВИЙТИ",
    infoTitle: "ДЛЯ ЧОГО ЦЕ?",
    infoDisclaimer: "⚠️ Дисклеймер: Я не є автором оригінальних модів. Цей додаток створено виключно для зручності, щоб прибрати рамки браузера та надати чистий тактичний інтерфейс.",
    infoServer: "Важливо: Для роботи потрібен запущений сервер",
    getDesktop: "Завантажити Pulse Pad (ПК)",
    nextCam: "ДАЛІ (ДО КАМЕРИ)",
    scanPulse: "СКАНУЙТЕ QR-КОД У ВКЛАДЦІ 'PZ PULSE'",
    scanMap: "СКАНУЙТЕ QR-КОД У ВКЛАДЦІ 'PZ MAP'",
    pulseScanned: "PULSE УСПІШНО ВІДСКАНОВАНО",
    nextScanMap: "Тепер відкрийте вкладку 'PZ Map' у програмі на ПК та відскануйте другий QR-код.",
    scanNext: "СКАНУВАТИ МАПУ",
    skip: "ПРОПУСТИТИ",
    cancel: "СКАСУВАТИ",
    settings: "НАЛАШТУВАННЯ",
    rescanPulse: "ОНОВИТИ QR (PULSE)",
    rescanMap: "ОНОВИТИ QR (MAP)",
    reset: "СКИДАННЯ ДАНИХ",
    camDenied: "Доступ до камери заблоковано.",
    grantAccess: "ДАТИ ДОСТУП",
    invalidQr: "Помилка: Відскановано чужий QR-код. Відкрийте Pulse Pad на ПК."
  },
  en: {
    langTitle: "SELECT LANGUAGE",
    start: "START",
    exit: "EXIT",
    infoTitle: "WHAT IS THIS?",
    infoDisclaimer: "⚠️ Disclaimer: I am not the author of the original mods. This app is made strictly for convenience to remove browser borders and provide a clean tactical UI.",
    infoServer: "Important: Requires the desktop server running",
    getDesktop: "Download Pulse Pad (PC)",
    nextCam: "NEXT (TO CAMERA)",
    scanPulse: "SCAN THE QR CODE IN THE 'PZ PULSE' TAB",
    scanMap: "SCAN THE QR CODE IN THE 'PZ MAP' TAB",
    pulseScanned: "PULSE SCANNED SUCCESSFULLY",
    nextScanMap: "Now open the 'PZ Map' tab in the PC app and scan the second QR code.",
    scanNext: "SCAN MAP",
    skip: "SKIP",
    cancel: "CANCEL",
    settings: "SETTINGS",
    rescanPulse: "RESCAN QR (PULSE)",
    rescanMap: "RESCAN QR (MAP)",
    reset: "RESET ALL DATA",
    camDenied: "Camera access is denied.",
    grantAccess: "GRANT ACCESS",
    invalidQr: "Error: Invalid QR code. Please scan from the Pulse Pad PC app."
  }
};

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [appState, setAppState] = useState('LOADING'); 
  const [urls, setUrls] = useState({ pulse: null, map: null });
  const [zoom, setZoom] = useState(1.0);
  const [lang, setLang] = useState('en');
  const [controlsVisible, setControlsVisible] = useState(true);
  
  const webviewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef(null);
  const scanLock = useRef(false);
  
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (appState === 'VIEW_PULSE' || appState === 'VIEW_MAP') {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
  }, [appState]);

  useEffect(() => {
    const initApp = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('appLang');
        const savedPulse = await AsyncStorage.getItem('pulseUrl');
        const savedMap = await AsyncStorage.getItem('mapUrl');
        const savedZoom = await AsyncStorage.getItem('appZoom');
        
        if (savedLang) setLang(savedLang);
        if (savedZoom) setZoom(parseFloat(savedZoom));
        setUrls({ pulse: savedPulse, map: savedMap });

        if (!savedLang) {
          setAppState('LANG_SELECT');
        } else if (!savedPulse && !savedMap) {
          setAppState('ONBOARDING_START');
        } else {
          setAppState('HOME');
        }
        
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      } catch (e) {
        console.error(e);
      }
    };
    initApp();
  }, []);

  const triggerControls = () => {
    setControlsVisible(true);
    Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    
    if (hideTimer.current) clearTimeout(hideTimer.current);
    
    hideTimer.current = setTimeout(() => {
      Animated.timing(controlsOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setControlsVisible(false);
      });
    }, 4000);
  };

  useEffect(() => {
    if (appState === 'VIEW_PULSE' || appState === 'VIEW_MAP') triggerControls();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [appState]);

  const handleWebViewMessage = (event) => {
    if (event.nativeEvent.data === 'TAP') triggerControls();
  };

  const getInjectScript = () => `
    document.body.style.zoom = ${zoom};
    document.body.style.backgroundColor = '#000000';
    window.addEventListener('touchstart', function() { window.ReactNativeWebView.postMessage('TAP'); }, true);
    true;
  `;

  const handleZoom = async (factor) => {
    let newZoom = Math.max(0.5, Math.min(zoom + factor, 3.0));
    newZoom = parseFloat(newZoom.toFixed(1));
    setZoom(newZoom);
    await AsyncStorage.setItem('appZoom', newZoom.toString());
    if (webviewRef.current) webviewRef.current.injectJavaScript(`document.body.style.zoom = ${newZoom}; true;`);
    triggerControls();
  };

  const handleLangSelect = async (selectedLang) => {
    setLang(selectedLang);
    await AsyncStorage.setItem('appLang', selectedLang);
    if (urls.pulse || urls.map) {
      setAppState('SETTINGS');
    } else {
      setAppState('ONBOARDING_START');
    }
  };

  const handleScan = async ({ data }) => {
    if (scanLock.current) return;
    if (!data.startsWith('http://') && !data.startsWith('https://')) {
      scanLock.current = true;
      alert(t.invalidQr);
      setTimeout(() => { scanLock.current = false; }, 2000);
      return;
    }
    scanLock.current = true;
    if (appState === 'SCAN_PULSE' || appState === 'SETTINGS_SCAN_PULSE') {
      setUrls(prev => ({ ...prev, pulse: data }));
      await AsyncStorage.setItem('pulseUrl', data);
      setAppState(appState === 'SCAN_PULSE' ? 'SCAN_SUCCESS_PULSE' : 'HOME');
    } else if (appState === 'SCAN_MAP' || appState === 'SETTINGS_SCAN_MAP') {
      setUrls(prev => ({ ...prev, map: data }));
      await AsyncStorage.setItem('mapUrl', data);
      setAppState('HOME');
    }
    setTimeout(() => { scanLock.current = false; }, 2000);
  };

  const clearData = async () => {
    await AsyncStorage.clear();
    setUrls({ pulse: null, map: null });
    setZoom(1.0);
    setAppState('LANG_SELECT');
  };

  if (appState === 'LOADING') return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        
        {appState === 'LANG_SELECT' && (
          <ScrollView contentContainerStyle={styles.scrollCenter} bounces={false}>
            <View style={styles.menuBox}>
              <Text style={styles.titleStrict}>{t.langTitle}</Text>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.btnSecondary} onPress={() => handleLangSelect('en')}><Text style={styles.btnSecondaryText}>ENGLISH</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => handleLangSelect('ua')}><Text style={styles.btnSecondaryText}>УКРАЇНСЬКА</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => handleLangSelect('ru')}><Text style={styles.btnSecondaryText}>РУССКИЙ</Text></TouchableOpacity>
              {(urls.pulse || urls.map) && (
                <TouchableOpacity style={[styles.btnGhost, {marginTop: 20}]} onPress={() => setAppState('SETTINGS')}><Text style={styles.btnGhostText}>{t.cancel}</Text></TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}

        {appState === 'ONBOARDING_START' && (
          <ScrollView contentContainerStyle={styles.scrollCenter} bounces={false}>
            <TouchableOpacity style={styles.githubBtn} onPress={() => Linking.openURL('https://github.com/Vlaseeds')}><Text style={styles.githubIcon}>🐙</Text></TouchableOpacity>
            <View style={styles.menuBox}>
              <Text style={styles.titleStrict}>PULSE PAD</Text>
              <Text style={styles.subtitleStrict}>MOBILE COMPANION</Text>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.btnPrimary} onPress={() => setAppState('ONBOARDING_INFO')}><Text style={styles.btnPrimaryText}>{t.start}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={() => BackHandler.exitApp()}><Text style={styles.btnGhostText}>{t.exit}</Text></TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {appState === 'ONBOARDING_INFO' && (
          <ScrollView contentContainerStyle={styles.scrollCenter} bounces={false}>
            <View style={styles.menuBox}>
              <Text style={styles.titleSmall}>{t.infoTitle}</Text>
              <Text style={styles.paragraph}>{t.infoDisclaimer}</Text>
              <View style={styles.infoBox}>
                <Text style={styles.paragraphSmall}>{t.infoServer}</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://github.com/Vlaseeds/Pulse-Pad/releases/latest')}><Text style={styles.linkText}>{t.getDesktop}</Text></TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => { requestPermission(); setAppState('SCAN_PULSE'); }}><Text style={styles.btnPrimaryText}>{t.nextCam}</Text></TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {appState === 'SCAN_SUCCESS_PULSE' && (
          <ScrollView contentContainerStyle={styles.scrollCenter} bounces={false}>
            <View style={styles.menuBox}>
              <Text style={styles.titleSmall}>{t.pulseScanned}</Text>
              <Text style={styles.paragraph}>{t.nextScanMap}</Text>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.btnPrimary} onPress={() => setAppState('SCAN_MAP')}><Text style={styles.btnPrimaryText}>{t.scanNext}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setAppState('HOME')}><Text style={styles.btnGhostText}>{t.skip}</Text></TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {(appState === 'SCAN_PULSE' || appState === 'SCAN_MAP' || appState.startsWith('SETTINGS_SCAN')) && (
          <View style={styles.screen}>
            {permission?.granted ? (
              <View style={styles.cameraWrapper}>
                <CameraView style={styles.cameraFrame} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={handleScan} />
              </View>
            ) : (
              <View style={styles.scrollCenter}>
                <Text style={styles.paragraph}>{t.camDenied}</Text>
                <TouchableOpacity style={styles.btnGhost} onPress={requestPermission}><Text style={styles.btnGhostText}>{t.grantAccess}</Text></TouchableOpacity>
              </View>
            )}
            <View style={styles.scannerHud}>
              <View style={styles.scannerBox} />
              <Text style={styles.scannerInstruction}>{appState.includes('PULSE') ? t.scanPulse : t.scanMap}</Text>
              <View style={styles.scannerActions}>
                {appState === 'SCAN_MAP' && (
                  <TouchableOpacity style={styles.btnGhost} onPress={() => setAppState('HOME')}><Text style={styles.btnGhostText}>{t.skip}</Text></TouchableOpacity>
                )}
                {appState.startsWith('SETTINGS') && (
                  <TouchableOpacity style={styles.btnGhost} onPress={() => setAppState('HOME')}><Text style={styles.btnGhostText}>{t.cancel}</Text></TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {appState === 'HOME' && (
          <ScrollView contentContainerStyle={styles.scrollCenter} bounces={false}>
            <TouchableOpacity style={styles.githubBtn} onPress={() => Linking.openURL('https://github.com/Vlaseeds')}><Text style={styles.githubIcon}>🐙</Text></TouchableOpacity>
            <View style={styles.menuBox}>
              <Text style={styles.titleStrict}>PULSE PAD</Text>
              <Text style={styles.subtitleStrict}>MOBILE COMPANION</Text>
              <View style={styles.divider} />
              {urls.pulse && (<TouchableOpacity style={styles.cardBtn} onPress={() => setAppState('VIEW_PULSE')}><Text style={styles.cardBtnIcon}>🩸</Text><Text style={styles.cardBtnText}>PZ PULSE</Text></TouchableOpacity>)}
              {urls.map && (<TouchableOpacity style={styles.cardBtn} onPress={() => setAppState('VIEW_MAP')}><Text style={styles.cardBtnIcon}>🗺️</Text><Text style={styles.cardBtnText}>PZ MAP</Text></TouchableOpacity>)}
              <TouchableOpacity style={styles.btnGhost} onPress={() => setAppState('SETTINGS')}><Text style={styles.btnGhostText}>{t.settings}</Text></TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {appState === 'SETTINGS' && (
          <View style={styles.screen}>
            <TouchableOpacity style={styles.langFab} onPress={() => setAppState('LANG_SELECT')}>
              <Text style={styles.langIcon}>🌐</Text>
            </TouchableOpacity>
            <ScrollView contentContainerStyle={styles.scrollCenter} bounces={false}>
              <View style={styles.menuBox}>
                <Text style={styles.titleStrict}>{t.settings}</Text>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.btnSecondary} onPress={() => setAppState('SETTINGS_SCAN_PULSE')}><Text style={styles.btnSecondaryText}>{t.rescanPulse}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary} onPress={() => setAppState('SETTINGS_SCAN_MAP')}><Text style={styles.btnSecondaryText}>{t.rescanMap}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btnSecondary, { borderColor: '#7f1d1d', marginTop: 20 }]} onPress={clearData}><Text style={[styles.btnSecondaryText, { color: '#ef4444' }]}>{t.reset}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.btnGhost} onPress={() => setAppState('HOME')}><Text style={styles.btnGhostText}>{t.cancel}</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}

        {(appState === 'VIEW_PULSE' || appState === 'VIEW_MAP') && (
          <View style={styles.screen}>
            <WebView 
              ref={webviewRef} source={{ uri: appState === 'VIEW_PULSE' ? urls.pulse : urls.map }} 
              style={styles.webview} injectedJavaScript={getInjectScript()} onMessage={handleWebViewMessage}
              javaScriptEnabled={true} domStorageEnabled={true} bounces={false} overScrollMode="never"
              originWhitelist={['*']} mixedContentMode="always"
            />
            {controlsVisible && (
              <Animated.View style={[styles.compactControls, { opacity: controlsOpacity }]}>
                <TouchableOpacity style={styles.backFab} onPress={() => setAppState('HOME')}><Text style={styles.backFabIcon}>❮</Text></TouchableOpacity>
                <View style={styles.zoomPanel}>
                  <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom(-0.1)}><Text style={styles.zoomBtnText}>-</Text></TouchableOpacity>
                  <Text style={styles.zoomDisplay}>{zoom}x</Text>
                  <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom(0.1)}><Text style={styles.zoomBtnText}>+</Text></TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  screen: { flex: 1, position: 'relative' },
  
  scrollCenter: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  menuBox: { width: '100%', maxWidth: 450, alignSelf: 'center' }, 
  
  titleStrict: { color: '#ffffff', fontSize: 30, fontWeight: '900', letterSpacing: 4, textAlign: 'center' },
  subtitleStrict: { color: '#4ade80', fontSize: 13, fontWeight: '600', letterSpacing: 6, textAlign: 'center', marginTop: 8 },
  titleSmall: { color: '#ffffff', fontSize: 20, fontWeight: '700', letterSpacing: 2, textAlign: 'center', marginBottom: 20 },
  paragraph: { color: '#a3a3a3', fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  paragraphSmall: { color: '#737373', fontSize: 13, textAlign: 'center', marginBottom: 5 },
  divider: { width: 40, height: 2, backgroundColor: '#333333', alignSelf: 'center', marginVertical: 30 },
  linkText: { color: '#4ade80', fontSize: 15, fontWeight: 'bold', textAlign: 'center', textDecorationLine: 'underline' },
  
  infoBox: { backgroundColor: '#111111', padding: 20, borderRadius: 8, borderWidth: 1, borderColor: '#222222', marginBottom: 30 },
  
  btnPrimary: { backgroundColor: '#ffffff', paddingVertical: 18, borderRadius: 6, alignItems: 'center', width: '100%', marginBottom: 10 },
  btnPrimaryText: { color: '#000000', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  btnGhost: { paddingVertical: 15, alignItems: 'center', width: '100%', marginTop: 5 },
  btnGhostText: { color: '#737373', fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  btnSecondary: { width: '100%', borderColor: '#333333', borderWidth: 1, paddingVertical: 16, borderRadius: 6, alignItems: 'center', marginBottom: 12 },
  btnSecondaryText: { color: '#d4d4d4', fontSize: 13, fontWeight: '700', letterSpacing: 2 },

  cardBtn: { width: '100%', flexDirection: 'row', backgroundColor: '#111111', borderColor: '#222222', borderWidth: 1, padding: 20, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  cardBtnIcon: { fontSize: 24, marginRight: 20 },
  cardBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },

  cameraWrapper: { flex: 1, backgroundColor: '#000' },
  cameraFrame: { flex: 1, width: '100%' },
  scannerHud: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', paddingBottom: 50 },
  scannerBox: { width: 250, height: 250, borderWidth: 2, borderColor: '#4ade80', backgroundColor: 'rgba(74, 222, 128, 0.1)', marginBottom: 40 },
  scannerInstruction: { color: '#ffffff', fontSize: 14, fontWeight: '700', letterSpacing: 2, backgroundColor: 'rgba(0,0,0,0.8)', padding: 15, borderRadius: 6, overflow: 'hidden', textAlign: 'center' },
  scannerActions: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },

  webview: { flex: 1, backgroundColor: '#000000' },
  
  compactControls: { position: 'absolute', left: 20, bottom: 30, flexDirection: 'row', alignItems: 'center', gap: 15 },
  zoomPanel: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 15, 15, 0.85)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  zoomBtn: { paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  zoomBtnText: { color: '#ffffff', fontSize: 22, fontWeight: '400', includeFontPadding: false, textAlignVertical: 'center' },
  zoomDisplay: { color: '#4ade80', fontSize: 14, fontWeight: '800', width: 40, textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' },
  
  backFab: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(15, 15, 15, 0.85)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  backFabIcon: { color: '#ffffff', fontSize: 18, marginTop: -2, marginLeft: -2, includeFontPadding: false, textAlignVertical: 'center' },

  githubBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 10 },
  githubIcon: { fontSize: 26, opacity: 0.5 },

  langFab: { position: 'absolute', top: 20, left: 20, zIndex: 10, padding: 10 },
  langIcon: { fontSize: 26, opacity: 0.7 }
});