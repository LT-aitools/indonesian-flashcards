export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      // Validate environment variables
      if (!process.env.AZURE_SUBSCRIPTION_KEY || !process.env.AZURE_REGION) {
        console.error('Azure credentials not configured in environment');
        return res.status(500).json({ error: 'Azure credentials not configured' });
      }

      // Validate request body
      const { text, lang, voice } = req.body;
      if (!text || !lang || !voice) {
        console.error('Missing required fields in request:', { text, lang, voice });
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // First get Azure token
      console.log('Requesting Azure token...');
      const tokenResponse = await fetch(
        `https://${process.env.AZURE_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.AZURE_SUBSCRIPTION_KEY
          }
        }
      );
  
      if (!tokenResponse.ok) {
        console.error('Failed to get Azure token:', tokenResponse.status, await tokenResponse.text());
        throw new Error('Failed to get Azure token');
      }
  
      const accessToken = await tokenResponse.text();
      console.log('Got Azure token successfully');
  
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
        `https://${process.env.AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
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