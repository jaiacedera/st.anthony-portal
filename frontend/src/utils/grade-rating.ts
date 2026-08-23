const GRADE_RATING_SCALE = [
  { minimum: 97.5, rating: '1.00' },
  { minimum: 94.5, rating: '1.25' },
  { minimum: 91.5, rating: '1.50' },
  { minimum: 88.5, rating: '1.75' },
  { minimum: 85.5, rating: '2.00' },
  { minimum: 82.5, rating: '2.25' },
  { minimum: 79.5, rating: '2.50' },
  { minimum: 77.5, rating: '2.75' },
  { minimum: 75, rating: '3.00' },
] as const

export function gradeToRating(score: number): string {
  for (const band of GRADE_RATING_SCALE) {
    if (score >= band.minimum) {
      return band.rating
    }
  }

  return '5.00'
}

export function gradeToRemarks(score: number): 'PASSED' | 'FAILED' {
  return score >= 75 ? 'PASSED' : 'FAILED'
}
