// Text-to-speech module
const TextToSpeech = {
    // Voice selection variables
    voices: [],
    selectedVoice: null,
    speechSynthesisInitialized: false,

    // Initialize voice options
    initSpeechSynthesis() {
        if (this.speechSynthesisInitialized) return;
        
        // Load available voices
        this.voices = window.speechSynthesis.getVoices();
        console.log("Available voices:", this.voices.map(v => `${v.name} (${v.lang})`));
        
        // Initialize voice selector
        const voiceSelect = document.getElementById('voice-select');
        
        // Clear voice select
        while (voiceSelect.options.length > 1) {
            voiceSelect.remove(1);
        }
        
        // Add all voices to the selector
        this.voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${v.lang})`;
            voiceSelect.appendChild(option);
        });
        
        // Try to load the previously saved voice
        const savedVoice = localStorage.getItem('selectedVoice');
        if (savedVoice) {
            this.selectedVoice = this.voices.find(v => v.name === savedVoice);
            if (this.selectedVoice) {
                console.log("Loaded saved voice:", this.selectedVoice.name);
                voiceSelect.value = savedVoice;
            }
        }
        
        // If no saved voice, auto-select an Indonesian voice
        if (!this.selectedVoice) {
            // Try to find an Indonesian voice
            this.selectedVoice = this.voices.find(voice => 
                voice.lang.includes('id') || 
                voice.name.toLowerCase().includes('indonesia')
            );
            
            // If no Indonesian voice was found, look for other Asian voices that might work well
            if (!this.selectedVoice) {
                const asianVoices = this.voices.filter(voice => 
                    voice.lang.includes('ms') || // Malay
                    voice.lang.includes('fil') || // Filipino
                    voice.lang.includes('th') || // Thai
                    voice.lang.includes('vi') || // Vietnamese
                    voice.lang.includes('zh') // Chinese (often available on iOS)
                );
                
                if (asianVoices.length > 0) {
                    this.selectedVoice = asianVoices[0];
                    voiceSelect.value = this.selectedVoice.name;
                }
            } else {
                voiceSelect.value = this.selectedVoice.name;
            }
        }
        
        // If a voice was selected, save it for future visits
        if (this.selectedVoice) {
            localStorage.setItem('selectedVoice', this.selectedVoice.name);
            console.log("Selected voice:", this.selectedVoice.name);
        } else {
            console.log("No suitable voice found");
        }
        
        this.speechSynthesisInitialized = true;
    },

    // Update selected voice when the user changes selection
    updateSelectedVoice() {
        const voiceSelect = document.getElementById('voice-select');
        const selectedName = voiceSelect.value;
        
        if (selectedName) {
            this.selectedVoice = this.voices.find(voice => voice.name === selectedName);
            console.log("Selected voice changed to:", this.selectedVoice ? this.selectedVoice.name : "None");
            
            // Save to localStorage for future visits
            localStorage.setItem('selectedVoice', selectedName);
        } else {
            this.selectedVoice = null;
            localStorage.removeItem('selectedVoice');
        }
        
        // Test the selected voice
        this.testSelectedVoice();
    },

    // Test the selected voice with a simple Indonesian phrase
    testSelectedVoice() {
        if (!this.selectedVoice) return;
        
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const testSpeech = new SpeechSynthesisUtterance("Selamat pagi");
        testSpeech.voice = this.selectedVoice;
        testSpeech.lang = 'id-ID';
        testSpeech.rate = 0.9; // Slightly slower rate for better pronunciation
        
        window.speechSynthesis.speak(testSpeech);
    },

    // Enhanced Text-to-speech function that uses the selected voice
    speakWord(word, lang) {
        try {
            if (!word) return;
            
            // Make sure speech synthesis is initialized
            if (!this.speechSynthesisInitialized) {
                this.initSpeechSynthesis();
            }
            
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();
            
            // Create a new utterance
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = lang;
            
            // Use appropriate voice based on language
            if (lang === 'id-ID' && this.selectedVoice) {
                // Use the selected Indonesian voice
                utterance.voice = this.selectedVoice;
                utterance.rate = 0.9; // Slightly slower for better Indonesian pronunciation
            } else {
                // For English, use default voice
                if (lang === 'en-US') {
                    // Try to find an English voice
                    const englishVoice = this.voices.find(voice => 
                        voice.lang.includes('en-US') || 
                        voice.lang.includes('en-GB')
                    );
                    if (englishVoice) {
                        utterance.voice = englishVoice;
                    }
                }
            }
            
            // Speak the word
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error("Error with text-to-speech:", error);
        }
    },

    // Initialize voice selector UI
    initVoiceSelector() {
        const voiceSelector = document.createElement('div');
        voiceSelector.className = 'voice-selector';
        voiceSelector.style.display = 'none';
        voiceSelector.innerHTML = `
            <label for="voice-select">Select Voice for Indonesian Pronunciation:</label>
            <select id="voice-select" onchange="TextToSpeech.updateSelectedVoice()">
                <option value="">Auto-select best voice</option>
            </select>
            <button onclick="TextToSpeech.testSelectedVoice()">Test Voice ("Selamat pagi")</button>
        `;
        document.body.appendChild(voiceSelector);

        // Add keyboard shortcut to toggle voice selector
        document.addEventListener('keydown', function(event) {
            if (event.key === 'v') {
                const voiceSelector = document.querySelector('.voice-selector');
                if (voiceSelector.style.display === 'flex') {
                    voiceSelector.style.display = 'none';
                } else {
                    voiceSelector.style.display = 'flex';
                }
            }
        });
    }
};

// Initialize voice options when voices are loaded
if (window.speechSynthesis) {
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = function() {
            TextToSpeech.initSpeechSynthesis();
        };
    }
} 