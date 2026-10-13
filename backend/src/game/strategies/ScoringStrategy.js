class ScoringStrategy {
    static calculateGuessPoints(timeLeft, totalTime) {
        if (!Number.isFinite(totalTime) || totalTime <= 0) {
            throw new Error("Invalid drawing duration");
        }

        const remaining = Math.max(
            0,
            Math.min(timeLeft, totalTime)
        );

        const minPoints = 50;
        const maxPoints = 1000;

        const rawPoints = minPoints +
            (maxPoints - minPoints) * (remaining / totalTime);

        return Math.round(rawPoints / 5) * 5;
    }
}

module.exports = ScoringStrategy;