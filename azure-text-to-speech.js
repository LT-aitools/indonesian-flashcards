// Azure Text-to-Speech Module
const AzureTTS = {
    // Voice configuration
    indonesianVoice: 'id-ID-GadisNeural', // Female Indonesian voice
    englishVoice: 'en-US-JennyNeural', // Female English voice
    isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    voices: [], // Store available voices
    hasUserInteracted: false, // Track if user has interacted
    audioCache: new Map(), // Cache for preloaded audio
    apiEndpoint: 'https://flashcards.letstalkaitools.com/api/tts',
    
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
    
    // Preload audio for the next word
    async preloadAudio(text, lang) {
        if (!text || !lang) return;
        
        const cacheKey = `${text}-${lang}`;
        if (this.audioCache.has(cacheKey)) {
            console.log('Audio already cached for:', text);
            return;
        }

        try {
            console.log('Preloading audio for:', text);
            const voice = lang === 'id-ID' ? this.indonesianVoice : this.englishVoice;
            
            const response = await fetch(this.apiEndpoint, {
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
                throw new Error('Failed to preload audio');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            this.audioCache.set(cacheKey, audioUrl);
            console.log('Audio preloaded for:', text);
        } catch (error) {
            console.error('Error preloading audio:', error);
            // Log the error but don't fall back here, let speakWord handle fallback
            this.audioCache.delete(cacheKey); // Remove preloading flag on error
            // Optionally, re-throw or handle specific errors if needed
            // For now, just log it, fallback will happen on speakWord if needed
        }
    },
    
    // Use cached audio if available, otherwise fetch new audio
    async speakWord(text, lang) {
        try {
            if (!text) return;
            
            console.log('Speaking word:', { text, lang, isLocal: this.isLocal });
            
            // Always use browser TTS until user interacts
            if (!this.hasUserInteracted) {
                console.log('No user interaction yet - using browser TTS');
                await this.useBrowserTTS(text, lang);
                return;
            }
            
            // Use browser TTS in local development
            if (this.isLocal) {
                await this.useBrowserTTS(text, lang);
                return;
            }

            // Check cache first
            const cacheKey = `${text}-${lang}`;
            if (this.audioCache.has(cacheKey)) {
                console.log('Using cached audio for:', text);
                const audio = new Audio(this.audioCache.get(cacheKey));
                await audio.play();
                return;
            }
            
            // If not in cache, fetch and play
            try {
                await this.useAzureTTS(text, lang);
            } catch (error) {
                console.error('Azure TTS failed, falling back to browser TTS:', error);
                await this.useBrowserTTS(text, lang);
            }
        } catch (error) {
            console.error('Error with TTS:', error);
        }
    },
    
    // Use Azure TTS via our API endpoint
    async useAzureTTS(text, lang) {
        try {
            // Determine voice based on language
            const voice = lang === 'id-ID' ? this.indonesianVoice : this.englishVoice;
            
            console.log('Requesting TTS...', { text, lang, voice });
            
            // Call our secure API endpoint
            const response = await fetch(this.apiEndpoint, {
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
        console.log(`[Browser TTS] Attempting to speak: "${text}" in ${lang}`);
        return new Promise((resolve, reject) => {
            if (!window.speechSynthesis) {
                console.error('[Browser TTS] Speech synthesis not supported');
                reject(new Error('Speech synthesis not supported'));
                return;
            }

            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            const voice = this.findBestVoice(lang);
            
            if (voice) {
                console.log(`[Browser TTS] Selected voice: ${voice.name} (${voice.lang})`);
                utterance.voice = voice;
            } else {
                console.warn(`[Browser TTS] No suitable voice found for ${lang}, using default`);
            }

            utterance.lang = lang;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            utterance.onstart = () => {
                console.log(`[Browser TTS] Started speaking: "${text}"`);
            };

            utterance.onend = () => {
                console.log(`[Browser TTS] Finished speaking: "${text}"`);
                resolve();
            };

            utterance.onerror = (event) => {
                console.error(`[Browser TTS] Error speaking: "${text}"`, event);
                reject(event);
            };

            window.speechSynthesis.speak(utterance);
        });
    },
    
    // Clean up old cached audio URLs
    clearOldCache() {
        if (this.audioCache.size > 20) { // Keep last 20 items
            const entries = Array.from(this.audioCache.entries());
            const toRemove = entries.slice(0, entries.length - 20);
            toRemove.forEach(([key, url]) => {
                URL.revokeObjectURL(url);
                this.audioCache.delete(key);
            });
        }
    }
};

// Initialize voices when the page loads
window.addEventListener('load', () => {
    AzureTTS.initVoices();
    
    // Log browser capabilities
    console.log('Browser TTS supported:', 'speechSynthesis' in window);
    console.log('Audio playback supported:', 'Audio' in window);
    
    // Add click handler to enable audio after user interaction
    document.addEventListener('click', () => {
        if (!AzureTTS.hasUserInteracted) {
            console.log('User has interacted - enabling Azure TTS');
            AzureTTS.hasUserInteracted = true;
        }
    }, { once: true }); // Only need to capture the first click
}); 