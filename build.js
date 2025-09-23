const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const artworksConfigPath = path.join(__dirname, 'artworks.yml');
const config = yaml.load(fs.readFileSync(artworksConfigPath, 'utf8'));

if (!config.generate_artworks) {
    console.log('Artwork generation is disabled.');
    process.exit(0);
}

const artworkTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{title}} - {{siteName}}</title>
  <link rel="icon" type="image/png" sizes="32x32" href="../themes/default/images/favicons/favicon-32x32.png">
  <link rel="stylesheet" href="../themes/default/styles.css" />
  <style>
    body { padding-bottom: 100px; }
    .artwork-container { max-width: 800px; margin: 0 auto; padding: 40px 20px 20px; text-align: center; }
    .artwork-image { max-width: 500px; width: 90%; height: auto; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); margin-bottom: 30px; }
    .artwork-title { font-size: 2.5rem; font-weight: bold; margin-bottom: 6px; color: #333; }
    .artwork-description { font-size: 1.2rem; color: #666; margin-bottom: 40px; line-height: 1.6; }
    .artwork-links { display: flex; flex-direction: column; gap: 15px; max-width: 400px; margin: 0 auto; }
    .artwork-link { display: flex; align-items: center; justify-content: center; padding: 15px 25px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; transition: transform 0.3s ease, box-shadow 0.3s ease; }
    .artwork-link:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4); }
    .artwork-link i { margin-right: 10px; font-size: 1.2rem; }
    .back-link { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(102, 126, 234, 0.95); color: white; text-decoration: none; font-weight: 600; display: flex; align-items: center; padding: 15px 30px; border-radius: 50px; backdrop-filter: blur(10px); box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3); transition: all 0.3s ease; z-index: 1000; border: 2px solid rgba(255, 255, 255, 0.2); }
    .back-link:hover { background: rgba(118, 75, 162, 0.95); transform: translateX(-50%) translateY(-5px); box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4); }
    .back-link i { margin-right: 8px; font-size: 1rem; }
    @media (max-width: 768px) {
      .artwork-container { padding: 20px 15px; }
      .artwork-image { max-width: 400px; width: 85%; }
      .artwork-title { font-size: 2rem; }
      .artwork-description { font-size: 1rem; }
      .back-link { bottom: 20px; padding: 12px 25px; font-size: 0.9rem; }
    }
    @media (max-width: 480px) {
      .artwork-image { max-width: 320px; width: 80%; }
      .back-link { bottom: 15px; padding: 10px 20px; font-size: 0.85rem; }
    }
  </style>
</head>
<body>
  <div class="artwork-container">
    <img src="../{{image}}" alt="{{altText}}" class="artwork-image" />
    <h1 class="artwork-title">{{title}}</h1>
    <p class="artwork-description">{{description}}</p>
    <div class="artwork-links">
      <a href="{{dripHausUrl}}" target="_blank" class="artwork-link">
        <i class="fa-solid fa-paintbrush"></i>View on Drip Haus
      </a>
      <a href="{{solscanUrl}}" target="_blank" class="artwork-link">
        <i class="fa-solid fa-chart-line"></i>View on Solscan
      </a>
    </div>
  </div>
  <a href="../" class="back-link">
    <i class="fa-solid fa-arrow-left"></i>Dogame's Links
  </a>
  <script src="../themes/default/fontawesome/js/all.js" data-auto-replace-svg="nest"></script>
</body>
</html>`;

function generateArtworkPages() {
    const baseUrl = config.site.base_url;
    
    config.artworks.forEach(artwork => {
        const artworkDir = path.join(__dirname, '_output', artwork.slug);
        if (!fs.existsSync(artworkDir)) {
            fs.mkdirSync(artworkDir, { recursive: true });
        }

        let htmlContent = artworkTemplate
            .replace(/{{title}}/g, artwork.title)
            .replace(/{{siteName}}/g, config.site.name)
            .replace(/{{description}}/g, artwork.description)
            .replace(/{{image}}/g, artwork.image)
            .replace(/{{altText}}/g, artwork.alt_text)
            .replace(/{{dripHausUrl}}/g, artwork.drip_haus_url || '#')
            .replace(/{{solscanUrl}}/g, artwork.solscan_url || '#');

        const indexPath = path.join(artworkDir, 'index.html');
        fs.writeFileSync(indexPath, htmlContent, 'utf8');
        
        console.log(`Generated: _output/${artwork.slug}/index.html`);
    });
}

console.log('Starting artwork page generation...');
try {
    generateArtworkPages();
    console.log('Generation complete!');
} catch (error) {
    console.error('Error:', error);
    process.exit(1);
}
