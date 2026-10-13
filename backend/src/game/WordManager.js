class WordManager {
    constructor(words) {
        this.words = words;
    }
    // Pick 'count' unique random words
    generateChoices(count = 3) {

        // const shuffled = [...this.words].sort(() => 0.5 - Math.random());   // wont provide every permutaion equal probability
        const uniqueWords = [...new Set(this.words)];

        for (let i = uniqueWords.length - 1; i > 0; i--) {  // Fisher–Yates algorithm:
            const j = Math.floor(Math.random() * (i + 1));

            [uniqueWords[i], uniqueWords[j]] = [uniqueWords[j], uniqueWords[i]];
        }
        // Slice the first 'count' number of items
        return uniqueWords.slice(0, count);
    }

    maskWord(word) {
        // TODO: Replace letters with underscores
        // Preserve spaces
        const splits = word.split('');
        const masked = [];

        for(const letter of splits){
            if(letter !== ' '){
                masked.push("_");
                masked.push(" ");
            }   
            else{
                masked.push(" ");
            }
        }

        return masked.join('').trimEnd();
    }
}

module.exports = WordManager;