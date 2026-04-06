import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, MessageSquareText, Sparkles } from 'lucide-react';
import { authService, paymentService, vehicleService, voiceService } from '../services/api';
import toast from 'react-hot-toast';
import './VoiceAssistant.css';

const defaultContext = {
  activated: false,
  intent: null,
  vehicleType: null,
  vehicleId: null,
  paymentMethod: null,
  customerName: null
};

const getDefaultPrompt = (requirePhoneLogin) => (
  requirePhoneLogin ? 'Say "wake up" to start.' : 'Say "ParkEase" to start.'
);

const wakePhrases = ['wake up', 'parkease'];

const digitWords = {
  zero: '0',
  oh: '0',
  o: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9'
};

const normalizeSpeechDigits = (text = '') => {
  let normalized = text.toLowerCase();
  normalized = normalized.replace(
    /\bdouble\s+(zero|oh|o|one|two|three|four|five|six|seven|eight|nine)\b/g,
    (_, word) => `${digitWords[word]}${digitWords[word]}`
  );
  normalized = normalized.replace(
    /\btriple\s+(zero|oh|o|one|two|three|four|five|six|seven|eight|nine)\b/g,
    (_, word) => `${digitWords[word]}${digitWords[word]}${digitWords[word]}`
  );
  normalized = normalized.replace(
    /\b(zero|oh|o|one|two|three|four|five|six|seven|eight|nine)\b/g,
    (match) => digitWords[match]
  );
  return normalized;
};

const normalizeVehicleIdSpacing = (text = '') => (
  text.replace(/\b([a-zA-Z]{1,3})\s*([0-9]{1,2})\s*([a-zA-Z]{1,3})\s*([0-9]{3,4})\b/g,
    (_, a, b, c, d) => `${a}${b}${c}${d}`)
);

const normalizeNumericSpacing = (text = '') => {
  const digitized = normalizeSpeechDigits(text);
  const vehicleNormalized = normalizeVehicleIdSpacing(digitized);
  return vehicleNormalized.replace(/(\d[\d\s-]{5,}\d)/g, (match) => match.replace(/[\s-]/g, ''));
};

const getNoSpeechPrompt = (requirePhoneLogin, awake) => {
  if (requirePhoneLogin && !awake) {
    return 'I did not catch that. Say "wake up" to start the assistant.';
  }
  return 'I did not catch that. Please try again.';
};

const detectLocalIntent = (text = '') => {
  const lower = text.toLowerCase();
  if (/(\bpark\b|\bbook\b|\badd\b)/.test(lower)) return 'park';
  if (/(\bexit\b|\bleave\b|\bremove\b)/.test(lower)) return 'exit';
  return null;
};

const extractPhoneNumber = (text) => {
  const digits = (text || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return null;
};

const getWalletBalance = (phone) => {
  const data = JSON.parse(localStorage.getItem('parkease_wallets') || '{}');
  return Number(data[phone] ?? 0);
};

const setWalletBalance = (phone, amount) => {
  const data = JSON.parse(localStorage.getItem('parkease_wallets') || '{}');
  data[phone] = Number(amount);
  localStorage.setItem('parkease_wallets', JSON.stringify(data));
};

const getInitialAuthState = (requirePhoneLogin, authUser) => {
  const isLoggedUser = requirePhoneLogin && authUser?.role === 'user';
  return {
    awake: isLoggedUser,
    prompt: isLoggedUser ? 'You can now say park or exit.' : getDefaultPrompt(requirePhoneLogin),
    context: isLoggedUser ? { ...defaultContext, activated: true } : defaultContext,
    verifiedUser: isLoggedUser
      ? {
          name: authUser?.name || 'Guest',
          membershipType: authUser?.membershipType || 'regular',
          phone: authUser?.phone || ''
        }
      : null,
    ownerName: isLoggedUser ? authUser?.name || '' : '',
    ownerPhone: isLoggedUser ? authUser?.phone || '' : ''
  };
};

const VoiceAssistant = ({ requirePhoneLogin = false, onVerified, authUser, onAutoLogout }) => {
  const initialAuth = getInitialAuthState(requirePhoneLogin, authUser);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [prompt, setPrompt] = useState(initialAuth.prompt);
  const [context, setContext] = useState(initialAuth.context);
  const [typedCommand, setTypedCommand] = useState('');
  const [ownerName, setOwnerName] = useState(initialAuth.ownerName);
  const [ownerPhone, setOwnerPhone] = useState(initialAuth.ownerPhone);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [result, setResult] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [awake, setAwake] = useState(initialAuth.awake);
  const [verifiedUser, setVerifiedUser] = useState(initialAuth.verifiedUser);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [voices, setVoices] = useState([]);
  const [autoListen, setAutoListen] = useState(false);
  const [localIntent, setLocalIntent] = useState(null);

  const recognitionRef = useRef(null);
  const hasResultRef = useRef(false);
  const stopReasonRef = useRef(null);
  const resumeAfterBusyRef = useRef(false);
  const autoListenRef = useRef(false);
  const busyRef = useRef(false);
  const recordingRef = useRef(false);
  const speakingRef = useRef(false);

  // FIX: Keep live refs for all values used inside recognition callbacks
  // to avoid stale closure bugs when recognition useEffect doesn't re-run.
  const awakeRef = useRef(awake);
  const verifiedUserRef = useRef(verifiedUser);
  const contextRef = useRef(context);
  const localIntentRef = useRef(localIntent);
  const ownerNameRef = useRef(ownerName);
  const ownerPhoneRef = useRef(ownerPhone);
  const paymentMethodRef = useRef(paymentMethod);

  useEffect(() => { awakeRef.current = awake; }, [awake]);
  useEffect(() => { verifiedUserRef.current = verifiedUser; }, [verifiedUser]);
  useEffect(() => { contextRef.current = context; }, [context]);
  useEffect(() => { localIntentRef.current = localIntent; }, [localIntent]);
  useEffect(() => { ownerNameRef.current = ownerName; }, [ownerName]);
  useEffect(() => { ownerPhoneRef.current = ownerPhone; }, [ownerPhone]);
  useEffect(() => { paymentMethodRef.current = paymentMethod; }, [paymentMethod]);
  useEffect(() => { autoListenRef.current = autoListen; }, [autoListen]);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => { recordingRef.current = recording; }, [recording]);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);

  const canSpeak = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, []);
  const supportsSpeechRecognition = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const hasUserSession = requirePhoneLogin && (verifiedUser || authUser?.role === 'user');

  const speak = useCallback((text) => {
    if (!isSpeaking || !canSpeak || !text) return;
    if (recordingRef.current) {
      stopReasonRef.current = 'tts';
      recognitionRef.current?.stop();
    }
    const availableVoices = voices.length ? voices : window.speechSynthesis.getVoices();
    const indianVoice = availableVoices.find((voice) => voice.lang?.toLowerCase().startsWith('en-in'))
      || availableVoices.find((voice) => /india|hindi/i.test(voice.name))
      || null;
    const utterance = new SpeechSynthesisUtterance(text);
    if (indianVoice) utterance.voice = indianVoice;
    utterance.lang = indianVoice?.lang || 'en-IN';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      if (autoListenRef.current && !busyRef.current && !recordingRef.current) {
        setTimeout(() => startRecording(), 350);
      }
    };
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking, canSpeak, voices]);

  useEffect(() => {
    if (!canSpeak) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [canSpeak]);

  const resetSession = () => {
    const isLoggedUser = requirePhoneLogin && authUser?.role === 'user';
    const newContext = isLoggedUser ? { ...defaultContext, activated: true } : defaultContext;
    const newPrompt = isLoggedUser ? 'You can now say park or exit.' : getDefaultPrompt(requirePhoneLogin);
    setContext(newContext);
    setPrompt(newPrompt);
    setTranscript('');
    setResult(null);
    setAwake(isLoggedUser);
    setVerifiedUser(isLoggedUser
      ? {
          name: authUser?.name || 'Guest',
          membershipType: authUser?.membershipType || 'regular',
          phone: authUser?.phone || ''
        }
      : null
    );
    setOwnerName(isLoggedUser ? authUser?.name || '' : '');
    setOwnerPhone(isLoggedUser ? authUser?.phone || '' : '');
    setPaymentMethod('');
    setLocalIntent(null);
    setBusy(false);
    // FIX: Sync refs immediately on reset so recognition callbacks see fresh state.
    contextRef.current = newContext;
    awakeRef.current = isLoggedUser;
  };

  const stopRecording = useCallback(({ disableAuto = false, reason = 'manual' } = {}) => {
    if (disableAuto) {
      setAutoListen(false);
      autoListenRef.current = false;
    }
    stopReasonRef.current = reason;
    if (recognitionRef.current && recordingRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(({ enableAuto = false } = {}) => {
    if (recordingRef.current || busyRef.current || speakingRef.current) return;

    if (enableAuto) {
      setAutoListen(true);
      autoListenRef.current = true;
    }

    if (!supportsSpeechRecognition) {
      const message = 'Voice recognition is not supported in this browser. Please use Chrome.';
      setPrompt(message);
      toast.error(message);
      return;
    }

    // FIX: Guard against recognition not yet initialized.
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not ready. Please try again.');
      return;
    }

    hasResultRef.current = false;
    stopReasonRef.current = null;
    setRecording(true);
    recordingRef.current = true;
    setPrompt('Listening...');

    try {
      recognitionRef.current.start();
    } catch (error) {
      setRecording(false);
      recordingRef.current = false;
      // FIX: InvalidStateError means recognition is already running; ignore gracefully.
      if (error.name !== 'InvalidStateError') {
        toast.error('Unable to start voice recognition');
      }
    }
  }, [supportsSpeechRecognition]);

  // FIX: handlePhoneVerification and sendCommand are defined as useCallback with no
  // state dependencies — they read live values via refs to avoid stale closures.
  const handlePhoneVerification = useCallback(async (text) => {
    const phoneCandidate = extractPhoneNumber(text) || extractPhoneNumber(ownerPhoneRef.current);
    if (!phoneCandidate) {
      // FIX: Give a specific retry prompt when < 10 digits were heard.
      const digitCount = (text || '').replace(/\D/g, '').length;
      const message = digitCount > 0
        ? `I heard only ${digitCount} digit${digitCount === 1 ? '' : 's'}. Please say all 10 digits of your phone number.`
        : 'Please say your 10-digit phone number to continue.';
      setPrompt(message);
      speak(message);
      return false;
    }

    setVerifyingPhone(true);
    try {
      const response = await authService.checkPhone(phoneCandidate);
      const data = response.data || {};
      if (!data.registered) {
        const message = 'Phone number not registered. Please register in the Park tab.';
        setPrompt(message);
        speak(message);
        setOwnerPhone(phoneCandidate);
        ownerPhoneRef.current = phoneCandidate;
        return false;
      }

      const loginRes = await authService.loginPhone({ phone: phoneCandidate });
      const userData = loginRes.data?.data || {};
      const name = userData.name || data.name || 'Guest';
      const newVerifiedUser = {
        name,
        membershipType: userData.membershipType || data.membershipType || 'regular',
        phone: phoneCandidate
      };
      setVerifiedUser(newVerifiedUser);
      verifiedUserRef.current = newVerifiedUser;
      setOwnerName(name);
      ownerNameRef.current = name;
      setOwnerPhone(phoneCandidate);
      ownerPhoneRef.current = phoneCandidate;
      const newContext = { ...contextRef.current, activated: true };
      setContext(newContext);
      contextRef.current = newContext;
      const message = `Welcome ${name}. You can now say park or exit.`;
      setPrompt(message);
      speak(message);
      onVerified?.(userData);
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Phone verification failed. Please try again.';
      setPrompt(message);
      speak(message);
      return false;
    } finally {
      setVerifyingPhone(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onVerified, speak]);

  const sendCommand = useCallback(async (text) => {
    const trimmedText = (text || '').trim();
    if (!trimmedText) return;

    // Read all live values from refs to avoid stale closure issues.
    const currentAwake = awakeRef.current;
    const currentVerifiedUser = verifiedUserRef.current;
    const currentContext = contextRef.current;
    const currentLocalIntent = localIntentRef.current;

    const detectedIntent = detectLocalIntent(trimmedText);
    if (detectedIntent) {
      setLocalIntent(detectedIntent);
      localIntentRef.current = detectedIntent;
    }

    if (requirePhoneLogin) {
      const isLoggedUser = authUser?.role === 'user';

      // FIX: Sync verified state from authUser if it hasn't been set yet.
      if (isLoggedUser && !currentVerifiedUser) {
        const newVerifiedUser = {
          name: authUser?.name || 'Guest',
          membershipType: authUser?.membershipType || 'regular',
          phone: authUser?.phone || ''
        };
        setVerifiedUser(newVerifiedUser);
        verifiedUserRef.current = newVerifiedUser;
        setOwnerName(authUser?.name || '');
        ownerNameRef.current = authUser?.name || '';
        setOwnerPhone(authUser?.phone || '');
        ownerPhoneRef.current = authUser?.phone || '';
        setAwake(true);
        awakeRef.current = true;
        const newContext = { ...currentContext, activated: true };
        setContext(newContext);
        contextRef.current = newContext;
      }

      const lower = trimmedText.toLowerCase();

      // FIX: Re-read awake/verifiedUser after potential sync above.
      const resolvedAwake = awakeRef.current;
      const resolvedVerified = verifiedUserRef.current;
      const hasSession = resolvedVerified || isLoggedUser;

      if (!resolvedAwake && !hasSession) {
        const hasPhoneOnly = Boolean(extractPhoneNumber(trimmedText));
        if (hasPhoneOnly && !wakePhrases.some((phrase) => lower.includes(phrase))) {
          setAwake(true);
          awakeRef.current = true;
          await handlePhoneVerification(trimmedText);
          return;
        }

        if (wakePhrases.some((phrase) => lower.includes(phrase))) {
          setAwake(true);
          awakeRef.current = true;
          const hasPhone = Boolean(extractPhoneNumber(trimmedText));
          if (hasPhone) {
            await handlePhoneVerification(trimmedText);
          } else {
            const message = 'Hi! Please say your 10-digit phone number to login.';
            setPrompt(message);
            speak(message);
          }
        } else {
          const message = 'Say "wake up" to start the voice assistant.';
          setPrompt(message);
          speak(message);
        }
        return;
      }

      // FIX: If awake but phone not yet verified, handle phone verification first.
      if (!resolvedVerified && !isLoggedUser) {
        await handlePhoneVerification(trimmedText);
        return;
      }
    }

    setBusy(true);
    busyRef.current = true;
    try {
      const isVehicleNotFoundError = (error) => {
        const status = error?.response?.status;
        const message = error?.response?.data?.message || error?.message || '';
        return status === 404 || /vehicle not found in parking|no active parking session found/i.test(message);
      };

      const askVehicleNumberAgain = (reason) => {
        const promptMsg = `${reason} Please tell the vehicle number again.`;
        const retryContext = {
          ...contextRef.current,
          activated: true,
          intent: 'exit',
          vehicleId: null,
          paymentMethod: null
        };
        setContext(retryContext);
        contextRef.current = retryContext;
        setLocalIntent('exit');
        localIntentRef.current = 'exit';
        setPrompt(promptMsg);
        speak(promptMsg);
      };

      const retryPaymentMode = (vehicleId, reason) => {
        const retryPrompt = `${reason} Payment was unsuccessful. Please choose payment mode again: cash, online, or wallet.`;
        const retryContext = {
          ...contextRef.current,
          activated: true,
          intent: 'exit',
          vehicleId: vehicleId || contextRef.current.vehicleId || null,
          paymentMethod: null
        };
        setContext(retryContext);
        contextRef.current = retryContext;
        setLocalIntent('exit');
        localIntentRef.current = 'exit';
        setPrompt(retryPrompt);
        speak(retryPrompt);
      };

      const clearContextAfterSuccess = () => {
        const clearedContext = {
          ...defaultContext,
          activated: true
        };
        setContext(clearedContext);
        contextRef.current = clearedContext;
        setLocalIntent(null);
        localIntentRef.current = null;
      };

      const handlePaymentRequired = async (paymentData) => {
        const vehicleId = paymentData?.vehicleId || contextRef.current.vehicleId;
        const mode = paymentData?.paymentMethod;
        const bill = paymentData?.bill || {};
        const dueAmount = Number(bill.estimatedTotal || bill.totalAmount || 0);

        if (!vehicleId) {
          retryPaymentMode(vehicleId, 'Vehicle ID is missing for payment.');
          return;
        }

        if (!dueAmount || Number.isNaN(dueAmount) || dueAmount <= 0) {
          retryPaymentMode(vehicleId, 'Unable to determine payable amount.');
          return;
        }

        if (mode === 'wallet') {
          const walletPhone = extractPhoneNumber(ownerPhoneRef.current)
            || extractPhoneNumber(verifiedUserRef.current?.phone)
            || extractPhoneNumber(authUser?.phone);

          if (!walletPhone) {
            retryPaymentMode(vehicleId, 'Wallet phone is not available for this user.');
            return;
          }

          const balance = getWalletBalance(walletPhone);
          if (balance < dueAmount) {
            retryPaymentMode(
              vehicleId,
              `Insufficient wallet balance. Required Rs ${dueAmount.toFixed(2)} but available Rs ${balance.toFixed(2)}.`
            );
            return;
          }

          setWalletBalance(walletPhone, balance - dueAmount);
          try {
            const exitRes = await vehicleService.exit({ vehicleId, paymentMethod: 'wallet' });
            const receipt = exitRes.data?.data?.receipt || exitRes.data?.data || exitRes.data;
            setResult(receipt || null);
            const successMsg = 'Wallet payment successful and vehicle exit completed.';
            setPrompt(successMsg);
            speak(successMsg);
            clearContextAfterSuccess();
            await onAutoLogout?.();
          } catch (walletErr) {
            setWalletBalance(walletPhone, balance);
            if (isVehicleNotFoundError(walletErr)) {
              askVehicleNumberAgain('Vehicle was not found in active parking.');
              return;
            }
            retryPaymentMode(vehicleId, walletErr.response?.data?.message || 'Wallet payment failed.');
          }
          return;
        }

        if (mode === 'online') {
          if (!window.Razorpay) {
            retryPaymentMode(vehicleId, 'Payment gateway not loaded.');
            return;
          }

          try {
            const orderRes = await paymentService.createOrder({
              amount: dueAmount,
              meta: {
                purpose: 'parking_exit',
                vehicleId
              }
            });
            const orderData = orderRes.data?.data || orderRes.data;

            await new Promise((resolve) => {
              let settled = false;
              const done = () => {
                if (!settled) {
                  settled = true;
                  resolve();
                }
              };

              const options = {
                key: orderData.key,
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                name: 'Smart Parking',
                description: `Parking Exit ${vehicleId}`,
                order_id: orderData.orderId,
                method: {
                  upi: '1',
                  card: '1',
                  netbanking: '1',
                  wallet: '1',
                  emi: '0'
                },
                handler: async (response) => {
                  try {
                    await paymentService.verifyPayment({
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature
                    });

                    const exitRes = await vehicleService.exit({
                      vehicleId,
                      paymentMethod: 'online'
                    });
                    const receipt = exitRes.data?.data?.receipt || exitRes.data?.data || exitRes.data;
                    setResult(receipt || null);
                    const successMsg = 'Online payment successful and vehicle exit completed.';
                    setPrompt(successMsg);
                    speak(successMsg);
                    clearContextAfterSuccess();
                    await onAutoLogout?.();
                  } catch (verifyErr) {
                    if (isVehicleNotFoundError(verifyErr)) {
                      askVehicleNumberAgain('Vehicle was not found in active parking.');
                      return;
                    }
                    retryPaymentMode(vehicleId, verifyErr.response?.data?.message || 'Payment verification failed.');
                  } finally {
                    done();
                  }
                },
                modal: {
                  ondismiss: () => {
                    retryPaymentMode(vehicleId, 'Payment was cancelled.');
                    done();
                  }
                },
                theme: {
                  color: '#2563eb'
                }
              };

              const razorpay = new window.Razorpay(options);
              razorpay.on('payment.failed', () => {
                retryPaymentMode(vehicleId, 'Payment failed.');
                done();
              });
              razorpay.open();
            });
          } catch (orderErr) {
            retryPaymentMode(vehicleId, orderErr.response?.data?.message || 'Unable to initiate online payment.');
          }
          return;
        }

        retryPaymentMode(vehicleId, 'Unsupported payment mode.');
      };

      const requestContext = {
        ...contextRef.current,
        activated: (hasUserSession || verifiedUserRef.current || authUser?.role === 'user')
          ? true
          : contextRef.current.activated,
        intent: contextRef.current.intent || detectedIntent || localIntentRef.current || null
      };
      const response = await voiceService.command({
        text: trimmedText,
        context: requestContext,
        ownerName: ownerNameRef.current || undefined,
        ownerPhone: ownerPhoneRef.current || undefined,
        paymentMethod: paymentMethodRef.current || undefined
      });

      const data = response.data || {};
      const nextContext = data.context || contextRef.current;

      setContext(nextContext);
      contextRef.current = nextContext;

      if (nextContext.intent) {
        setLocalIntent(nextContext.intent);
        localIntentRef.current = nextContext.intent;
      }

      if (data.action === 'payment_required') {
        setResult(null);
        await handlePaymentRequired(data.data || {});
        return;
      }

      if (data.action === 'prompt') {
        setPrompt(data.prompt || 'Please provide more details.');
        setResult(null);
        speak(data.prompt);
      } else if (data.action === 'execute') {
        setPrompt(data.message || 'Done.');
        setResult(data.data || null);
        speak(data.message || 'Command completed.');
        clearContextAfterSuccess();
        if (data.intent === 'park' || data.intent === 'exit') {
          await onAutoLogout?.();
        }
      } else {
        setPrompt(data.message || 'Please try again.');
        speak(data.message || 'Please try again.');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to process command';
      if (isVehicleNotFoundError(error)) {
        askVehicleNumberAgain('Vehicle was not found in active parking.');
      } else {
        setPrompt(message);
        speak(message);
      }
      toast.error(message);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirePhoneLogin, authUser, hasUserSession, handlePhoneVerification, speak, onAutoLogout]);

  useEffect(() => {
    if (!supportsSpeechRecognition) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = async (event) => {
      const rawText = event.results?.[0]?.[0]?.transcript?.trim();
      const text = normalizeNumericSpacing(rawText || '');
      if (!text) {
        const message = 'No speech detected. Please try again.';
        setPrompt(message);
        toast.error(message);
        return;
      }

      hasResultRef.current = true;
      setTranscript(text);
      setPrompt('Processing...');
      await sendCommand(text);
    };

    recognition.onerror = (event) => {
      stopReasonRef.current = 'error';
      let message = 'Speech recognition error. Please try again.';
      if (event.error === 'no-speech') {
        // FIX: no-speech is not a hard error — don't toast, just prompt softly.
        message = getNoSpeechPrompt(requirePhoneLogin, awakeRef.current);
        setPrompt(message);
        if (isSpeaking) speak(message);
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        message = 'Microphone access denied. Please allow microphone permission.';
        setAutoListen(false);
        autoListenRef.current = false;
      }
      if (event.error === 'aborted') {
        // FIX: aborted is triggered by our own stop() calls — not a real error.
        return;
      }

      setPrompt(message);
      toast.error(message);
      speak(message);
    };

    recognition.onend = () => {
      setRecording(false);
      recordingRef.current = false;
      const stopReason = stopReasonRef.current;
      stopReasonRef.current = null;

      if (!hasResultRef.current && stopReason !== 'error' && stopReason !== 'tts' && stopReason !== 'manual') {
        const message = getNoSpeechPrompt(requirePhoneLogin, awakeRef.current);
        setPrompt(message);
        // FIX: Only speak no-speech prompt when TTS is enabled to avoid loop.
        if (isSpeaking) speak(message);
      }

      if (autoListenRef.current) {
        if (busyRef.current || speakingRef.current) {
          resumeAfterBusyRef.current = true;
        } else if (stopReason !== 'manual') {
          setTimeout(() => startRecording(), 350);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.stop(); } catch (_) { /* ignore */ }
      recognitionRef.current = null;
    };
  // FIX: Include sendCommand and speak so recognition callbacks are always fresh.
  // isSpeaking is included so no-speech TTS behavior updates correctly.
  }, [supportsSpeechRecognition, requirePhoneLogin, sendCommand, speak, isSpeaking, startRecording]);

  useEffect(() => {
    if (!busy && !speaking && resumeAfterBusyRef.current && autoListenRef.current) {
      resumeAfterBusyRef.current = false;
      setTimeout(() => startRecording(), 350);
    }
  }, [busy, speaking, startRecording]);

  useEffect(() => {
    if (requirePhoneLogin && authUser?.role === 'user') {
      const newVerifiedUser = {
        name: authUser.name,
        membershipType: authUser.membershipType || 'regular',
        phone: authUser.phone || ''
      };
      setVerifiedUser(newVerifiedUser);
      verifiedUserRef.current = newVerifiedUser;
      setOwnerName(authUser.name || '');
      ownerNameRef.current = authUser.name || '';
      if (authUser.phone) {
        setOwnerPhone(authUser.phone);
        ownerPhoneRef.current = authUser.phone;
      }
      setAwake(true);
      awakeRef.current = true;
      setContext((prev) => {
        const next = { ...prev, activated: true };
        contextRef.current = next;
        return next;
      });
      setPrompt('You can now say park or exit.');
    }
  }, [authUser, requirePhoneLogin]);

  useEffect(() => {
    if (hasUserSession && !awake) {
      setAwake(true);
      awakeRef.current = true;
      setContext((prev) => {
        const next = { ...prev, activated: true };
        contextRef.current = next;
        return next;
      });
    }
  }, [hasUserSession, awake]);

  const handleSendTyped = async (e) => {
    e.preventDefault();
    const trimmed = typedCommand.trim();
    if (!trimmed) {
      toast.error('Please type a command');
      return;
    }
    if (busy) return;
    setTranscript(trimmed);
    await sendCommand(trimmed);
    setTypedCommand('');
  };

  return (
    <div className="voice-page">
      <div className="voice-header">
        <div>
          <h2>ParkEase Voice Assistant</h2>
          <p>
            {requirePhoneLogin
              ? 'Use voice or text. Say "wake up" to login with your phone.'
              : 'Use voice or text. Start with the wake word "ParkEase".'}
          </p>
        </div>
        <button className="voice-reset" onClick={resetSession} type="button">
          Reset
        </button>
      </div>

      <details className="voice-guide-disclosure">
        <summary className="voice-guide-trigger" aria-label="Quick Start Guide">?</summary>
        
        <div className="voice-guide">
          <h3>Quick Start Guide</h3>
          <ul>
            <li>Click Talk once to enable the microphone. After that, ParkEase keeps listening.</li>
            <li>Say the wake word: {requirePhoneLogin ? '"wake up"' : '"ParkEase"'}.</li>
            <li>Give a command like "park my truck KA05AB1234" or "exit KA05AB1234".</li>
            <li>Supported vehicle types are car, bike, truck, and electric (EV).</li>
            <li>For exit, ParkEase asks your payment method: cash, online, or wallet.</li>
            <li>Use the Typed Command box if the mic is unavailable.</li>
          </ul>
        </div>
        
      </details>

      <div className="voice-grid">
        <div className="voice-card">
          <div className="voice-card-header">
            <div className="voice-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h3>Live Session</h3>
              <p>{prompt}</p>
            </div>
          </div>

          <div className="voice-actions">
            <button
              className={`voice-btn ${recording ? 'recording' : ''}`}
              onClick={recording
                ? () => stopRecording({ disableAuto: true })
                : () => startRecording({ enableAuto: true })
              }
              type="button"
              disabled={busy}
            >
              {recording ? <MicOff size={18} /> : <Mic size={18} />}
              {recording ? 'Stop' : autoListen ? 'Listening' : 'Talk'}
            </button>

            <label className="voice-toggle">
              <input
                type="checkbox"
                checked={isSpeaking}
                onChange={(e) => setIsSpeaking(e.target.checked)}
              />
              Voice replies
            </label>
          </div>

          {requirePhoneLogin && (
            <div className="voice-login-status">
              <span>{awake ? 'Assistant awake' : 'Assistant idle'}</span>
              <span>
                {verifiedUser
                  ? `Logged in as ${verifiedUser.name}`
                  : verifyingPhone
                    ? 'Verifying phone...'
                    : 'Phone not verified'}
              </span>
            </div>
          )}

          <div className="voice-transcript">
            <span>Transcript</span>
            <p>{transcript || 'No speech captured yet.'}</p>
          </div>
        </div>

        <details className="voice-manual-disclosure">
          <summary className="voice-manual-trigger">⌨ Manual Input</summary>
          <div className="voice-card">
            <div className="voice-card-header">
              <div className="voice-icon">
                <MessageSquareText size={20} />
              </div>
              <div>
                <h3>Typed Command</h3>
                <p>Use this when audio is unavailable or to answer prompts.</p>
              </div>
            </div>

            {/* FIX: Use div + onKeyDown instead of <form> to prevent any accidental
                page reload while still supporting Enter key submission. */}
            <div className="voice-form">
              <input
                type="text"
                placeholder={requirePhoneLogin
                  ? 'Wake up, my phone is 9876543210'
                  : 'ParkEase, park my car KA05AB1234'}
                value={typedCommand}
                onChange={(e) => setTypedCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendTyped(e);
                }}
              />
              <button type="button" onClick={handleSendTyped} disabled={busy}>Send</button>
            </div>

            <div className="voice-fields">
              <div>
                <label>{requirePhoneLogin ? 'Owner name' : 'Owner name (optional)'}</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Anirudh"
                  disabled={requirePhoneLogin && Boolean(verifiedUser)}
                />
              </div>
              <div>
                <label>{requirePhoneLogin ? 'Owner phone' : 'Owner phone (optional)'}</label>
                <input
                  type="text"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="9876543210"
                  disabled={requirePhoneLogin && Boolean(verifiedUser)}
                />
              </div>
              <div>
                <label>Exit payment method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="">Ask me while exiting</option>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="wallet">Wallet</option>
                </select>
              </div>
            </div>
          </div>
        </details>
      </div>

      <div className="voice-card voice-result">
        <h3>Command Result</h3>
        {result ? (
          <pre>{JSON.stringify(result, null, 2)}</pre>
        ) : (
          <p>No completed command yet.</p>
        )}
      </div>
    </div>
  );
};

export default VoiceAssistant;