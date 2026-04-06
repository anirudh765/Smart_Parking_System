import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, MessageSquareText, Sparkles } from 'lucide-react';
import { authService, voiceService } from '../services/api';
import toast from 'react-hot-toast';
import './VoiceAssistant.css';

const defaultContext = {
  activated: false,
  intent: null,
  vehicleType: null,
  vehicleId: null,
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

const getInitialAuthState = (requirePhoneLogin, authUser) => {
  const isLoggedUser = requirePhoneLogin && authUser?.role === 'user';
  return {
    awake: isLoggedUser,
    prompt: isLoggedUser ? 'You can now say park or exit.' : getDefaultPrompt(requirePhoneLogin),
    context: isLoggedUser ? { ...defaultContext, activated: true } : defaultContext,
    verifiedUser: isLoggedUser
      ? { name: authUser?.name || 'Guest', membershipType: authUser?.membershipType || 'regular' }
      : null,
    ownerName: isLoggedUser ? authUser?.name || '' : '',
    ownerPhone: isLoggedUser ? authUser?.phone || '' : ''
  };
};

const VoiceAssistant = ({ requirePhoneLogin = false, onVerified, authUser }) => {
  const initialAuth = getInitialAuthState(requirePhoneLogin, authUser);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [prompt, setPrompt] = useState(initialAuth.prompt);
  const [context, setContext] = useState(initialAuth.context);
  const [typedCommand, setTypedCommand] = useState('');
  const [ownerName, setOwnerName] = useState(initialAuth.ownerName);
  const [ownerPhone, setOwnerPhone] = useState(initialAuth.ownerPhone);
  const [paymentMethod, setPaymentMethod] = useState('cash');
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

  const canSpeak = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, []);
  const supportsSpeechRecognition = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const hasUserSession = requirePhoneLogin && (verifiedUser || authUser?.role === 'user');

  useEffect(() => {
    autoListenRef.current = autoListen;
  }, [autoListen]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);

  const speak = (text) => {
    if (!isSpeaking || !canSpeak || !text) return;
    if (recordingRef.current) {
      stopRecording({ reason: 'tts' });
    }
    const availableVoices = voices.length ? voices : window.speechSynthesis.getVoices();
    const indianVoice = availableVoices.find((voice) => voice.lang?.toLowerCase().startsWith('en-in'))
      || availableVoices.find((voice) => /india|hindi/i.test(voice.name))
      || null;
    const utterance = new SpeechSynthesisUtterance(text);
    if (indianVoice) {
      utterance.voice = indianVoice;
    }
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
  };

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
    setContext(isLoggedUser ? { ...defaultContext, activated: true } : defaultContext);
    setPrompt(isLoggedUser ? 'You can now say park or exit.' : getDefaultPrompt(requirePhoneLogin));
    setTranscript('');
    setResult(null);
    setAwake(isLoggedUser);
    setVerifiedUser(isLoggedUser
      ? { name: authUser?.name || 'Guest', membershipType: authUser?.membershipType || 'regular' }
      : null
    );
    setOwnerName(isLoggedUser ? authUser?.name || '' : '');
    setOwnerPhone(isLoggedUser ? authUser?.phone || '' : '');
    setLocalIntent(null);
  };

  const stopRecording = ({ disableAuto = false, reason = 'manual' } = {}) => {
    const recognition = recognitionRef.current;
    if (disableAuto) {
      setAutoListen(false);
    }
    stopReasonRef.current = reason;
    if (recognition && recordingRef.current) {
      recognition.stop();
    }
  };

  const startRecording = ({ enableAuto = false } = {}) => {
    if (recordingRef.current || busyRef.current || speakingRef.current) return;

    if (enableAuto) {
      setAutoListen(true);
    }

    if (!supportsSpeechRecognition) {
      const message = 'Voice recognition is not supported in this browser. Please use Chrome.';
      setPrompt(message);
      toast.error(message);
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition) {
      toast.error('Speech recognition is not ready. Please try again.');
      return;
    }

    hasResultRef.current = false;
    stopReasonRef.current = null;
    setRecording(true);
    setPrompt('Listening...');

    try {
      recognition.start();
    } catch (error) {
      setRecording(false);
      toast.error('Unable to start voice recognition');
    }
  };

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
        toast.error('No speech detected. Try again.');
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
        message = 'No speech detected. Try again.';
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        message = 'Microphone access denied.';
      }

      setPrompt(message);
      toast.error(message);
      speak(message);
    };

    recognition.onend = () => {
      setRecording(false);
      const stopReason = stopReasonRef.current;
      stopReasonRef.current = null;
      if (!hasResultRef.current && !stopReason) {
        const message = getNoSpeechPrompt(requirePhoneLogin, awake);
        setPrompt(message);
        speak(message);
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
      recognitionRef.current = null;
    };
  }, [supportsSpeechRecognition, requirePhoneLogin]);

  useEffect(() => {
    if (!busy && !speaking && resumeAfterBusyRef.current && autoListenRef.current) {
      resumeAfterBusyRef.current = false;
      setTimeout(() => startRecording(), 350);
    }
  }, [busy, speaking]);

  useEffect(() => {
    if (requirePhoneLogin && authUser?.role === 'user') {
      setVerifiedUser({ name: authUser.name, membershipType: authUser.membershipType || 'regular' });
      setOwnerName(authUser.name || '');
      if (authUser.phone) {
        setOwnerPhone(authUser.phone);
      }
      setAwake(true);
      setContext((prev) => ({ ...prev, activated: true }));
      setPrompt('You can now say park or exit.');
    }
  }, [authUser, requirePhoneLogin]);

  useEffect(() => {
    if (hasUserSession && !awake) {
      setAwake(true);
      setContext((prev) => ({ ...prev, activated: true }));
    }
  }, [hasUserSession, awake]);

  const handlePhoneVerification = async (text) => {
    const phoneCandidate = extractPhoneNumber(text) || extractPhoneNumber(ownerPhone);
    if (!phoneCandidate) {
      const message = 'Please say your 10-digit phone number to continue.';
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
        return false;
      }

      const loginRes = await authService.loginPhone({ phone: phoneCandidate });
      const userData = loginRes.data?.data || {};
      const name = userData.name || data.name || 'Guest';
      setVerifiedUser({ name, membershipType: userData.membershipType || data.membershipType || 'regular' });
      setOwnerName(name);
      setOwnerPhone(phoneCandidate);
      setContext((prev) => ({ ...prev, activated: true }));
      const message = `Welcome ${name}. You can now say park or exit.`;
      setPrompt(message);
      speak(message);
      onVerified?.(userData);
      return true;
    } catch (error) {
      const message = 'Phone verification failed. Please try again.';
      setPrompt(message);
      speak(message);
      return false;
    } finally {
      setVerifyingPhone(false);
    }
  };

  const sendCommand = async (text) => {
    const trimmedText = (text || '').trim();
    if (!trimmedText) return;

    const detectedIntent = detectLocalIntent(trimmedText);
    if (detectedIntent) {
      setLocalIntent(detectedIntent);
    }

    if (requirePhoneLogin) {
      const isLoggedUser = authUser?.role === 'user';
      if (isLoggedUser && !verifiedUser) {
        setVerifiedUser({
          name: authUser?.name || 'Guest',
          membershipType: authUser?.membershipType || 'regular'
        });
        setOwnerName(authUser?.name || '');
        setOwnerPhone(authUser?.phone || '');
        setAwake(true);
        setContext((prev) => ({ ...prev, activated: true }));
      }

      const lower = trimmedText.toLowerCase();
      if (!awake && !hasUserSession) {
        const hasPhoneOnly = Boolean(extractPhoneNumber(trimmedText));
        if (hasPhoneOnly && !wakePhrases.some((phrase) => lower.includes(phrase))) {
          setAwake(true);
          await handlePhoneVerification(trimmedText);
          return;
        }

        if (wakePhrases.some((phrase) => lower.includes(phrase))) {
          setAwake(true);
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

      if (!verifiedUser && !isLoggedUser) {
        await handlePhoneVerification(trimmedText);
        return;
      }
    }

    setBusy(true);
    try {
      const requestContext = {
        ...context,
        activated: hasUserSession ? true : context.activated,
        intent: context.intent || detectedIntent || localIntent || null
      };
      const response = await voiceService.command({
        text: trimmedText,
        context: requestContext,
        ownerName: ownerName || undefined,
        ownerPhone: ownerPhone || undefined,
        paymentMethod
      });

      const data = response.data || {};
      const nextContext = data.context || context;

      setContext(nextContext);
      if (nextContext.intent) {
        setLocalIntent(nextContext.intent);
      }
      if (data.action === 'prompt') {
        setPrompt(data.prompt || 'Please provide more details.');
        setResult(null);
        speak(data.prompt);
      } else if (data.action === 'execute') {
        setPrompt(data.message || 'Done.');
        setResult(data.data || null);
        speak(data.message || 'Command completed.');
      } else {
        setPrompt(data.message || 'Please try again.');
        speak(data.message || 'Please try again.');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to process command';
      setPrompt(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleSendTyped = async (e) => {
    e.preventDefault();
    if (!typedCommand.trim()) {
      toast.error('Please type a command');
      return;
    }

    setTranscript(typedCommand.trim());
    await sendCommand(typedCommand.trim());
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
        
        
      </div>

      <div className="voice-guide">
        <h3>Quick Start Guide</h3>
        <ul>
          <li>Click Talk once to enable the microphone. After that, ParkEase keeps listening.</li>
          <li>Say the wake word: {requirePhoneLogin ? '"wake up"' : '"ParkEase"'}.</li>
          <li>Give a command like “park my car KA05AB1234” or “exit KA05AB1234”.</li>
          <li>Answer follow-up questions for vehicle type, phone, or payment method.</li>
          <li>Use the Typed Command box if the mic is unavailable.</li>
        </ul>
      </div>

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

          <form className="voice-form" onSubmit={handleSendTyped}>
            <input
              type="text"
              placeholder={requirePhoneLogin
                ? 'Wake up, my phone is 9876543210'
                : 'ParkEase, park my car KA05AB1234'}
              value={typedCommand}
              onChange={(e) => setTypedCommand(e.target.value)}
            />
            <button type="submit" disabled={busy}>Send</button>
          </form>

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
                <option value="cash">Cash</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>
        </div>
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
