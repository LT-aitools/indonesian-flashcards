// Spaced repetition module
const SpacedRepetition = {
    // Constants for intervals
    CORRECT_INTERVAL: 90,  // Longer delay for words you know well
    SORTA_INTERVAL: 30,    // Medium delay for partially known words
    INCORRECT_INTERVAL: 15, // Quick review for words you got wrong
    
    // Session tracking
    sessionStartTime: null,
    
    // Word stats
    wordStats: {},
    sessionStats: {}, // New: separate stats for current session
    
    // Global counter
    globalWordCounter: 0,
    
    // Initialize the module
    init() {
        this.sessionStartTime = Date.now();
        this.loadWordStats(); // Load persistent stats for reference only
        this.resetSessionStats(); // Start fresh session stats
        this.globalWordCounter = Math.floor(Math.random() * 10);
    },
    
    // Load word stats from localStorage (for reference/history)
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
    
    // Reset session stats
    resetSessionStats() {
        this.sessionStats = {};
        console.log('Session stats reset');
    },
    
    // Initialize stats for new words
    initWordStats(word) {
        const wordKey = `${word.english}:${word.indonesian}`;
        
        // Initialize session stats
        if (!this.sessionStats[wordKey]) {
            this.sessionStats[wordKey] = {
                correctCount: 0,
                sortaCount: 0,
                incorrectCount: 0,
                lastSeenCount: 0,
                nextReviewCount: 0,
                importance: word.importance || 3,
                level: 1
            };
        }
    },
    
    // Get word stats (combines session and historical data)
    getWordStats(word) {
        const wordKey = `${word.english}:${word.indonesian}`;
        const sessionStat = this.sessionStats[wordKey];
        const historicalStat = this.wordStats[wordKey];
        
        if (!sessionStat) return null;
        
        // Return session stats with historical totals
        return {
            ...sessionStat,
            totalCorrect: (historicalStat?.correctCount || 0) + sessionStat.correctCount,
            totalSorta: (historicalStat?.sortaCount || 0) + sessionStat.sortaCount,
            totalIncorrect: (historicalStat?.incorrectCount || 0) + sessionStat.incorrectCount
        };
    },
    
    // Update stats after a response
    updateStats(word, responseType) {
        const wordKey = `${word.english}:${word.indonesian}`;
        const stats = this.sessionStats[wordKey];
        
        if (!stats) {
            this.initWordStats(word);
        }
        
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
        
        return stats;
    },
    
    // Get stats display string
    getStatsDisplay(word) {
        const stats = this.getWordStats(word);
        
        if (stats) {
            const sessionReviews = stats.correctCount + stats.sortaCount + stats.incorrectCount;
            const totalReviews = stats.totalCorrect + stats.totalSorta + stats.totalIncorrect;
            
            let sessionAccuracy = 0;
            if (sessionReviews > 0) {
                sessionAccuracy = Math.round((stats.correctCount / sessionReviews) * 100);
            }
            
            let totalAccuracy = 0;
            if (totalReviews > 0) {
                totalAccuracy = Math.round((stats.totalCorrect / totalReviews) * 100);
            }
            
            return `
                This session: ${sessionReviews} reviews, ${sessionAccuracy}% accuracy | 
                All time: ${totalReviews} reviews, ${totalAccuracy}% accuracy
            `;
        }
        return 'New word';
    },
    
    // Sort words by priority
    sortByPriority(words) {
        // First, assign scores to each word
        words.forEach(word => {
            if (!word) return;
            
            const wordKey = `${word.english}:${word.indonesian}`;
            const stats = this.sessionStats[wordKey];
            if (!stats) {
                this.initWordStats(word);
                return;
            }
            
            const importanceScore = (6 - (stats.importance || 3)) * 10;
            const reviewScore = (stats.nextReviewCount || 0) - this.globalWordCounter;
            
            // Calculate priority score - lower is higher priority
            let priorityScore = reviewScore;
            
            // If the word is due for review, prioritize by importance
            if (reviewScore <= 0) {
                priorityScore = importanceScore;
            }
            
            stats.priorityScore = priorityScore;
        });
        
        // Sort by priority score (lower is higher priority)
        return words.sort((a, b) => {
            if (!a || !b) return 0;
            
            const statsA = this.sessionStats[`${a.english}:${a.indonesian}`];
            const statsB = this.sessionStats[`${b.english}:${b.indonesian}`];
            
            if (!statsA || !statsB) return 0;
            
            return (statsA.priorityScore || 0) - (statsB.priorityScore || 0);
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