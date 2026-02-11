# dogame.art

Personal site for Dogame — artist and host of Drawn to the Mic.

## Pages
- **/** — Link tree landing page
- **/about/** — About the artist + Drawn to the Mic
- **/gallery/** — Art gallery loaded from `artworks.yml`

## Adding Artwork
Edit `artworks.yml`, add an entry, push to `main`. The gallery updates automatically.

## Tech
Static HTML/CSS/JS. No build step. Hosted on GitHub Pages with GitHub Actions deploy.

## NFC Deep Links
Physical NFC tags link to `https://dogame.art/gallery/#Slug` — the gallery scrolls to and highlights that piece.

## License
[MIT License](./LICENSE)
