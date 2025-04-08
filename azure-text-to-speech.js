// Azure Text-to-Speech Module
const AzureTTS = {
    // Voice configuration
    indonesianVoice: 'id-ID-GadisNeural', // Female Indonesian voice
    englishVoice: 'en-US-JennyNeural', // Female English voice
    isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    voices: [], // Store available voices
    
    // Initialize voices for browser TTS
    initVoices() {
        // Get the voices and store them
        this.voices = window.speechSynthesis.getVoices();
        if (this.voices.length === 0) {
            // Chrome needs a callback for voices to load
            window.speechSynthesis.onvoiceschanged = () => {
                this.voices = window.speechSynthesis.getVoices();
                console.log('Voices loaded:', this.voices.length);
                // Log available voices for debugging
                this.voices.forEach(voice => {
                    console.log(`Available voice: ${voice.name} (${voice.lang})`);
                });
            };
        } else {
            // Log available voices for debugging
            this.voices.forEach(voice => {
                console.log(`Available voice: ${voice.name} (${voice.lang})`);
            });
        }
    },
    
    // Find the best voice for the language
    findBestVoice(lang) {
        if (this.voices.length === 0) {
            this.voices = window.speechSynthesis.getVoices();
        }

        let voice;
        
        if (lang === 'id-ID') {
            // For Indonesian, try these in order:
            voice = this.voices.find(v => v.lang === 'id-ID') || // Exact match
                   this.voices.find(v => v.lang.startsWith('id')) || // Any Indonesian
                   this.voices.find(v => v.name.toLowerCase().includes('indonesia')); // Name contains Indonesia
        } else if (lang === 'en-US') {
            // For English, try these in order:
            voice = this.voices.find(v => v.lang === 'en-US') || // US English
                   this.voices.find(v => v.lang.startsWith('en')) || // Any English
                   this.voices.find(v => v.name.toLowerCase().includes('english')); // Name contains English
        }

        if (voice) {
            console.log(`Selected voice for ${lang}:`, voice.name);
        } else {
            console.log(`No specific voice found for ${lang}, using default`);
        }

        return voice;
    },
    
    // Speak a word using either Azure TTS or browser TTS
    async speakWord(text, lang) {
        try {
            if (!text) return;
            
            console.log('Speaking word:', { text, lang, isLocal: this.isLocal });
            
            // Use browser TTS in local development
            if (this.isLocal) {
                await this.useBrowserTTS(text, lang);
                return;
            }
            
            // Use Azure TTS via our secure API endpoint
            await this.useAzureTTS(text, lang);
        } catch (error) {
            console.error('Error with TTS:', error);
            // Fall back to browser TTS
            await this.useBrowserTTS(text, lang);
        }
    },
    
    // Use Azure TTS via our API endpoint
    async useAzureTTS(text, lang) {
        try {
            // Determine voice based on language
            const voice = lang === 'id-ID' ? this.indonesianVoice : this.englishVoice;
            
            console.log('Requesting TTS...', { text, lang, voice });
            
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
                const error = await response.json();
                throw new Error(error.error || 'TTS request failed');
            }
            
            // Convert response to audio blob
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Play the audio
            const audio = new Audio(audioUrl);
            audio.onended = () => URL.revokeObjectURL(audioUrl);
            
            // Add error handling for audio playback
            audio.onerror = (e) => {
                console.error('Audio playback error:', e);
            };
            
            // Log before playing
            console.log('Attempting to play audio...');
            
            try {
                // Try to play with await to catch any autoplay issues
                await audio.play();
                console.log('Audio playing successfully');
            } catch (playError) {
                console.error('Audio play error:', playError);
                // If autoplay failed, we might need user interaction
                if (playError.name === 'NotAllowedError') {
                    console.log('Autoplay prevented - falling back to browser TTS');
                    await this.useBrowserTTS(text, lang);
                }
            }
        } catch (error) {
            console.error('Error with TTS:', error);
            throw error;
        }
    },
    
    // Use browser TTS
    async useBrowserTTS(text, lang) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Using browser TTS:', { text, lang });
                
                // Cancel any ongoing speech
                window.speechSynthesis.cancel();
                
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = lang;
                utterance.rate = 0.9;
                
                // Find the best voice for this language
                const voice = this.findBestVoice(lang);
                if (voice) {
                    utterance.voice = voice;
                }
                
                // Add event handlers
                utterance.onend = () => {
                    console.log('Browser TTS finished');
                    resolve();
                };
                
                utterance.onerror = (event) => {
                    console.error('Browser TTS error:', event);
                    reject(event);
                };
                
                // Speak the text
                window.speechSynthesis.speak(utterance);
                console.log('Browser TTS started');
            } catch (error) {
                console.error('Browser TTS error:', error);
                reject(error);
            }
        });
    }
};

// Initialize voices when the page loads
window.addEventListener('load', () => {
    AzureTTS.initVoices();
    
    // Log browser capabilities
    console.log('Browser TTS supported:', 'speechSynthesis' in window);
    console.log('Audio playback supported:', 'Audio' in window);
}); 