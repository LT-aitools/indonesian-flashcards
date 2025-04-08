// Token caching
let cachedToken = null;
let tokenExpiryTime = null;
const TOKEN_VALIDITY_MINUTES = 9; // Use 9 minutes to be safe (actual token validity is 10 minutes)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      // Validate environment variables
      if (!process.env.AZURE_TTS_KEY || !process.env.AZURE_TTS_REGION) {
        console.error('Azure credentials not configured in environment');
        return res.status(500).json({ error: 'Azure credentials not configured' });
      }

      // Validate request body
      const { text, lang, voice } = req.body;
      if (!text || !lang || !voice) {
        console.error('Missing required fields in request:', { text, lang, voice });
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if we have a valid cached token
      const now = Date.now();
      if (!cachedToken || !tokenExpiryTime || now >= tokenExpiryTime) {
        console.log('Token expired or not cached, requesting new token...');
        // Get new token
        const tokenResponse = await fetch(
          `https://${process.env.AZURE_TTS_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
          {
            method: 'POST',
            headers: {
              'Ocp-Apim-Subscription-Key': process.env.AZURE_TTS_KEY
            }
          }
        );
    
        if (!tokenResponse.ok) {
          console.error('Failed to get Azure token:', tokenResponse.status, await tokenResponse.text());
          throw new Error('Failed to get Azure token');
        }
    
        cachedToken = await tokenResponse.text();
        tokenExpiryTime = now + (TOKEN_VALIDITY_MINUTES * 60 * 1000); // Set expiry time
        console.log('Got new Azure token successfully');
      } else {
        console.log('Using cached token');
      }
  
      // Then use token to get speech
      const ssml = `
        <speak version='1.0' xml:lang='${lang}'>
          <voice xml:lang='${lang}' name='${voice}'>
            <prosody rate='0.9'>${text}</prosody>
          </voice>
        </speak>
      `;
  
      console.log('Requesting TTS audio...', { lang, voice });
      const ttsResponse = await fetch(
        `https://${process.env.AZURE_TTS_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cachedToken}`,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
          },
          body: ssml
        }
      );
  
      if (!ttsResponse.ok) {
        console.error('Azure TTS request failed:', ttsResponse.status, await ttsResponse.text());
        throw new Error('Azure TTS request failed');
      }
  
      // Get the audio data
      const audioBuffer = await ttsResponse.arrayBuffer();
      console.log('Got TTS audio successfully');
  
      // Send it back to the client
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(audioBuffer));
  
    } catch (error) {
      console.error('TTS Error:', error);
      res.status(500).json({ error: error.message || 'TTS service error' });
    }
  }