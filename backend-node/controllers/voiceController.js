const { transcribeAudio } = require('../services/speechService');
const { parseVoiceCommand, WAKE_WORDS } = require('../services/commandParser');
const vehicleController = require('./vehicleController');

// FIX: Accepted payment methods — validate before passing to exitVehicle.
const VALID_PAYMENT_METHODS = ['cash', 'online', 'wallet'];

// FIX: Vehicle ID pattern per the KA01AB1234 format:
// 2 letters (state) + 2 digits (district) + 1-3 letters (series) + 4 digits (number)
const VEHICLE_ID_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$/i;

const validateVehicleId = (vehicleId) => {
  if (!vehicleId) return false;
  return VEHICLE_ID_REGEX.test(vehicleId.trim());
};

const createMockRes = () => {
  const res = {
    statusCode: 200,
    payload: null
  };

  res.cookie = () => res;
  res.clearCookie = () => res;

  res.status = (code) => {
    res.statusCode = code;
    return res;
  };

  res.json = (payload) => {
    res.payload = payload;
    return res;
  };

  return res;
};

const getBillPreview = async (vehicleId, reqUser) => {
  const mockReq = {
    params: { vehicleId },
    user: reqUser
  };
  const mockRes = createMockRes();
  let caughtError = null;
  const mockNext = (err) => {
    if (err) caughtError = err;
  };

  await vehicleController.getVehicleBill(mockReq, mockRes, mockNext);
  if (caughtError) throw caughtError;
  return {
    statusCode: mockRes.statusCode,
    payload: mockRes.payload
  };
};

// FIX: Expanded buildPrompt to cover all missingFields cases individually
// so users always get an actionable, specific prompt rather than a generic fallback.
const buildPrompt = (missingFields, invalidVehicleId) => {
  if (!missingFields || missingFields.length === 0) return null;

  if (missingFields.includes('vehicleId')) {
    if (invalidVehicleId) {
      return 'Wrong vehicle number format. Please retry using the format KA01AB1234 — two letters, two digits, up to three letters, four digits.';
    }
    return 'Please tell me your vehicle number in the format KA01AB1234.';
  }

  if (missingFields.includes('vehicleType')) {
    return 'Please tell your vehicle type: car, bike, truck, or electric.';
  }

  // FIX: Handle all other possible missing fields explicitly.
  if (missingFields.includes('intent')) {
    return 'Do you want to park a vehicle or exit a vehicle?';
  }

  if (missingFields.includes('ownerName')) {
    return 'Please tell me the owner name for this vehicle.';
  }

  if (missingFields.includes('paymentMethod')) {
    return 'How will you pay for exit: cash, online, or wallet?';
  }

  return 'Please provide the missing details to continue.';
};

exports.transcribe = async (req, res, next) => {
  try {
    const { audioContent, languageCode, encoding, sampleRateHertz } = req.body;

    if (!audioContent) {
      return res.status(400).json({
        success: false,
        message: 'audioContent is required in request body'
      });
    }

    const result = await transcribeAudio({
      audioContent,
      languageCode,
      encoding,
      sampleRateHertz
    });

    return res.status(200).json({
      success: true,
      message: 'Transcription complete',
      data: {
        transcript: result.transcript,
        confidence: result.confidence
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.command = async (req, res, next) => {
  try {
    const {
      text = '',
      context = {},
      ownerName,
      ownerPhone,
      paymentMethod
    } = req.body;

    const { parsed, context: nextContext, missingFields, invalidVehicleId } = parseVoiceCommand(text, context);

    // --- Wake word check ---
    if (!nextContext.activated) {
      const wakePrompt = WAKE_WORDS.map((word) => `"${word}"`).join(' or ');
      return res.status(200).json({
        success: true,
        action: 'prompt',
        prompt: `Say ${wakePrompt} to start.`,
        context: nextContext
      });
    }

    // --- Vehicle ID format validation (explicit, before missing-fields check) ---
    if (invalidVehicleId) {
      return res.status(200).json({
        success: true,
        action: 'prompt',
        prompt: 'Wrong vehicle number format. Please retry using the format KA01AB1234 — two letters, two digits, up to three letters, four digits.',
        context: nextContext
      });
    }

    // --- Intent not yet known ---
    if (!nextContext.intent) {
      return res.status(200).json({
        success: true,
        action: 'prompt',
        prompt: 'Do you want to park a vehicle or exit a vehicle?',
        context: nextContext
      });
    }

    // --- Missing fields check ---
    if (missingFields && missingFields.length > 0) {
      return res.status(200).json({
        success: true,
        action: 'prompt',
        prompt: buildPrompt(missingFields, invalidVehicleId),
        missingFields,
        context: nextContext
      });
    }

    // --- Validate vehicleId format before executing ---
    if (!validateVehicleId(nextContext.vehicleId)) {
      return res.status(200).json({
        success: true,
        action: 'prompt',
        prompt: 'Wrong vehicle number format. Please retry using the format KA01AB1234 — two letters, two digits, up to three letters, four digits.',
        context: nextContext
      });
    }

    // --- PARK intent ---
    if (nextContext.intent === 'park') {
      const mockReq = {
        body: {
          vehicleId: nextContext.vehicleId.trim().toUpperCase(),
          vehicleType: nextContext.vehicleType,
          ownerName: ownerName || nextContext.customerName || undefined,
          ownerPhone
        },
        user: req.user
      };
      const mockRes = createMockRes();

      // FIX: mockNext now captures errors and surfaces them as error responses
      // instead of silently swallowing them, which previously caused hanging requests.
      let caughtError = null;
      const mockNext = (err) => {
        if (err) caughtError = err;
      };

      await vehicleController.parkVehicle(mockReq, mockRes, mockNext);

      if (caughtError) {
        return next(caughtError);
      }

      // FIX: After a successful execute, reset the conversational context so the
      // next command starts fresh rather than inheriting the old intent/vehicleId.
      const clearedContext = {
        activated: true,
        intent: null,
        vehicleType: null,
        vehicleId: null,
        customerName: null
      };

      return res.status(mockRes.statusCode).json({
        success: mockRes.payload?.success ?? mockRes.statusCode < 400,
        action: 'execute',
        intent: 'park',
        message: mockRes.payload?.message || 'Vehicle parked successfully.',
        data: mockRes.payload?.data || mockRes.payload,
        context: clearedContext
      });
    }

    // --- EXIT intent ---
    if (nextContext.intent === 'exit') {
      // FIX: Validate and default paymentMethod — reject unrecognised values.
      const contextPayment = nextContext.paymentMethod;
      const bodyPayment = VALID_PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : null;
      const resolvedPayment = contextPayment || bodyPayment;

      if (!resolvedPayment) {
        return res.status(200).json({
          success: true,
          action: 'prompt',
          prompt: 'How will you pay for exit: cash, online, or wallet?',
          missingFields: ['paymentMethod'],
          context: nextContext
        });
      }

      if (resolvedPayment === 'online' || resolvedPayment === 'wallet') {
        const billPreview = await getBillPreview(nextContext.vehicleId.trim().toUpperCase(), req.user);
        if (billPreview.statusCode >= 400) {
          const billMessage = billPreview.payload?.message || 'Unable to fetch bill details for payment';
          const vehicleMissing = billPreview.statusCode === 404
            || /vehicle not found in parking|no active parking session found/i.test(billMessage);

          if (vehicleMissing) {
            return res.status(200).json({
              success: true,
              action: 'prompt',
              prompt: 'No active parking found for that vehicle. Please tell the vehicle number again.',
              missingFields: ['vehicleId'],
              context: {
                ...nextContext,
                activated: true,
                intent: 'exit',
                vehicleId: null,
                paymentMethod: null
              }
            });
          }

          return res.status(billPreview.statusCode).json(
            billPreview.payload || {
              success: false,
              message: 'Unable to fetch bill details for payment'
            }
          );
        }

        return res.status(200).json({
          success: true,
          action: 'payment_required',
          intent: 'exit',
          message: `Payment required via ${resolvedPayment} before exit.`,
          prompt: resolvedPayment === 'online'
            ? 'Redirecting to Razorpay for payment. Complete payment to exit.'
            : 'Checking wallet balance before exit payment.',
          data: {
            vehicleId: nextContext.vehicleId.trim().toUpperCase(),
            paymentMethod: resolvedPayment,
            bill: billPreview.payload?.data || null
          },
          context: nextContext
        });
      }

      const mockReq = {
        body: {
          vehicleId: nextContext.vehicleId.trim().toUpperCase(),
          paymentMethod: resolvedPayment
        },
        user: req.user
      };
      const mockRes = createMockRes();

      let caughtError = null;
      const mockNext = (err) => {
        if (err) caughtError = err;
      };

      await vehicleController.exitVehicle(mockReq, mockRes, mockNext);

      if (caughtError) {
        return next(caughtError);
      }

      // FIX: Reset context after successful exit too.
      const clearedContext = {
        activated: true,
        intent: null,
        vehicleType: null,
        vehicleId: null,
        customerName: null
      };

      return res.status(mockRes.statusCode).json({
        success: mockRes.payload?.success ?? mockRes.statusCode < 400,
        action: 'execute',
        intent: 'exit',
        message: mockRes.payload?.message || 'Vehicle exit completed.',
        data: mockRes.payload?.data || mockRes.payload,
        context: clearedContext
      });
    }

    // --- Unrecognised intent fallback ---
    return res.status(400).json({
      success: false,
      action: 'prompt',
      message: 'Unknown command.',
      prompt: 'Please say park or exit, followed by your vehicle details.',
      context: nextContext
    });
  } catch (error) {
    next(error);
  }
};