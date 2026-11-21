# NoteHub visual assets

Created with the built-in image generation tool. The files are copied into the project; no external image service is needed at runtime.

- `public/images/study-together.png`: editorial library photograph, used on the home and authentication pages. Final prompt: three culturally diverse university students studying together at a sunlit library table, open notebooks and laptop without logos, warm natural light, subtle violet and blue stationery, authentic education photography, no text or watermarks.
- `public/images/learning-notebook.png`: 3D study illustration, shared by student and admin dashboards. Final prompt: premium editorial 3D illustration of an open paper notebook, floating purple bookmark, blue pencil and peach/lavender books, matte textures, pale lavender studio background, violet/periwinkle accents, diffused light, no text, logos or watermark.
- `public/favicon.svg` and `src/components/common/Logo.jsx`: matching editable vector logo, combining an N, open-book baseline and a small gold spark.

The full shared colour palette is in `src/styles/variables.css`. Animations live in `src/styles/motion.css`, with reduced-motion support. Entrance animations release their transform after completion so hover effects remain functional.

## Exact generation prompts

### study-together.png

Use case: photorealistic-natural. Asset type: landscape hero photograph for a university notes sharing app NoteHub. A beautiful candid editorial photograph of three university students studying together at a sunlit library table, open notebooks, laptop without logos, books, natural smiles and thoughtful concentration, culturally diverse young adults, modest everyday clothing. Warm daylight, subtle violet and blue accents in stationery, premium authentic education photography, crisp subjects, soft background bookshelves, balanced composition suitable for cropping to landscape or portrait. No text, no logos, no watermarks. Save the generated image as a project asset and return the local file path.

### learning-notebook.png

A premium editorial 3D illustration for an education app: open paper notebook, floating purple bookmark, blue pencil and a small stack of peach and lavender books. Soft matte clay and paper textures, pale lavender studio background, violet and periwinkle accents, warm diffused light. Clean centered still life, landscape composition. No text, no logos, no watermark.
