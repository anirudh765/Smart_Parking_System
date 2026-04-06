const { SpeechClient } = require('@google-cloud/speech');

const speechClient = new SpeechClient();

const transcribeAudio = async ({
  audioContent,
  languageCode = 'en-US',
  encoding = 'WEBM_OPUS',
  sampleRateHertz
}) => {
  if (!audioContent) {
    throw new Error('Audio content is required for transcription');
  }

  const config = {
    encoding,
    languageCode,
    enableAutomaticPunctuation: true
  };

  if (sampleRateHertz) {
    config.sampleRateHertz = sampleRateHertz;
  }

  const request = {
    audio: { content: audioContent },
    config
  };

  const [response] = await speechClient.recognize(request);
  const transcripts = (response.results || [])
    .map((result) => result.alternatives?.[0]?.transcript)
    .filter(Boolean);

  const transcript = transcripts.join(' ').trim();
  const confidence = response.results?.[0]?.alternatives?.[0]?.confidence ?? null;

  return { transcript, confidence, raw: response };
};

module.exports = { transcribeAudio };
