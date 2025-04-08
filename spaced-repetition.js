// Spaced repetition module
const SpacedRepetition = {
    // Constants
    CORRECT_INTERVAL: 60,
    SORTA_INTERVAL: 30,
    INCORRECT_INTERVAL: 15,
    
    // Global counter
    globalWordCounter: 0,
    
    // Word stats
    wordStats: {},
    
    // Initialize the module
    init() {
        this.loadWordStats();
        this.globalWordCounter = Math.floor(Math.random() * 10);
    },
    
    // Load word stats from localStorage
    loadWordStats() {
        try {
            const savedStats = localStorage.getItem('indonesianFlashcardStats');
            if (savedStats) {
                this.wordStats = JSON.parse(savedStats);
            }
        } catch (error) {
            console.error("Error loading word stats:", error);
            this.wordStats = {};
        }
    },
    
    // Save word stats to localStorage
    saveWordStats() {
        try {
            localStorage.setItem('indonesianFlashcardStats', JSON.stringify(this.wordStats));
        } catch (error) {
            console.error("Error saving word stats:", error);
        }
    },
    
    // Initialize stats for new words
    initWordStats(word) {
        const wordKey = `${word.english}:${word.indonesian}`;
        if (!this.wordStats[wordKey]) {
            this.wordStats[wordKey] = {
                correctCount: 0,
                sortaCount: 0,
                incorrectCount: 0,
                lastSeenCount: 0,
                nextReviewCount: 0,
                importance: word.importance || 3,
                level: 1
            };
        } else {
            // Update importance in case it changed
            this.wordStats[wordKey].importance = word.importance || this.wordStats[wordKey].importance;
        }
    },
    
    // Get word stats
    getWordStats(word) {
        const wordKey = `${word.english}:${word.indonesian}`;
        return this.wordStats[wordKey];
    },
    
    // Update stats after a response
    updateStats(word, responseType) {
        const wordKey = `${word.english}:${word.indonesian}`;
        const stats = this.wordStats[wordKey];
        
        // Update appropriate counter
        if (responseType === 'correct') {
            stats.correctCount++;
        } else if (responseType === 'sorta') {
            stats.sortaCount++;
        } else if (responseType === 'incorrect') {
            stats.incorrectCount++;
        }
        
        // Set next review based on response type and importance
        const importanceFactor = 1.5 - (stats.importance * 0.1); // Ranges from 1.0 to 0.5
        let interval;
        
        if (responseType === 'correct') {
            interval = this.CORRECT_INTERVAL;
        } else if (responseType === 'sorta') {
            interval = this.SORTA_INTERVAL;
        } else {
            interval = this.INCORRECT_INTERVAL;
        }
        
        const adjustedInterval = Math.round(interval * importanceFactor);
        stats.nextReviewCount = this.globalWordCounter + adjustedInterval;
        stats.lastSeenCount = this.globalWordCounter;
        
        // Increment global counter
        this.globalWordCounter++;
        
        // Save updated stats
        this.saveWordStats();
        
        return stats;
    },
    
    // Get stats display string
    getStatsDisplay(word) {
        const wordKey = `${word.english}:${word.indonesian}`;
        const stats = this.wordStats[wordKey];
        
        if (stats) {
            const totalReviews = stats.correctCount + stats.sortaCount + stats.incorrectCount;
            let accuracy = 0;
            if (totalReviews > 0) {
                accuracy = Math.round((stats.correctCount / totalReviews) * 100);
            }
            
            return `
                Times seen: ${totalReviews} | 
                Correct: ${stats.correctCount} | 
                Sorta: ${stats.sortaCount} | 
                Incorrect: ${stats.incorrectCount} | 
                Accuracy: ${accuracy}%
            `;
        }
        return 'New word';
    },
    
    // Sort words by priority
    sortByPriority(words) {
        // First, assign scores to each word based on importance and next review count
        words.forEach(word => {
            if (!word) return;
            
            const wordKey = `${word.english}:${word.indonesian}`;
            const stats = this.wordStats[wordKey];
            if (!stats) return;
            
            const importanceScore = (6 - (stats.importance || 3)) * 10; // Invert so 5 is lowest score
            const reviewScore = (stats.nextReviewCount || 0) - this.globalWordCounter;
            
            // Calculate priority score - lower is higher priority
            let priorityScore = reviewScore;
            
            // If the word is due for review (reviewScore <= 0), prioritize by importance
            if (reviewScore <= 0) {
                priorityScore = importanceScore;
            } else {
                // For words not yet due, adjust their priority based on importance
                const importanceFactor = 1 - (((stats.importance || 3) - 1) * 0.15);
                priorityScore = reviewScore * importanceFactor;
            }
            
            stats.priorityScore = priorityScore;
        });
        
        // Sort by priority score (lower is higher priority)
        return words.sort((a, b) => {
            if (!a || !b) return 0;
            
            const keyA = `${a.english}:${a.indonesian}`;
            const keyB = `${b.english}:${b.indonesian}`;
            
            const statsA = this.wordStats[keyA];
            const statsB = this.wordStats[keyB];
            
            if (!statsA || !statsB) return 0;
            
            const scoreA = statsA.priorityScore || 0;
            const scoreB = statsB.priorityScore || 0;
            return scoreA - scoreB;
        });
    },
    
    // Reset all stats while preserving importance weights
    resetStats() {
        Object.keys(this.wordStats).forEach(wordKey => {
            const stats = this.wordStats[wordKey];
            const importance = stats.importance || 3;
            this.wordStats[wordKey] = {
                correctCount: 0,
                sortaCount: 0,
                incorrectCount: 0,
                lastSeenCount: 0,
                nextReviewCount: 0,
                importance: importance,
                level: 1
            };
        });
        
        this.globalWordCounter = 0;
        this.saveWordStats();
    }
}; 