const WAKE_WORDS = ['parkease', 'wake up'];
const VEHICLE_ID_REGEX = /[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}/;

const INTENT_KEYWORDS = {
  park: ['park', 'book', 'add'],
  exit: ['exit', 'remove', 'leave', 'take out', 'takeout']
};

const VEHICLE_TYPE_KEYWORDS = {
  car: ['car'],
  bike: ['bike', 'motorbike', 'motorcycle', 'two wheeler', '2 wheeler'],
  truck: ['truck', 'lorry', 'goods vehicle'],
  electric: ['electric', 'ev', 'e v', 'electric vehicle']
};

const PAYMENT_METHOD_KEYWORDS = {
  cash: ['cash'],
  online: ['online', 'upi', 'gpay', 'google pay', 'phonepe', 'paytm', 'card'],
  wallet: ['wallet']
};

const normalizeText = (text) => (text || '').trim();

const normalizeVehicleSpacing = (text = '') => (
  text.replace(/([a-zA-Z0-9])[\s-]+(?=[a-zA-Z0-9])/g, '$1')
);

const detectWakeWord = (text) => {
  const lower = text.toLowerCase();
  return WAKE_WORDS.some((word) => lower.includes(word));
};

const detectIntent = (text) => {
  const lower = text.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((word) => lower.includes(word))) {
      return intent;
    }
  }
  return null;
};

const detectVehicleType = (text) => {
  const lower = text.toLowerCase();
  for (const [type, keywords] of Object.entries(VEHICLE_TYPE_KEYWORDS)) {
    if (keywords.some((word) => lower.includes(word))) {
      return type;
    }
  }
  return null;
};

const detectPaymentMethod = (text) => {
  const lower = text.toLowerCase();
  for (const [method, keywords] of Object.entries(PAYMENT_METHOD_KEYWORDS)) {
    if (keywords.some((word) => lower.includes(word))) {
      return method;
    }
  }
  return null;
};

const detectVehicleId = (text) => {
  const compact = normalizeVehicleSpacing(text).toUpperCase();
  const match = compact.match(VEHICLE_ID_REGEX);
  return match ? match[0] : null;
};

const detectVehicleCandidate = (text) => {
  const compact = normalizeVehicleSpacing(text).toUpperCase();
  const candidates = compact.match(/[A-Z0-9]{6,12}/g);
  if (!candidates) return null;
  return candidates.find((candidate) => /[A-Z]/.test(candidate) && /[0-9]/.test(candidate)) || null;
};

const detectCustomerName = (text) => {
  const patterns = [
    /my name is\s+([a-zA-Z ]{2,})/i,
    /i am\s+([a-zA-Z ]{2,})/i,
    /this is\s+([a-zA-Z ]{2,})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
};

const buildMissingFields = (intent, context) => {
  const missing = [];
  if (intent === 'park') {
    if (!context.vehicleType) missing.push('vehicleType');
    if (!context.vehicleId) missing.push('vehicleId');
  }

  if (intent === 'exit') {
    if (!context.vehicleId) missing.push('vehicleId');
    if (!context.paymentMethod) missing.push('paymentMethod');
  }

  return missing;
};

const parseVoiceCommand = (text, context = {}) => {
  const normalizedText = normalizeText(text);
  const wakeWordDetected = detectWakeWord(normalizedText);
  const vehicleCandidate = detectVehicleCandidate(normalizedText);

  const parsed = {
    wakeWordDetected,
    intent: detectIntent(normalizedText),
    vehicleType: detectVehicleType(normalizedText),
    vehicleId: detectVehicleId(normalizedText),
    paymentMethod: detectPaymentMethod(normalizedText),
    customerName: detectCustomerName(normalizedText),
    normalizedText
  };

  const mergedContext = {
    ...context,
    activated: context.activated || wakeWordDetected,
    intent: parsed.intent || context.intent || null,
    vehicleType: parsed.vehicleType || context.vehicleType || null,
    vehicleId: parsed.vehicleId || context.vehicleId || null,
    paymentMethod: parsed.paymentMethod || context.paymentMethod || null,
    customerName: parsed.customerName || context.customerName || null
  };

  const missingFields = buildMissingFields(mergedContext.intent, mergedContext);
  const invalidVehicleId = Boolean(vehicleCandidate && !parsed.vehicleId);

  return {
    parsed,
    context: mergedContext,
    missingFields,
    invalidVehicleId
  };
};

module.exports = {
  parseVoiceCommand,
  WAKE_WORDS,
  VEHICLE_ID_REGEX
};
