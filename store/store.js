async function startMinting() {
  if (!wallet || !selectedArtwork) {
    showNotification('Please connect wallet and select artwork', 'error');
    return;
  }

  try {
    // Step 1: Reserve NFT first (no payment)
    showModalStep('step-minting');
    
    const reserveResult = await fetch(`${API_BASE_URL}/api/mint-nft-safe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: wallet.publicKey.toString(),
        artworkSlug: selectedArtwork.slug,
      }),
    });

    const reserveData = await reserveResult.json();
    
    if (!reserveData.success) {
      throw new Error(reserveData.error);
    }

    // Step 2: NFT reserved! Now request payment
    showModalStep('step-payment');
    
    const transaction = await createPaymentTransaction(
      reserveData.paymentRequired.amount,
      wallet.publicKey
    );
    
    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

    // Step 3: Success!
    document.getElementById('success-mint-address').textContent = reserveData.mintAddress;
    showModalStep('step-success');
    
  } catch (error) {
    console.error('Minting error:', error);
    document.getElementById('error-text').textContent = error.message;
    showModalStep('step-error');
  }
}
