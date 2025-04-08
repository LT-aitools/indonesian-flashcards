require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Azure TTS Token endpoint
app.post('/api/azure-token', async (req, res) => {
    try {
        // Use the Azure key from GitHub Secrets in production
        const azureKey = process.env.AZURE_TTS_KEY;
        const region = process.env.AZURE_TTS_REGION || 'southeastasia';
        
        if (!azureKey) {
            throw new Error('Azure TTS key not configured');
        }
        
        const response = await fetch(
            `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
            {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': azureKey,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Failed to get Azure TTS token');
        }
        
        const token = await response.text();
        res.json({ token });
    } catch (error) {
        console.error('Error getting Azure token:', error);
        res.status(500).json({ error: 'Failed to get Azure token' });
    }
});

// Azure TTS endpoint
app.post('/api/azure-tts', async (req, res) => {
    try {
        const { ssml, token } = req.body;
        const region = process.env.AZURE_TTS_REGION || 'southeastasia';
        
        const response = await fetch(
            `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
                    'User-Agent': 'IndonesianFlashcards'
                },
                body: ssml
            }
        );
        
        if (!response.ok) {
            throw new Error('Azure TTS request failed');
        }
        
        const audioBuffer = await response.buffer();
        res.set('Content-Type', 'audio/mpeg');
        res.send(audioBuffer);
    } catch (error) {
        console.error('Error with Azure TTS:', error);
        res.status(500).json({ error: 'Failed to generate speech' });
    }
});

// Serve static files
app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 