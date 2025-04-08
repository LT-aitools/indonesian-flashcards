export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      // First get Azure token
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
        throw new Error('Failed to get Azure token');
      }
  
      const accessToken = await tokenResponse.text();
  
      // Then use token to get speech
      const { text, lang, voice } = req.body;
      
      const ssml = `
        <speak version='1.0' xml:lang='${lang}'>
          <voice xml:lang='${lang}' name='${voice}'>
            <prosody rate='0.9'>${text}</prosody>
          </voice>
        </speak>
      `;
  
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
        throw new Error('Azure TTS request failed');
      }
  
      // Get the audio data
      const audioBuffer = await ttsResponse.arrayBuffer();
  
      // Send it back to the client
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(audioBuffer));
  
    } catch (error) {
      console.error('TTS Error:', error);
      res.status(500).json({ error: 'TTS service error' });
    }
  }