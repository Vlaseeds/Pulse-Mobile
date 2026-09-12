import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, StatusBar, BackHandler, 
  Linking, Animated, ScrollView, Platform, TextInput, ActivityIndicator 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const TRANSLATIONS = {
  ru: {
    langTitle: "ВЫБЕРИТЕ ЯЗЫК", start: "НАЧАТЬ", exit: "ВЫЙТИ", infoTitle: "ДЛЯ ЧЕГО ЭТО?",
    infoDisclaimer: "⚠️ Дисклеймер: Я не являюсь автором оригинальных модов. Это приложение создано исключительно для удобства, чтобы убрать рамки браузера и дать вам чистый тактический интерфейс.",
    infoServer: "Важно: Для работы требуется запущенный сервер", getDesktop: "Скачать Pulse Pad (ПК)",
    nextCam: "ДАЛЕЕ (К КАМЕРЕ)", scanPulse: "СКАНИРУЙТЕ QR ИЗ ВКЛАДКИ 'PZ PULSE'", scanMap: "СКАНИРУЙТЕ QR ИЗ ВКЛАДКИ 'PZ MAP'",
    pulseScanned: "PULSE УСПЕШНО ДОБАВЛЕН", nextScanMap: "Теперь отсканируйте второй QR-код из вкладки 'PZ Map'.",
    scanNext: "СКАНИРОВАТЬ КАРТУ", skip: "ПРОПУСТИТЬ", cancel: "НАЗАД", settings: "НАСТРОЙКИ",
    rescanPulse: "ОБНОВИТЬ QR (PULSE)", rescanMap: "ОБНОВИТЬ QR (MAP)", reset: "СБРОСИТЬ ДАННЫЕ",
    camDenied: "Доступ к камере заблокирован.", grantAccess: "ДАТЬ ДОСТУП",
    invalidQr: "Неверный QR-код. Откройте Pulse Pad на ПК.",
    serverDead: "СЕРВЕР НЕ ОТВЕЧАЕТ", checkConnection: "Убедитесь, что сервер на ПК запущен",
    wrongQrPulse: "Это код от Карты! Нужен код из вкладки PZ Pulse.", wrongQrMap: "Это код от Pulse! Нужен код из вкладки PZ Map.",
    manualIp: "ВВЕСТИ ВРУЧНУЮ", enterIp: "Введите IP:ПОРТ (напр. 192.168.1.5:49152)", save: "СОХРАНИТЬ"
  },
  ua: {
    langTitle: "ОБЕРІТЬ МОВУ", start: "ПОЧАТИ", exit: "ВИЙТИ", infoTitle: "ДЛЯ ЧОГО ЦЕ?",
    infoDisclaimer: "⚠️ Дисклеймер: Я не є автором оригінальних модів. Цей додаток створено виключно для зручності, щоб прибрати рамки браузера та надати чистий тактичний інтерфейс.",
    infoServer: "Важливо: Для роботи потрібен запущений сервер", getDesktop: "Завантажити Pulse Pad (ПК)",
    nextCam: "ДАЛІ (ДО КАМЕРИ)", scanPulse: "СКАНУЙТЕ QR ЗІ ВКЛАДКИ 'PZ PULSE'", scanMap: "СКАНУЙТЕ QR ЗІ ВКЛАДКИ 'PZ MAP'",
    pulseScanned: "PULSE УСПІШНО ДОДАНО", nextScanMap: "Тепер відскануйте другий QR-код із вкладки 'PZ Map'.",
    scanNext: "СКАНУВАТИ МАПУ", skip: "ПРОПУСТИТИ", cancel: "НАЗАД", settings: "НАЛАШТУВАННЯ",
    rescanPulse: "ОНОВИТИ QR (PULSE)", rescanMap: "ОНОВИТИ QR (MAP)", reset: "СКИДАННЯ ДАНИХ",
    camDenied: "Доступ до камери заблоковано.", grantAccess: "ДАТИ ДОСТУП",
    invalidQr: "Невірний QR-код. Відкрийте Pulse Pad на ПК.",
    serverDead: "СЕРВЕР НЕ ВІДПОВІДАЄ", checkConnection: "Переконайтеся, що сервер на ПК запущено",
    wrongQrPulse: "Це код від Мапи! Потрібен код зі вкладки PZ Pulse.", wrongQrMap: "Це код від Pulse! Потрібен код зі вкладки PZ Map.",
    manualIp: "ВВЕСТИ ВРУЧНУ", enterIp: "Введіть IP:ПОРТ (напр. 192.168.1.5:49152)", save: "ЗБЕРЕГТИ"
  },
  en: {
    langTitle: "SELECT LANGUAGE", start: "START", exit: "EXIT", infoTitle: "WHAT IS THIS?",
    infoDisclaimer: "⚠️ Disclaimer: I am not the author of the original mods. This app is made strictly for convenience to remove browser borders and provide a clean tactical UI.",
    infoServer: "Important: Requires the desktop server running", getDesktop: "Download Pulse Pad (PC)",
    nextCam: "NEXT (TO CAMERA)", scanPulse: "SCAN QR FROM 'PZ PULSE' TAB", scanMap: "SCAN QR FROM 'PZ MAP' TAB",
    pulseScanned: "PULSE ADDED SUCCESSFULLY", nextScanMap: "Now scan the second QR code from the 'PZ Map' tab.",
    scanNext: "SCAN MAP", skip: "SKIP", cancel: "BACK", settings: "SETTINGS",
    rescanPulse: "RESCAN QR (PULSE)", rescanMap: "RESCAN QR (MAP)", reset: "RESET ALL DATA",
    camDenied: "Camera access is denied.", grantAccess: "GRANT ACCESS",
    invalidQr: "Invalid QR code. Please scan from Pulse Pad.",
    serverDead: "SERVER UNREACHABLE", checkConnection: "Ensure the desktop server is running",
    wrongQrPulse: "That's the Map code! Scan from the PZ Pulse tab.", wrongQrMap: "That's the Pulse code! Scan from the PZ Map tab.",
    manualIp: "MANUAL ENTRY", enterIp: "Enter IP:PORT (e.g. 192.168.1.5:49152)", save: "SAVE"
  }
};

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [appState, setAppState] = useState('LOADING'); 
  const [urls, setUrls] = useState({ pulse: null, map: null });
  const [zooms, setZooms] = useState({ pulse: 1.0, map: 1.0 });
  const [lang, setLang] = useState('en');
  
  const [toastMsg, setToastMsg] = useState(null);
  const [manualIpStr, setManualIpStr] = useState('');
  
  const webviewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const zoomOpacity = useRef(new Animated.Value(1)).current;
  const toastAnim = useRef(new Animated.Value(-100)).current;
  
  const hideTimer = useRef(null);
  const toastTimer = useRef(null);
  const scanLock = useRef(false);
  const [zoomVisible, setZoomVisible] = useState(true);
  
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const showToast = (msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    Animated.spring(toastAnim, { toValue: 50, useNativeDriver: true, speed: 20 }).start();
    
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: -100, duration: 300, useNativeDriver: true }).start(() => {
        setToastMsg(null);
      });
    }, 3500);
  };

  useEffect(() => {
    if (appState === 'VIEW_PULSE' || appState === 'VIEW_MAP') activateKeepAwakeAsync();
    else deactivateKeepAwake();
  }, [appState]);

  useEffect(() => {
    const backAction = () => {
      if (appState === 'LANG_SELECT') {
        if (urls.pulse || urls.map) {
          setAppState('SETTINGS');
          return true;
        }
        return false; 
      }
      if (appState === 'HOME' || appState === 'ONBOARDING_START') return false; 
      
      if (appState.startsWith('MANUAL_IP') || appState.startsWith('SETTINGS_SCAN')) {
        setAppState('SETTINGS');
        return true;
      }
      if (appState === 'SCAN_PULSE' || appState === 'ONBOARDING_INFO') {
        setAppState('ONBOARDING_START');
        return true;
      }
      
      setAppState('HOME');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [appState, urls]);

  useEffect(() => {
    const initApp = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('appLang');
        const savedPulse = await AsyncStorage.getItem('pulseUrl');
        const savedMap = await AsyncStorage.getItem('mapUrl');
        const savedZoomPulse = await AsyncStorage.getItem('appZoomPulse');
        const savedZoomMap = await AsyncStorage.getItem('appZoomMap');
        
        if (savedLang) setLang(savedLang);
        setUrls({ pulse: savedPulse, map: savedMap });
        setZooms({
          pulse: savedZoomPulse ? parseFloat(savedZoomPulse) : 1.0,
          map: savedZoomMap ? parseFloat(savedZoomMap) : 1.0
        });

        if (!savedLang) setAppState('LANG_SELECT');
        else if (!savedPulse && !savedMap) setAppState('ONBOARDING_START');
        else setAppState('HOME');
        
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      } catch (e) { console.error(e); }
    };
    initApp();
  }, []);

  const triggerZoomPanel = () => {
    setZoomVisible(true);
    Animated.timing(zoomOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      Animated.timing(zoomOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setZoomVisible(false);
      });
    }, 4000);
  };

  useEffect(() => {
    if (appState === 'VIEW_PULSE' || appState === 'VIEW_MAP') triggerZoomPanel();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [appState]);

  const handleWebViewMessage = (event) => {
    if (event.nativeEvent.data === 'TAP') triggerZoomPanel();
  };

  const currentZoom = appState === 'VIEW_PULSE' ? zooms.pulse : zooms.map;
  const getInjectScript = () => `
    document.body.style.zoom = ${currentZoom};
    document.body.style.backgroundColor = '#050505';
    window.addEventListener('touchstart', function() { window.ReactNativeWebView.postMessage('TAP'); }, true);
    true;
  `;

  const handleZoom = async (factor) => {
    const isPulse = appState === 'VIEW_PULSE';
    let newZoom = Math.max(0.5, Math.min(currentZoom + factor, 3.0));
    newZoom = parseFloat(newZoom.toFixed(1));
    
    setZooms(prev => ({ ...prev, [isPulse ? 'pulse' : 'map']: newZoom }));
    await AsyncStorage.setItem(isPulse ? 'appZoomPulse' : 'appZoomMap', newZoom.toString());
    
    if (webviewRef.current) webviewRef.current.injectJavaScript(`document.body.style.zoom = ${newZoom}; true;`);
    triggerZoomPanel();
  };

  const handleLangSelect = async (selectedLang) => {
    setLang(selectedLang);
    await AsyncStorage.setItem('appLang', selectedLang);
    setAppState(urls.pulse || urls.map ? 'SETTINGS' : 'ONBOARDING_START');
  };

  const handleRequestCamera = async (nextState) => {
    if (!permission?.granted) await requestPermission();
    setAppState(nextState);
  };

  const processUrl = async (data, target) => {
    const isPulse = target === 'PULSE';
    if (isPulse) {
      setUrls(prev => ({ ...prev, pulse: data }));
      await AsyncStorage.setItem('pulseUrl', data);
      setAppState(appState.includes('ONBOARDING') || appState === 'SCAN_PULSE' ? 'SCAN_SUCCESS_PULSE' : 'HOME');
    } else {
      setUrls(prev => ({ ...prev, map: data }));
      await AsyncStorage.setItem('mapUrl', data);
      setAppState('HOME');
    }
  };

  const handleScan = async ({ data }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    
    if (!data.startsWith('http://') && !data.startsWith('https://')) {
      showToast(t.invalidQr);
      setTimeout(() => { scanLock.current = false; }, 2000);
      return;
    }

    const isPulseTarget = appState.includes('PULSE');
    if (isPulseTarget && data.includes('/map/')) {
      showToast(t.wrongQrPulse);
      setTimeout(() => { scanLock.current = false; }, 2000);
      return;
    }
    if (!isPulseTarget && data.includes('/pulse/')) {
      showToast(t.wrongQrMap);
      setTimeout(() => { scanLock.current = false; }, 2000);
      return;
    }

    await processUrl(data, isPulseTarget ? 'PULSE' : 'MAP');
    setTimeout(() => { scanLock.current = false; }, 2000);
  };

  const handleManualSave = () => {
    if (!manualIpStr.trim()) return;
    let cleanIp = manualIpStr.trim().replace('http://', '').replace('https://', '');
    const isPulseTarget = appState.includes('PULSE');
    const finalUrl = `http://${cleanIp}/${isPulseTarget ? 'pulse' : 'map'}/`;
    processUrl(finalUrl, isPulseTarget ? 'PULSE' : 'MAP');
    setManualIpStr('');
  };

  const clearData = async () => {
    await AsyncStorage.clear();
    setUrls({ pulse: null, map: null });
    setZooms({ pulse: 1.0, map: 1.0 });
    setAppState('LANG_SELECT');
  };

  if (appState === 'LOADING') return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      
      <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }] }]}>
        <Text style={styles.toastText}>⚠️ {toastMsg}</Text>
      </Animated.View>

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        
        {appState === 'LANG_SELECT' && (
          <ScrollView contentContainerStyle={styles.scrollCenter} bounces={false}>
            <View style={styles.menuBox}>
              <Text style={styles.titleStrict}>{t.langTitle}</Text>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.rowBtn} onPress={() => handleLangSelect('en')}>
                <Text style={styles.rowIcon}>🇬🇧</Text><Text style={styles.rowText}>ENGLISH</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rowBtn} onPress={() => handleLangSelect('ua')}>
                <Text style={styles.rowIcon}>🇺🇦</Text><Text style={styles.rowText}>УКРАЇНСЬКА</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rowBtn} onPress={() => handleLangSelect('ru')}>
                <Text style={styles.rowIcon}>🇷🇺</Text><Text style={styles.rowText}>РУССКИЙ</Text>
              </TouchableOpacity>
              {(urls.pulse || urls.map) && (
                <TouchableOpacity style={styles.btnGhost} onPress={() => setAppState('SETTINGS')}>
                  <Text style={styles.btnGhostText}>{t.cancel}</Text>
                </TouchableOpacity>
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
              <TouchableOpacity style={styles.btnPrimary} onPress={() => setAppState('ONBOARDING_INFO')}><Text style={styles.btnPrimaryText}>🚀 {t.start}</Text></TouchableOpacity>
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
              <TouchableOpacity style={styles.btnPrimary} onPress={() => handleRequestCamera('SCAN_PULSE')}><Text style={styles.btnPrimaryText}>📸 {t.nextCam}</Text></TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {appState === 'SCAN_SUCCESS_PULSE' && (
          <ScrollView contentContainerStyle={styles.scrollCenter} bounces={false}>
            <View style={styles.menuBox}>
              <Text style={styles.titleSmall}>{t.pulseScanned}</Text>
              <Text style={styles.paragraph}>{t.nextScanMap}</Text>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.btnPrimary} onPress={() => handleRequestCamera('SCAN_MAP')}><Text style={styles.btnPrimaryText}>📸 {t.scanNext}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setAppState('HOME')}><Text style={styles.btnGhostText}>⏭️ {t.skip}</Text></TouchableOpacity>
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
              <Text style={styles.scannerInstruction}>{appState.includes('PULSE') ? t.scanPulse : t.scanMap}</Text>
              <View style={styles.scannerBox} />
              <View style={styles.scannerActions}>
                <TouchableOpacity style={styles.rowBtnOutline} onPress={() => setAppState(appState.includes('PULSE') ? 'MANUAL_IP_PULSE' : 'MANUAL_IP_MAP')}>
                  <Text style={styles.rowIconOutline}>⌨️</Text><Text style={styles.rowTextOutline}>{t.manualIp}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnGhostScanner} onPress={() => setAppState('HOME')}>
                  <Text style={styles.btnGhostText}>{appState.includes('SETTINGS') ? t.cancel : t.skip}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {(appState.startsWith('MANUAL_IP')) && (
          <ScrollView contentContainerStyle={styles.scrollCenter} bounces={false}>
            <View style={styles.menuBox}>
              <Text style={styles.titleSmall}>IP:PORT</Text>
              <Text style={styles.paragraphSmall}>{t.enterIp}</Text>
              <TextInput 
                style={styles.ipInput} placeholder="192.168.x.x:49152" 
                placeholderTextColor="#555" keyboardType="url"
                autoCapitalize="none" autoCorrect={false}
                value={manualIpStr} onChangeText={setManualIpStr} autoFocus
              />
              <TouchableOpacity style={styles.btnPrimary} onPress={handleManualSave}><Text style={styles.btnPrimaryText}>💾 {t.save}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setAppState(appState.includes('PULSE') ? 'SCAN_PULSE' : 'SCAN_MAP')}><Text style={styles.btnGhostText}>{t.cancel}</Text></TouchableOpacity>
            </View>
          </ScrollView>
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
              
              <TouchableOpacity style={styles.btnGhost} onPress={() => setAppState('SETTINGS')}>
                <Text style={styles.btnGhostText}>⚙️ {t.settings}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {appState === 'SETTINGS' && (
          <View style={styles.screen}>
            <TouchableOpacity style={styles.langFab} onPress={() => setAppState('LANG_SELECT')}>
              <Text style={styles.langIcon}>🌐</Text>
            </TouchableOpacity>
            
            <Text style={styles.versionTag}>v1.1.0</Text>

            <ScrollView contentContainerStyle={styles.scrollCenter} bounces={false}>
              <View style={styles.menuBox}>
                <Text style={styles.titleStrict}>⚙️ {t.settings}</Text>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.rowBtn} onPress={() => handleRequestCamera('SETTINGS_SCAN_PULSE')}>
                  <Text style={styles.rowIcon}>🔄</Text><Text style={styles.rowText}>{t.rescanPulse}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rowBtn} onPress={() => handleRequestCamera('SETTINGS_SCAN_MAP')}>
                  <Text style={styles.rowIcon}>🔄</Text><Text style={styles.rowText}>{t.rescanMap}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.rowBtn, { borderColor: '#7f1d1d', backgroundColor: '#1a0505', marginTop: 10 }]} onPress={clearData}>
                  <Text style={styles.rowIcon}>🗑️</Text><Text style={[styles.rowText, { color: '#ef4444' }]}>{t.reset}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnGhost} onPress={() => setAppState('HOME')}><Text style={styles.btnGhostText}>{t.cancel}</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}

        {(appState === 'VIEW_PULSE' || appState === 'VIEW_MAP') && (
          <View style={styles.screen}>
            <WebView 
              ref={webviewRef} 
              source={{ uri: appState === 'VIEW_PULSE' ? urls.pulse : urls.map }} 
              style={styles.webview} 
              injectedJavaScript={getInjectScript()} 
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true} domStorageEnabled={true} cacheEnabled={false}
              bounces={false} overScrollMode="never" originWhitelist={['*']} mixedContentMode="always"
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.absoluteLoading}>
                  <ActivityIndicator size="large" color="#4ade80" />
                </View>
              )}
              renderError={() => (
                <View style={styles.absoluteError}>
                  <Text style={styles.errorIcon}>📡</Text>
                  <Text style={styles.errorTitle}>{t.serverDead}</Text>
                  <Text style={styles.errorDesc}>{t.checkConnection}</Text>
                </View>
              )}
            />
            
            {/* Единый контейнер для элементов управления снизу слева */}
            <View style={styles.bottomControls}>
              <TouchableOpacity style={styles.bottomBackFab} onPress={() => setAppState('HOME')}>
                <View style={styles.customBackArrow} />
              </TouchableOpacity>

              {zoomVisible && (
                <Animated.View style={[styles.zoomPanel, { opacity: zoomOpacity }]}>
                  <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom(-0.1)}><Text style={styles.zoomBtnText}>-</Text></TouchableOpacity>
                  <Text style={styles.zoomDisplay}>{currentZoom}x</Text>
                  <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom(0.1)}><Text style={styles.zoomBtnText}>+</Text></TouchableOpacity>
                </Animated.View>
              )}
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  screen: { flex: 1, position: 'relative' },
  
  toastContainer: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 40, left: 20, right: 20, backgroundColor: '#7f1d1d', padding: 15, borderRadius: 10, zIndex: 9999, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10 },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  scrollCenter: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, paddingBottom: 80 },
  menuBox: { width: '100%', maxWidth: 350, alignSelf: 'center' }, 
  
  titleStrict: { color: '#ffffff', fontSize: 30, fontWeight: '900', letterSpacing: 4, textAlign: 'center' },
  subtitleStrict: { color: '#4ade80', fontSize: 13, fontWeight: '600', letterSpacing: 6, textAlign: 'center', marginTop: 8 },
  titleSmall: { color: '#ffffff', fontSize: 20, fontWeight: '700', letterSpacing: 2, textAlign: 'center', marginBottom: 20 },
  paragraph: { color: '#a3a3a3', fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  paragraphSmall: { color: '#737373', fontSize: 13, textAlign: 'center', marginBottom: 5 },
  divider: { width: 40, height: 2, backgroundColor: '#333333', alignSelf: 'center', marginVertical: 30 },
  linkText: { color: '#4ade80', fontSize: 15, fontWeight: 'bold', textAlign: 'center', textDecorationLine: 'underline' },
  
  infoBox: { backgroundColor: '#111111', padding: 20, borderRadius: 8, borderWidth: 1, borderColor: '#222222', marginBottom: 30 },
  
  btnPrimary: { backgroundColor: '#ffffff', paddingVertical: 18, borderRadius: 8, alignItems: 'center', width: '100%', marginBottom: 10 },
  btnPrimaryText: { color: '#000000', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  btnGhost: { paddingVertical: 15, alignItems: 'center', width: '100%', marginTop: 5 },
  btnGhostScanner: { paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
  btnGhostText: { color: '#737373', fontSize: 14, fontWeight: '700', letterSpacing: 2 },

  rowBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 10, width: '100%' },
  rowIcon: { fontSize: 20, width: 40, textAlign: 'center', marginRight: 10 },
  rowText: { color: '#d4d4d4', fontSize: 14, fontWeight: '700', letterSpacing: 2 },

  rowBtnOutline: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', borderWidth: 1, borderColor: '#4ade80', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20 },
  rowIconOutline: { fontSize: 18, marginRight: 10 },
  rowTextOutline: { color: '#4ade80', fontSize: 13, fontWeight: '800', letterSpacing: 1 },

  cardBtn: { width: '100%', flexDirection: 'row', backgroundColor: '#111', borderColor: '#222', borderWidth: 1, padding: 20, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  cardBtnIcon: { fontSize: 26, marginRight: 20 },
  cardBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },

  ipInput: { backgroundColor: '#111', color: '#4ade80', fontSize: 16, fontFamily: 'monospace', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#333', textAlign: 'center', marginBottom: 20, width: '100%' },

  cameraWrapper: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  cameraFrame: { flex: 1 },
  
  scannerHud: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'space-evenly', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 10 },
  scannerInstruction: { color: '#ffffff', fontSize: 14, fontWeight: '700', letterSpacing: 2, backgroundColor: 'rgba(0,0,0,0.8)', padding: 15, borderRadius: 6, overflow: 'hidden', textAlign: 'center' },
  scannerBox: { width: '50%', maxWidth: 220, maxHeight: 220, aspectRatio: 1, borderWidth: 2, borderColor: '#4ade80', backgroundColor: 'rgba(74, 222, 128, 0.1)', borderRadius: 16 },
  scannerActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 15 },

  webview: { flex: 1, backgroundColor: '#050505' },
  
  absoluteLoading: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#050505', zIndex: 50, justifyContent: 'center', alignItems: 'center' },
  absoluteError: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#050505', zIndex: 100, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorIcon: { fontSize: 50, marginBottom: 20 },
  errorTitle: { color: '#ef4444', fontSize: 20, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 10 },
  errorDesc: { color: '#737373', fontSize: 14, textAlign: 'center', maxWidth: 300 },

  bottomControls: { position: 'absolute', left: 20, bottom: 30, flexDirection: 'row', alignItems: 'center', gap: 15, zIndex: 200 },
  bottomBackFab: { width: 52, height: 52, backgroundColor: 'rgba(15, 15, 15, 0.85)', justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  customBackArrow: { width: 14, height: 14, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderColor: '#ffffff', transform: [{ translateX: 3 }, { rotate: '45deg' }] },

  zoomPanel: { height: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 15, 15, 0.85)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  zoomBtn: { paddingHorizontal: 20, height: 52, justifyContent: 'center', alignItems: 'center' },
  zoomBtnText: { color: '#ffffff', fontSize: 24, fontWeight: '400', includeFontPadding: false, textAlignVertical: 'center' },
  zoomDisplay: { color: '#4ade80', fontSize: 15, fontWeight: '800', width: 45, textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' },

  githubBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 10 },
  githubIcon: { fontSize: 26, opacity: 0.5 },

  langFab: { position: 'absolute', top: 20, left: 20, zIndex: 10, padding: 10 },
  langIcon: { fontSize: 26, opacity: 0.7 },
  
  versionTag: { position: 'absolute', top: 25, right: 25, color: '#555', fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold', zIndex: 10 }
});