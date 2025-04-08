// Azure Text-to-Speech Module
const AzureTTS = {
    // Azure TTS Configuration
    token: null,
    tokenExpiration: 0,
    isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    
    // Voice configuration
    indonesianVoice: 'id-ID-GadisNeural', // Female Indonesian voice
    englishVoice: 'en-US-JennyNeural', // Female English voice
    
    // Initialize Azure TTS
    async init() {
        try {
            if (this.isLocal) {
                // For local development, use browser TTS
                console.log('Running in local development mode - using browser TTS');
                return;
            }
            
            // For production, get token from server
            await this.getToken();
            console.log('Azure TTS initialized successfully');
        } catch (error) {
            console.error('Error initializing Azure TTS:', error);
        }
    },
    
    // Get authentication token from server
    async getToken() {
        try {
            const now = Date.now();
            if (this.token && now < this.tokenExpiration) {
                return this.token;
            }
            
            const response = await fetch('/api/azure-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to get Azure TTS token');
            }
            
            const data = await response.json();
            this.token = data.token;
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
            
            if (this.isLocal) {
                // Use browser TTS in local development
                this.useBrowserTTS(text, lang);
                return;
            }
            
            // Use Azure TTS in production
            await this.useAzureTTS(text, lang);
        } catch (error) {
            console.error('Error with TTS:', error);
            // Fall back to browser TTS
            this.useBrowserTTS(text, lang);
        }
    },
    
    // Use Azure TTS
    async useAzureTTS(text, lang) {
        // Get fresh token if needed
        await this.getToken();
        
        // Determine voice based on language
        const voice = lang === 'id-ID' ? this.indonesianVoice : this.englishVoice;
        
        // SSML for better pronunciation
        const ssml = `
            <speak version='1.0' xml:lang='${lang}'>
                <voice xml:lang='${lang}' name='${voice}'>
                    <prosody rate='0.9'>${text}</prosody>
                </voice>
            </speak>
        `;
        
        // Make request to server
        const response = await fetch('/api/azure-tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ssml: ssml,
                token: this.token
            })
        });
        
        if (!response.ok) {
            throw new Error('Azure TTS request failed');
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
    AzureTTS.init();
}); 