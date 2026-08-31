# FitOS v1

A private, offline-first iPhone PWA for:
- onboarding + BMR/TDEE/BMI calculations
- goal calories/macros
- daily weight gate (max 2 skips/week)
- nutrition with the supplied 152-food library
- 5 meal sections + water
- custom foods
- strength workout plans for 3–6 days/week
- last-session numbers + weight PR detection
- walking/treadmill logging
- 50% exercise-calorie credit
- monthly measurements
- progress dashboard
- local JSON backup/restore

## Run locally on Windows
Open PowerShell in the extracted folder:
python -m http.server 8080
Then open http://localhost:8080

## Deploy
Upload all files to a GitHub repo connected to Cloudflare Pages, same as DailyOS.

## Notes
- Fitness calculations are starting estimates, not medical advice.
- Strength/cardio calorie burn is estimated and intentionally labeled/treated conservatively.
- Micronutrient fields are retained in the food library when available; missing values are not treated as zero.
- Barcode scanning is reserved for the next build because browser support/camera behavior differs across iOS versions; manual custom-food entry works now.


## v1.1 updates
- Expanded starter food library with common gym/daily foods including whey protein, peanut butter, avocado, milk, oats, chicken, rice, eggs, bread, fruits, nuts, vegetables, and more.
- Added Saved Recipes: build a shake/meal once and log the entire recipe in one tap to any meal.
- Added Developer Test Date under the profile/settings menu so future-day weigh-in gates can be tested without waiting.


## v1.2 — USDA database
- Integrated USDA FoodData Central SR Legacy data supplied by the user.
- USDA foods normalized: 7,793
- Total searchable entries: 7,972
- Nutrients used when available: calories, protein, carbs, fat, fiber, sugars, saturated fat, sodium, potassium, calcium, iron, vitamin C, vitamin D.
- Curated FitOS foods remain at the beginning of the library.
- Search now prioritizes exact and starts-with matches.
- USDA SR Legacy is strongest for generic/reference foods; branded barcode products will use a separate live lookup later.
