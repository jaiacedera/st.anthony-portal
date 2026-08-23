const GRADE_RATING_SCALE = [
  { minimum: 97.5, rating: 1.0 },
  { minimum: 94.5, rating: 1.25 },
  { minimum: 91.5, rating: 1.5 },
  { minimum: 88.5, rating: 1.75 },
  { minimum: 85.5, rating: 2.0 },
  { minimum: 82.5, rating: 2.25 },
  { minimum: 79.5, rating: 2.5 },
  { minimum: 77.5, rating: 2.75 },
  { minimum: 75, rating: 3.0 },
]

export function gradeToRatingValue(score) {
  for (const band of GRADE_RATING_SCALE) {
    if (score >= band.minimum) {
      return band.rating
    }
  }

  return 5.0
}
