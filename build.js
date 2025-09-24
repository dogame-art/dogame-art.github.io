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
  
  <!-- SEO Meta Tags -->
  <meta name="description" content="{{description}}">
  <meta property="og:title" content="{{title}} - {{siteName}}" />
  <meta property="og:description" content="{{description}}" />
  <meta property="og:image" content="{{baseUrl}}/{{image}}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta property="twitter:image" content="{{baseUrl}}/{{image}}" />
  <meta property="twitter:title" content="{{title}} - {{siteName}}" />
  
  <!-- Favicon - uses the artwork image -->
  <link rel="icon" type="image/jpeg" href="../{{image}}">
  <link rel="icon" type="image/png" sizes="32x32" href="../{{image}}">
  
  <link rel="stylesheet" href="../themes/default/styles.css" />
  
  <!-- Google Analytics for artwork pages -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-95K6LY8JD8"></script>
  <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-95K6LY8JD8');
  </script>
  
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      margin: 0;
    }
    
    .artwork-container { 
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      animation: fadeInUp 0.8s ease-out;
      padding: 40px 30px;
      text-align: center;
      margin-bottom: 100px;
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .artwork-image { 
      max-width: 500px; 
      width: 90%; 
      height: auto; 
      border-radius: 12px; 
      box-shadow: 0 8px 32px rgba(0,0,0,0.1); 
      margin-bottom: 30px; 
    }
    
    .artwork-title { 
      font-size: 2.5rem; 
      font-weight: 700; 
      margin-bottom: 8px; 
      color: #2d3748;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .artwork-description { 
      font-size: 1.2rem; 
      color: #718096; 
      margin-bottom: 40px; 
      line-height: 1.6; 
      font-weight: 500;
    }
    
    .artwork-links { 
      display: flex; 
      flex-direction: column; 
      gap: 15px; 
      max-width: 400px; 
      margin: 0 auto; 
    }
    
    .artwork-link { 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      padding: 15px 25px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      text-decoration: none; 
      border-radius: 12px; 
      font-weight: 600; 
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
      position: relative;
      overflow: hidden;
    }
    
    .artwork-link::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }
    
    .artwork-link:hover::before {
      left: 100%;
    }
    
    .artwork-link:hover { 
      transform: translateY(-3px); 
      box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4); 
    }
    
    .artwork-link i { 
      margin-right: 10px; 
      font-size: 1.2rem; 
    }
    
    .back-link { 
      position: fixed; 
      bottom: 30px; 
      left: 50%; 
      transform: translateX(-50%); 
      background: rgba(255, 255, 255, 0.95); 
      color: #667eea; 
      text-decoration: none; 
      font-weight: 600; 
      display: flex; 
      align-items: center; 
      padding: 15px 30px; 
      border-radius: 50px; 
      backdrop-filter: blur(10px); 
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1); 
      transition: all 0.3s ease; 
      z-index: 1000; 
      border: 1px solid rgba(102, 126, 234, 0.2);
    }
    
    .back-link:hover { 
      background: rgba(255, 255, 255, 1);
      color: #764ba2;
      transform: translateX(-50%) translateY(-5px); 
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15); 
    }
    
    .back-link i { 
      margin-right: 8px; 
      font-size: 1rem; 
    }
    
    @media (max-width: 768px) {
      .artwork-container { 
        padding: 30px 20px;
        margin: 10px;
      }
      
      .artwork-image { 
        max-width: 400px; 
        width: 85%; 
      }
      
      .artwork-title { 
        font-size: 2rem; 
      }
      
      .artwork-description { 
        font-size: 1rem; 
      }
      
      .back-link { 
        bottom: 20px; 
        padding: 12px 25px; 
        font-size: 0.9rem; 
      }
    }

    @media (max-width: 480px) {
      .artwork-image { 
        max-width: 320px; 
        width: 80%; 
      }
      
      .back-link { 
        bottom: 15px; 
        padding: 10px 20px; 
        font-size: 0.85rem; 
      }
    }
  </style>
</head>
<body>
  <div class="artwork-container">
    <img src="../{{image}}" alt="{{altText}}" class="artwork-image" />
    <h1 class="artwork-title">{{title}}</h1>
    <p class="artwork-description">{{description}}</p>
    <div class="artwork-links">
      <a href="{{dripHausUrl}}" target="_blank" class="artwork-link" onclick="gtag('event', 'click', {'event_category': 'artwork_links', 'event_label': 'Drip Haus - {{title}}', 'value': 1});">
        <i class="fa-solid fa-droplet"></i>View on Drip Haus
      </a>
      <a href="{{solscanUrl}}" target="_blank" class="artwork-link" onclick="gtag('event', 'click', {'event_category': 'artwork_links', 'event_label': 'Solscan - {{title}}', 'value': 1});">
        <i class="fa-solid fa-chart-line"></i>View on Solscan
      </a>
    </div>
  </div>
  <a href="../" class="back-link" onclick="gtag('event', 'click', {'event_category': 'navigation', 'event_label': 'Back to Links from {{title}}', 'value': 1});">
    <i class="fa-solid fa-arrow-left"></i>Dogame's Links
  </a>
  
  <script src="../themes/default/fontawesome/js/all.js" data-auto-replace-svg="nest"></script>
  
  <!-- Track artwork page view -->
  <script>
  gtag('event', 'page_view', {
      'event_category': 'artwork_pages',
      'event_label': '{{title}}',
      'custom_map': {'artwork_slug': '{{slug}}'}
  });
  </script>
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
            .replace(/{{slug}}/g, artwork.slug)
            .replace(/{{baseUrl}}/g, baseUrl)
            .replace(/{{dripHausUrl}}/g, artwork.drip_haus_url || '#')
            .replace(/{{solscanUrl}}/g, artwork.solscan_url || '#');

        const indexPath = path.join(artworkDir, 'index.html');
        fs.writeFileSyn
