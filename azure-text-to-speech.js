// Azure Text-to-Speech Module
const AzureTTS = {
    // Azure TTS Configuration
    subscriptionKey: '', // Will be set from URL params or window.__env
    region: '', // Will be set from URL params or window.__env
    token: null,
    tokenExpiration: 0,
    isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    
    // Voice configuration
    indonesianVoice: 'id-ID-GadisNeural', // Female Indonesian voice
    englishVoice: 'en-US-JennyNeural', // Female English voice
    
    // Initialize Azure TTS
    async init() {
        try {
            // Get Azure configuration from URL params or window.__env
            const urlParams = new URLSearchParams(window.location.search);
            this.subscriptionKey = urlParams.get('key') || (window.__env && window.__env.AZURE_SUBSCRIPTION_KEY) || '';
            this.region = urlParams.get('region') || (window.__env && window.__env.AZURE_REGION) || '';

            if (this.isLocal) {
                // For local development, use browser TTS if no Azure credentials
                if (!this.subscriptionKey || !this.region) {
                    console.log('Running in local development mode - using browser TTS');
                    return;
                }
            }
            
            // For production, get token
            await this.getToken();
            console.log('Azure TTS initialized successfully');
        } catch (error) {
            console.error('Error initializing Azure TTS:', error);
        }
    },
    
    // Get authentication token directly from Azure
    async getToken() {
        try {
            if (!this.subscriptionKey || !this.region) {
                throw new Error('Azure credentials not configured');
            }

            const now = Date.now();
            if (this.token && now < this.tokenExpiration) {
                return this.token;
            }
            
            const response = await fetch(`https://${this.region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to get Azure TTS token');
            }
            
            this.token = await response.text();
            this.tokenExpiration = now + 540000; // Token expires in 9 minutes
            return this.token;
        } catch (error) {
            console.error('Error getting Azure TTS token:', error);
            throw error;
        }
    },
    
    // Speak a word using either Azure TTS or browser TTS
    async speakWord(text, lang) {
        try {
            if (!text) return;
            
            // Use browser TTS in local development
            if (this.isLocal) {
                this.useBrowserTTS(text, lang);
                return;
            }
            
            // Use Azure TTS via our secure API endpoint
            await this.useAzureTTS(text, lang);
        } catch (error) {
            console.error('Error with TTS:', error);
            // Fall back to browser TTS
            this.useBrowserTTS(text, lang);
        }
    },
    
    // Use Azure TTS via our API endpoint
    async useAzureTTS(text, lang) {
        // Determine voice based on language
        const voice = lang === 'id-ID' ? this.indonesianVoice : this.englishVoice;
        
        // Call our secure API endpoint
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                lang,
                voice
            })
        });
        
        if (!response.ok) {
            throw new Error('TTS request failed');
        }
        
        // Convert response to audio blob
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Play the audio
        const audio = new Audio(audioUrl);
        audio.onended = () => URL.revokeObjectURL(audioUrl);
        await audio.play();
    },
    
    // Use browser TTS
    useBrowserTTS(text, lang) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;
        
        // Try to find a suitable voice
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => 
            v.lang.includes(lang) || 
            (lang === 'id-ID' && v.name.toLowerCase().includes('indonesia')) ||
            (lang === 'en-US' && v.name.toLowerCase().includes('english'))
        );
        
        if (voice) {
            utterance.voice = voice;
        }
        
        window.speechSynthesis.speak(utterance);
    }
};

// Initialize when the page loads
window.addEventListener('load', () => {
    // No initialization needed anymore since we're using the API endpoint
}); 