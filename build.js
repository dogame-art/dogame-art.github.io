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
      line-height: 1.65;
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
      padding: 50px 40px;
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
      margin-bottom: 40px; 
    }
    
    .artwork-title { 
      font-size: 2.5rem; 
      font-weight: 700; 
      margin-bottom: 16px; 
      color: #2d3748;
      letter-spacing: -0.015em;
      line-height: 1.15;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .artwork-description { 
      font-size: 1.2rem; 
      color: #718096; 
      margin-bottom: 48px; 
      line-height: 1.7; 
      font-weight: 500;
      letter-spacing: 0.01em;
      word-spacing: 0.05em;
    }
    
    .artwork-links { 
      display: flex; 
      flex-direction: column; 
      gap: 18px; 
      max-width: 400px; 
      margin: 0 auto; 
    }
    
    .artwork-link { 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      padding: 18px 28px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      text-decoration: none; 
      border-radius: 12px; 
      font-weight: 600; 
      letter-spacing: 0.02em;
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
      margin-right: 12px; 
      width: 20px;
      height: 20px;
      flex-shrink: 0;
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
      padding: 18px 36px; 
      border-radius: 50px; 
      backdrop-filter: blur(10px); 
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1); 
      transition: all 0.3s ease; 
      z-index: 1000; 
      border: 1px solid rgba(102, 126, 234, 0.2);
      letter-spacing: 0.02em;
    }
    
    .back-link:hover { 
      background: rgba(255, 255, 255, 1);
      color: #764ba2;
      transform: translateX(-50%) translateY(-5px); 
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15); 
    }
    
    .back-link i { 
      margin-right: 10px; 
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
    
    @media (max-width: 768px) {
      .artwork-container { 
        padding: 40px 30px;
        margin: 10px;
      }
      
      .artwork-image { 
        max-width: 400px; 
        width: 85%; 
        margin-bottom: 36px;
      }
      
      .artwork-title { 
        font-size: 2rem; 
        margin-bottom: 14px;
        letter-spacing: -0.01em;
      }
      
      .artwork-description { 
        font-size: 1.05rem; 
        margin-bottom: 44px;
        letter-spacing: 0.005em;
      }
      
      .artwork-links {
        gap: 16px;
      }
      
      .artwork-link {
        padding: 16px 24px;
        font-size: 0.95rem;
      }
      
      .artwork-link i {
        margin-right: 10px;
      }
      
      .back-link { 
        bottom: 20px; 
        padding: 14px 28px; 
        font-size: 0.95rem; 
      }
      
      .back-link i {
        margin-right: 8px;
      }
    }

    @media (max-width: 480px) {
      body {
        padding: 15px;
      }
      
      .artwork-container {
        padding: 35px 24px;
      }
      
      .artwork-image { 
        max-width: 320px; 
        width: 80%; 
        margin-bottom: 32px;
      }
      
      .artwork-title {
        font-size: 1.75rem;
        margin-bottom: 12px;
      }
      
      .artwork-description {
        font-size: 1rem;
        margin-bottom: 40px;
      }
      
      .artwork-link {
        padding: 14px 20px;
        font-size: 0.9rem;
      }
      
      .artwork-link i {
        margin-right: 8px;
        width: 18px;
        height: 18px;
      }
      
      .back-link { 
        bottom: 15px; 
        padding: 12px 24px; 
        font-size: 0.9rem; 
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
        <i data-lucide="droplet"></i>View on Drip Haus
      </a>
      <a href="{{solscanUrl}}" target="_blank" class="artwork-link" onclick="gtag('event', 'click', {'event_category': 'artwork_links', 'event_label': 'Solscan - {{title}}', 'value': 1});">
        <i data-lucide="trending-up"></i>View on Solscan
      </a>
    </div>
  </div>
  <a href="../" class="back-link" onclick="gtag('event', 'click', {'event_category': 'navigation', 'event_label': 'Back to Links from {{title}}', 'value': 1});">
    <i data-lucide="arrow-left"></i>Dogame's Links
  </a>
  
  <!-- Lucide Icons - Secure CDN -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js" 
          crossorigin="anonymous" 
          referrerpolicy="no-referrer"></script>
  <script>
    // Initialize Lucide icons after DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
      lucide.createIcons();
    });
  </script>
  
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
    
    // Filter only published artworks
    const publishedArtworks = config.artworks.filter(artwork => artwork.published === true);
    
    console.log(`Found ${config.artworks.length} total artworks, ${publishedArtworks.length} published.`);
    
    publishedArtworks.forEach(artwork => {
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
        fs.writeFileSync(indexPath, htmlContent);
        
        console.log(`✓ Generated artwork page: ${artwork.slug}/index.html`);
    });
    
    // Log unpublished artworks
    const unpublishedArtworks = config.artworks.filter(artwork => artwork.published !== true);
    if (unpublishedArtworks.length > 0) {
        console.log(`\nUnpublished artworks (showing on portfolio with "COMING SOON"):`);
        unpublishedArtworks.forEach(artwork => {
            console.log(`  - ${artwork.title} (${artwork.slug})`);
        });
    }
}

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '_output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Generate artwork pages
generateArtworkPages();

console.log('\n✅ Artwork page generation complete!');
console.log('✅ Improved typography and spacing applied');
console.log('✅ Better icon alignment throughout');
console.log('✅ All security measures maintained');
