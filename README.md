# Indonesian Flashcard Game

An interactive web-based flashcard application for learning Indonesian vocabulary. The app features multiple study modes and spaced repetition to help you learn and retain Indonesian words effectively.

The original vocabulary list in the CSV was developed in conjunction with ChatGPT and Claude, aimed at basic Indonesian for traveling in remote, rural settings and managing basic conversations at markets, villages, public transport, etc.

## Features

### Study Mode

The app includes a dedicated Study mode for focused practice:
- Browse words by category (e.g., Verbs, Nouns, Adjectives)
- View complete word details including:
  - English and Indonesian translations
  - Example sentences in both languages
  - Personal notes (if available)
- Perfect for:
  - Reviewing vocabulary before starting game levels
  - Learning new words in context
  - Understanding word usage through examples
  - Quick reference during practice

### Flashcard Mode

The app offers six different levels of difficulty and interaction:

1. **Level 1: Basic Flashcards**
   - Shows Indonesian word → English translation
   - Includes example sentences and personal notes
   - Three hints available:
     - First letter of the English word
     - Number of letters in the word
     - Personal note (if available)

2. **Level 2: English to Indonesian**
   - Shows English word → Indonesian translation
   - Includes example sentences
   - Two hints available:
     - First letter of the Indonesian word
     - Number of letters in the word

3. **Level 3: Sentence Practice**
   - Shows English sentence → Indonesian translation
   - Includes word-by-word breakdown
   - Two hints available:
     - First word of the sentence
     - Show individual words

4. **Level 4: Indonesian to English Sentences**
   - Shows Indonesian sentence → English translation
   - Includes word-by-word breakdown
   - Two hints available:
     - First word of the sentence
     - Show individual words

5. **Level 5: Sound Only**
   - Plays Indonesian word without showing it
   - Includes play button to replay the word
   - Two hints available:
     - First letter of the word
     - Number of letters in the word

6. **Level 6: Sound Only Sentences**
   - Plays Indonesian sentence without showing it
   - Includes play button to replay the sentence
   - Two hints available:
     - First word of the sentence
     - Show individual words

### Additional Features

- **Spaced Repetition**: Words you find difficult appear more frequently
- **Progress Tracking**: Tracks your performance across all levels
- **Category Selection**: Filter words by category (e.g., Verbs, Nouns, etc.)
- **Reset Function**: Option to reset progress and start fresh
- **Responsive Design**: Works on both desktop and mobile devices

## Technical Details

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Basic understanding of HTML, CSS, and JavaScript (for development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/indonesian-flashcards.git
   ```

2. Navigate to the project directory:
   ```bash
   cd indonesian-flashcards
   ```

3. Open `index.html` in your web browser to start using the application.

### Project Structure

- `index.html`: Main landing page with level selection
- `level1.html` through `level6.html`: Individual level pages
- `style.css`: Global styles
- `script.js`: Shared JavaScript functions
- `images/`: Contains all images used in the application
- `vocabulary.csv`: Source data for the flashcards

### Data Format

The application uses a CSV file (`vocabulary.csv`) with the following columns:
- Column A: Category/Type
- Column B: English word
- Column C: Indonesian word
- Column D: Example sentence
- Column E: Example in Indonesian
- Column F: Example in English
- Column G: Importance weight (1-5)
- Column H: Personal notes

### Development

To modify the application:
1. Edit the HTML files to change the structure
2. Modify `style.css` to update the appearance
3. Update `script.js` to change functionality
4. Edit `vocabulary.csv` to add or modify vocabulary

## Contributing

Feel free to submit issues and enhancement requests to hello@letstalkaitools.com