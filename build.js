const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Read artwork configuration (separate from your main config.yml)
const artworksConfigPath = path.join(__dirname, 'artworks.yml');
const config = yaml.load(fs.readFileSync(artworksConfigPath, 'utf8'));

// Check if artwork generation is enabled
if (!config.generate_artworks) {
    console.log('Artwork generation is disabled. Set generate_artworks: true in config.yml to enable.');
    process.exit(0);
}

// Artwork page template (matches your current design)
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
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" sizes="32x32" href="../themes/default/images/favicons/favicon-32x32.png">
  
  <!-- Styles -->
  <link rel="stylesheet" href="../themes/default/styles.css" />
  <style>
    body {
      padding-bottom: 100px;
    }

    .artwork-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px 20px;
      text-align: center;
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
      font-weight: bold;
      margin-bottom: 6px;
      color: #333;
    }

    .artist-tag {
      font-size: 0.95rem;
      color: #718096;
      margin-bottom: 16px;
      font-weight: 600;
    }
    
    .artwork-description {
      font-size: 1.2rem;
      color: #666;
      margin-bottom: 40px;
      line-height: 1.6;
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
    }
    
    .artwork-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
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
      background: rgba(102, 126, 234, 0.95);
      color: white;
      text-decoration: none;
      font-weight: 600;
      display: flex;
      align-items: center;
      padding: 15px 30px;
      border-radius: 50px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
      transition: all 0.3s ease;
      z-index: 1000;
      border: 2px solid rgba(255, 255, 255, 0.2);
    }
    
    .back-link:hover {
      background: rgba(118, 75, 162, 0.95);
      transform: translateX(-50%) translateY(-5px);
      box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
    }
    
    .back-link i {
      margin-right: 8px;
      font-size: 1rem;
    }
    
    @media (max-width: 768px) {
      .artwork-container {
        padding: 20px 15px;
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
      <a href="{{dripHausUrl}}" target="_blank" class="artwork-link">
        <i class="fa-solid fa-paintbrush"></i>
        View on Drip Haus
      </a>
      
      <a href="{{solscanUrl}}" target="_blank" class="artwork-link">
        <i class="fa-solid fa-chart-line"></i>
        View on Solscan
      </a>
      
      <a href="{{twitterShareUrl}}" target="_blank" class="artwork-link">
        <i class="fa-brands fa-twitter"></i>
        Share on Twitter
      </a>
    </div>
  </div>
  
  <a href="../" class="back-link">
    <i class="fa-solid fa-arrow-left"></i>
    Back to Links
  </a>
  
  <!-- Font Awesome -->
  <script src="../themes/default/fontawesome/js/all.js" data-auto-replace-svg="nest"></script>
</body>
</html>`;

// Create artwork pages
function generateArtworkPages() {
    const baseUrl = config.site.base_url;
    
    config.artworks.forEach(artwork => {
        // Create directory for artwork INSIDE _output folder
        const artworkDir = path.join(__dirname, '_output', artwork.slug);
        if (!fs.existsSync(artworkDir)) {
            fs.mkdirSync(artworkDir, { recursive: true });
        }

        // Replace template variables
        let htmlContent = artworkTemplate
            .replace(/{{title}}/g, artwork.title)
            .replace(/{{siteName}}/g, config.site.name)
            .replace(/{{description}}/g, artwork.description)
            .replace(/{{image}}/g, artwork.image)
            .replace(/{{altText}}/g, artwork.alt_text)
            .replace(/{{slug}}/g, artwork.slug)
            .replace(/{{baseUrl}}/g, baseUrl)
            .replace(/{{dripHausUrl}}/g, artwork.drip_haus_url || '#')
            .replace(/{{solscanUrl}}/g, artwork.solscan_url || '#')
            .replace(/{{twitterShareUrl}}/g, artwork.twitter_share_url || '#');

        // Write index.html file
        const indexPath = path.join(artworkDir, 'index.html');
        fs.writeFileSync(indexPath, htmlContent, 'utf8');
        
        console.log(`Generated: ${artwork.slug}/index.html`);
    });
}

// Generate artwork showcase page (optional)
function generateArtworkShowcase() {
    // Create gallery directory INSIDE _output folder
    const galleryDir = path.join(__dirname, '_output', 'gallery');
    if (!fs.existsSync(galleryDir)) {
        fs.mkdirSync(galleryDir, { recursive: true });
    }

    const showcaseTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Artwork Gallery - ${config.site.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: white;
        }

        .gallery-container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .gallery-title {
            font-size: 3rem;
            text-align: center;
            margin-bottom: 50px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .artwork-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-bottom: 50px;
        }

        .artwork-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            overflow: hidden;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: transform 0.3s ease;
        }

        .artwork-card:hover {
            transform: translateY(-10px);
        }

        .artwork-card img {
            width: 100%;
            height: 250px;
            object-fit: cover;
        }

        .artwork-card-content {
            padding: 20px;
        }

        .artwork-card h3 {
            font-size: 1.5rem;
            margin-bottom: 10px;
        }

        .artwork-card p {
            opacity: 0.9;
            line-height: 1.5;
            margin-bottom: 15px;
        }

        .artwork-card a {
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 25px;
            display: inline-block;
            transition: background 0.3s ease;
        }

        .artwork-card a:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .back-button {
            display: block;
            text-align: center;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            padding: 15px 30px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50px;
            text-decoration: none;
            font-size: 1.1rem;
            font-weight: bold;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            max-width: 200px;
            margin: 0 auto;
        }

        .back-button:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.5);
        }
    </style>
</head>
<body>
    <div class="gallery-container">
        <h1 class="gallery-title">Artwork Gallery</h1>
        
        <div class="artwork-grid">
            ${config.artworks.map(artwork => `
            <div class="artwork-card">
                <img src="${artwork.image}" alt="${artwork.alt_text}">
                <div class="artwork-card-content">
                    <h3>${artwork.title}</h3>
                    <p>${artwork.description}</p>
                    <a href="${artwork.slug}/">View Artwork</a>
                </div>
            </div>
            `).join('')}
        </div>

        <a href="../" class="back-button">← Back to Links</a>
    </div>
</body>
</html>`;

    fs.writeFileSync(path.join(galleryDir, 'index.html'), showcaseTemplate, 'utf8');
    console.log('Generated: _output/gallery/index.html');
}

// Main execution
console.log('Starting artwork page generation...');

try {
    generateArtworkPages();
    generateArtworkShowcase();
    
    console.log(`\nGeneration complete! Created ${config.artworks.length} artwork pages.`);
    console.log('\nGenerated URLs:');
    config.artworks.forEach(artwork => {
        console.log(`- https://dogame-art.github.io/${artwork.slug}/`);
    });
    console.log('- https://dogame-art.github.io/gallery/ (artwork showcase)');
    
} catch (error) {
    console.error('Error generating artwork pages:', error);
    process.exit(1);
}
