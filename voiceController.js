const { transcribeAudio } = require('../services/speechService');
const { parseVoiceCommand, WAKE_WORDS } = require('../services/commandParser');
const vehicleController = require('./vehicleController');

const createMockRes = () => {
  const res = {
    statusCode: 200,
    payload: null
  };

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

const buildPrompt = (missingFields, invalidVehicleId) => {
  if (!missingFields || missingFields.length === 0) return null;

  if (missingFields.includes('vehicleId')) {
    if (invalidVehicleId) {
      return 'Wrong vehicle number format. Please retry using KA01AB1234.';
    }
    return 'Please tell your vehicle number in the format KA01AB1234.';
  }

  if (missingFields.includes('vehicleType')) {
    return 'Is your vehicle a car or a bike?';
  }

  return 'Please provide the missing details.';
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

    if (!nextContext.activated) {
      const wakePrompt = WAKE_WORDS.map((word) => `"${word}"`).join(' or ');
      return res.status(200).json({
        success: true,
        action: 'prompt',
        prompt: `Say ${wakePrompt} to start.`,
        context: nextContext
      });
    }

    if (invalidVehicleId) {
      return res.status(200).json({
        success: true,
        action: 'prompt',
        prompt: 'Wrong vehicle number format. Please retry using KA01AB1234.',
        context: nextContext
      });
    }

    if (!nextContext.intent) {
      return res.status(200).json({
        success: true,
        action: 'prompt',
        prompt: 'Do you want to park a vehicle or exit a vehicle?',
        context: nextContext
      });
    }

    if (missingFields.length > 0) {
      return res.status(200).json({
        success: true,
        action: 'prompt',
        prompt: buildPrompt(missingFields, invalidVehicleId),
        missingFields,
        context: nextContext
      });
    }

    if (nextContext.intent === 'park') {
      const mockReq = {
        body: {
          vehicleId: nextContext.vehicleId,
          vehicleType: nextContext.vehicleType,
          ownerName: ownerName || nextContext.customerName || undefined,
          ownerPhone
        },
        user: req.user
      };
      const mockRes = createMockRes();
      const mockNext = (err) => {
        if (err) throw err;
      };

      await vehicleController.parkVehicle(mockReq, mockRes, mockNext);

      return res.status(mockRes.statusCode).json({
        success: mockRes.payload?.success ?? mockRes.statusCode < 400,
        action: 'execute',
        intent: 'park',
        message: mockRes.payload?.message || 'Vehicle parked',
        data: mockRes.payload?.data || mockRes.payload
      });
    }

    if (nextContext.intent === 'exit') {
      const mockReq = {
        body: {
          vehicleId: nextContext.vehicleId,
          paymentMethod: paymentMethod || 'cash'
        },
        user: req.user
      };
      const mockRes = createMockRes();
      const mockNext = (err) => {
        if (err) throw err;
      };

      await vehicleController.exitVehicle(mockReq, mockRes, mockNext);

      return res.status(mockRes.statusCode).json({
        success: mockRes.payload?.success ?? mockRes.statusCode < 400,
        action: 'execute',
        intent: 'exit',
        message: mockRes.payload?.message || 'Vehicle exit completed',
        data: mockRes.payload?.data || mockRes.payload
      });
    }

    return res.status(400).json({
      success: false,
      action: 'prompt',
      message: 'Unknown command',
      prompt: 'Please say park or exit, followed by your vehicle details.'
    });
  } catch (error) {
    next(error);
  }
};
