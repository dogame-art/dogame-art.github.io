/**
 * Dogame NFT Store - Frontend Logic
 * Handles wallet connection, NFT display, and minting
 */

// Global state
let wallet = null;
let connection = null;
let artworks = [];
let currentFilter = 'all';
let selectedArtwork = null;

// API Base URL (defaults to current origin)
const API_BASE_URL = window.location.origin;

// Solana network configuration
// This will be read from the API at runtime
let NETWORK = 'devnet'; // Default to devnet
let RPC_ENDPOINT = 'https://api.devnet.solana.com';

// Treasury wallet (will be fetched from config or set in env)
let TREASURY_WALLET = null;

/**
 * Initialize the store on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing NFT Store...');

  // Detect network from environment or default to devnet
  await detectNetwork();

  // Initialize Solana connection
  connection = new solanaWeb3.Connection(RPC_ENDPOINT, 'confirmed');

  // Set up event listeners
  setupEventListeners();

  // Load artworks
  await loadArtworks();

  // Check if wallet was previously connected
  await checkWalletConnection();
});

/**
 * Detect which network we're on
 */
async function detectNetwork() {
  try {
    // Try to get network info from API
    const response = await fetch(`${API_BASE_URL}/api/get-artworks`);
    const data = await response.json();

    // Check if API returned network info (we'll add this later)
    // For now, check RPC endpoint or default to devnet
    const urlParams = new URLSearchParams(window.location.search);
    const networkParam = urlParams.get('network');

    if (networkParam === 'mainnet' || networkParam === 'mainnet-beta') {
      NETWORK = 'mainnet-beta';
      RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
    } else {
      NETWORK = 'devnet';
      RPC_ENDPOINT = 'https://api.devnet.solana.com';
    }

    // Update UI
    updateNetworkIndicator();
  } catch (error) {
    console.warn('Could not detect network, defaulting to devnet');
    updateNetworkIndicator();
  }
}

/**
 * Update network indicator UI
 */
function updateNetworkIndicator() {
  const indicator = document.getElementById('network-indicator');
  const text = document.getElementById('network-text');

  if (NETWORK === 'mainnet-beta') {
    indicator.className = 'network-indicator mainnet';
    indicator.querySelector('.network-indicator-icon').textContent = '🟢';
    text.textContent = 'MAINNET';
  } else {
    indicator.className = 'network-indicator devnet';
    indicator.querySelector('.network-indicator-icon').textContent = '🧪';
    text.textContent = 'DEVNET MODE';
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Wallet connect button
  document.getElementById('connect-wallet-btn').addEventListener('click', handleWalletConnect);

  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const filter = e.target.dataset.filter;
      setFilter(filter);
    });
  });

  // Close modal when clicking outside
  document.getElementById('mint-modal').addEventListener('click', (e) => {
    if (e.target.id === 'mint-modal') {
      closeMintModal();
    }
  });
}

/**
 * Check if wallet is already connected (Phantom auto-connect)
 */
async function checkWalletConnection() {
  if (window.solana && window.solana.isPhantom) {
    try {
      const response = await window.solana.connect({ onlyIfTrusted: true });
      wallet = window.solana;
      updateWalletUI(response.publicKey.toString());
    } catch (err) {
      console.log('Wallet not auto-connected');
    }
  }
}

/**
 * Handle wallet connection
 */
async function handleWalletConnect() {
  if (wallet) {
    // Disconnect
    await wallet.disconnect();
    wallet = null;
    updateWalletUI(null);
    return;
  }

  // Check if Phantom is installed
  if (!window.solana || !window.solana.isPhantom) {
    showNotification('Please install Phantom wallet', 'error');
    window.open('https://phantom.app/', '_blank');
    return;
  }

  try {
    const response = await window.solana.connect();
    wallet = window.solana;
    updateWalletUI(response.publicKey.toString());
    showNotification('Wallet connected successfully!', 'success');
  } catch (err) {
    console.error('Failed to connect wallet:', err);
    showNotification('Failed to connect wallet', 'error');
  }
}

/**
 * Update wallet UI
 */
function updateWalletUI(address) {
  const btn = document.getElementById('connect-wallet-btn');
  const text = document.getElementById('wallet-text');

  if (address) {
    btn.classList.add('connected');
    text.textContent = `${address.slice(0, 4)}...${address.slice(-4)}`;
  } else {
    btn.classList.remove('connected');
    text.textContent = 'Connect Wallet';
  }
}

/**
 * Load artworks from API
 */
async function loadArtworks() {
  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const emptyState = document.getElementById('empty-state');
  const gridContainer = document.getElementById('nft-grid');

  try {
    loadingState.style.display = 'block';
    errorState.style.display = 'none';
    emptyState.style.display = 'none';
    gridContainer.style.display = 'none';

    const response = await fetch(`${API_BASE_URL}/api/get-artworks`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to load artworks');
    }

    artworks = data.artworks || [];

    // Get treasury wallet from first artwork or config
    if (data.artworks && data.artworks.length > 0) {
      // Treasury wallet should be set in environment
      TREASURY_WALLET = data.treasuryWallet || null;
    }

    loadingState.style.display = 'none';

    if (artworks.length === 0) {
      emptyState.style.display = 'block';
    } else {
      gridContainer.style.display = 'grid';
      renderArtworks();
    }
  } catch (error) {
    console.error('Error loading artworks:', error);
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    document.getElementById('error-message').textContent = error.message;
  }
}

/**
 * Set filter and re-render
 */
function setFilter(filter) {
  currentFilter = filter;

  // Update active tab
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
  });

  renderArtworks();
}

/**
 * Render artworks to grid
 */
function renderArtworks() {
  const grid = document.getElementById('nft-grid');
  grid.innerHTML = '';

  // Filter artworks
  const filtered = artworks.filter(artwork => {
    if (currentFilter === 'all') return true;
    return artwork.type === currentFilter;
  });

  // Render each artwork
  filtered.forEach(artwork => {
    const card = createArtworkCard(artwork);
    grid.appendChild(card);
  });
}

/**
 * Create artwork card element
 */
function createArtworkCard(artwork) {
  const card = document.createElement('div');
  card.className = `nft-card ${!artwork.available ? 'sold-out' : ''}`;

  // Supply text
  let supplyText = '';
  if (artwork.type === '1of1') {
    supplyText = artwork.available ? '1 of 1' : 'Sold Out';
  } else if (artwork.type === 'edition') {
    if (artwork.maxSupply) {
      supplyText = `${artwork.mintedCount || 0} / ${artwork.maxSupply} Minted`;
    } else {
      supplyText = `${artwork.mintedCount || 0} Minted`;
    }
  }

  card.innerHTML = `
    <img src="../${artwork.image}" alt="${artwork.title}" class="nft-image" />
    <div class="nft-info">
      <span class="nft-type type-${artwork.type}">${artwork.type === '1of1' ? '1/1' : 'Edition'}</span>
      <h3 class="nft-title">${artwork.title}</h3>
      <p class="nft-description">${artwork.description}</p>
      <div class="nft-footer">
        <span class="nft-price">${artwork.priceSol} SOL</span>
        <span class="nft-supply ${artwork.remaining === 0 ? 'sold-out' : artwork.remaining <= 5 ? 'low-stock' : ''}">
          ${supplyText}
        </span>
      </div>
    </div>
  `;

  // Add click handler
  if (artwork.available) {
    card.addEventListener('click', () => openMintModal(artwork));
  }

  return card;
}

/**
 * Open mint modal for artwork
 */
function openMintModal(artwork) {
  if (!artwork.metadataUri) {
    showNotification('This artwork is not ready for minting yet', 'warning');
    return;
  }

  selectedArtwork = artwork;

  // Populate modal
  document.getElementById('modal-image').src = `../${artwork.image}`;
  document.getElementById('modal-title').textContent = artwork.title;
  document.getElementById('modal-description').textContent = artwork.description;
  document.getElementById('modal-price').textContent = artwork.priceSol;

  // Show modal
  document.getElementById('mint-modal').style.display = 'flex';

  // Reset to step 1
  showModalStep('step-confirm');
}

/**
 * Close mint modal
 */
function closeMintModal() {
  document.getElementById('mint-modal').style.display = 'none';
  selectedArtwork = null;
}

/**
 * Show specific modal step
 */
function showModalStep(stepId) {
  document.querySelectorAll('.modal-step').forEach(step => {
    step.classList.remove('active');
  });
  document.getElementById(stepId).classList.add('active');
}

/**
 * Start minting process
 */
async function startMinting() {
  // Check wallet connected
  if (!wallet) {
    showNotification('Please connect your wallet first', 'error');
    closeMintModal();
    return;
  }

  if (!selectedArtwork) {
    showNotification('No artwork selected', 'error');
    closeMintModal();
    return;
  }

  try {
    // Step 1: Show payment step
    showModalStep('step-payment');

    // Create payment transaction
    const transaction = await createPaymentTransaction(
      selectedArtwork.priceSol,
      wallet.publicKey
    );

    // Request signature from user
    const signed = await wallet.signTransaction(transaction);

    // Send transaction
    const signature = await connection.sendRawTransaction(signed.serialize());
    console.log('Payment transaction sent:', signature);

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('Payment confirmed');

    // Step 2: Show minting step
    showModalStep('step-minting');

    // Call mint API
    const mintResult = await mintNFT(
      wallet.publicKey.toString(),
      signature,
      selectedArtwork.slug
    );

    // Step 3: Show success
    document.getElementById('success-mint-address').textContent = mintResult.mint.address;
    document.getElementById('success-explorer-link').href = mintResult.mint.explorerUrl;

    showModalStep('step-success');
    showNotification('NFT minted successfully!', 'success');

    // Reload artworks to update counts
    setTimeout(() => loadArtworks(), 2000);
  } catch (error) {
    console.error('Minting error:', error);

    // Show error step
    document.getElementById('error-text').textContent =
      error.message || 'Failed to mint NFT. Please try again.';
    showModalStep('step-error');

    showNotification(error.message || 'Minting failed', 'error');
  }
}

/**
 * Create payment transaction
 */
async function createPaymentTransaction(amountSol, fromPubkey) {
  // Get treasury wallet from config
  const treasuryPubkey = new solanaWeb3.PublicKey(
    TREASURY_WALLET || 'PLACEHOLDER_TREASURY_WALLET'
  );

  // Create transfer instruction
  const lamports = amountSol * solanaWeb3.LAMPORTS_PER_SOL;

  const transaction = new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({
      fromPubkey: fromPubkey,
      toPubkey: treasuryPubkey,
      lamports: lamports,
    })
  );

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  return transaction;
}

/**
 * Call mint NFT API
 */
async function mintNFT(walletAddress, transactionSignature, artworkSlug) {
  const response = await fetch(`${API_BASE_URL}/api/mint-nft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
      transactionSignature,
      artworkSlug,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Minting failed');
  }

  return data;
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
  const toast = document.getElementById('notification-toast');
  toast.textContent = message;
  toast.className = `notification-toast ${type}`;
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 5000);
}

// Expose functions to window for onclick handlers
window.closeMintModal = closeMintModal;
window.startMinting = startMinting;
