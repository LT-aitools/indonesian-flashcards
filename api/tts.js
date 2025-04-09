// Token caching
let cachedToken = null;
let tokenExpiryTime = null;
const TOKEN_VALIDITY_MINUTES = 9; // Use 9 minutes to be safe (actual token validity is 10 minutes)

// --- Retry Helper --- 
async function fetchWithRetry(url, options, maxAttempts = 3, initialDelay = 500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response; // Success!
      }
      // Handle non-retryable HTTP errors (like 4xx)
      if (response.status >= 400 && response.status < 500) {
        console.error(`Fetch failed with status ${response.status} (Attempt ${attempt}/${maxAttempts}). Not retrying client errors.`);
        // Throw an error to be caught by the main handler, including status for context
        const error = new Error(`Request failed with status ${response.status}`);
        error.status = response.status;
        error.responseText = await response.text().catch(() => 'Could not read error body'); 
        throw error;
      }
      // For 5xx errors or other non-ok statuses, log and retry
      console.warn(`Fetch failed with status ${response.status} (Attempt ${attempt}/${maxAttempts}). Retrying...`);
      // If it's the last attempt, throw an error based on the response
      if (attempt === maxAttempts) {
         const error = new Error(`Request failed after ${maxAttempts} attempts with status ${response.status}`);
         error.status = response.status;
         error.responseText = await response.text().catch(() => 'Could not read error body'); 
         throw error;
      }
      
    } catch (error) {
      console.warn(`Fetch attempt ${attempt}/${maxAttempts} failed with error: ${error.message}. Cause: ${error.cause?.code}`);
      // Check if it's a retryable network error and if we have attempts left
      const isRetryable = error.cause && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED'].includes(error.cause.code);
      if (!isRetryable || attempt === maxAttempts) {
        console.error(`Fetch failed after ${attempt} attempts. Not retrying or final attempt failed.`);
        throw error; // Final attempt failed or non-retryable error, re-throw
      }
      // Wait before retrying
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(`Waiting ${delay}ms before next retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  // Should not be reached if maxAttempts >= 1, but acts as a safeguard
  throw new Error('fetchWithRetry exhausted attempts unexpectedly.');
}
// --- End Retry Helper ---

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
        // Get new token using retry helper
        const tokenResponse = await fetchWithRetry(
          `https://${process.env.AZURE_TTS_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
          {
            method: 'POST',
            headers: {
              'Ocp-Apim-Subscription-Key': process.env.AZURE_TTS_KEY
            }
          }
        );
    
        // Note: fetchWithRetry throws on non-ok status after retries, so no need to check !tokenResponse.ok here
        cachedToken = await tokenResponse.text();
        tokenExpiryTime = now + (TOKEN_VALIDITY_MINUTES * 60 * 1000); // Set expiry time
        console.log('Got new Azure token successfully after retries (if any).');
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
      // Get TTS audio using retry helper
      const ttsResponse = await fetchWithRetry(
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
  
      // Note: fetchWithRetry throws on non-ok status after retries
      
      // Get the audio data
      const audioBuffer = await ttsResponse.arrayBuffer();
      console.log('Got TTS audio successfully after retries (if any).');
  
      // Send it back to the client
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(audioBuffer));
  
    } catch (error) {
      console.error('TTS Error caught in handler:', error);
      // Use status from error if available (set by fetchWithRetry for HTTP errors)
      const status = error.status || 500;
      // Include response text if available
      const message = error.responseText || error.message || 'TTS service error';
      res.status(status).json({ error: message });
    }
  }