// ✅ contentScript.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PAGE_CONTEXT') {
    (async () => {
      let base64 = '';
      try {
        const images = [...document.images].filter(
          img =>
            img.complete &&
            img.naturalWidth > 100 &&
            img.naturalHeight > 100 &&
            img.offsetParent !== null
        );

        for (const img of images) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');

            // ⚠️ Directly draw image instead of proxying (to avoid 403)
            ctx.drawImage(img, 0, 0);
            base64 = canvas.toDataURL('image/png');
            break;
          } catch (err) {
            console.warn('Image blocked or failed to draw:', img.src);
            continue;
          }
        }
      } catch (err) {
        console.error('Error getting visual context:', err);
      }

      const pageText = document.body.innerText || '';

      sendResponse({
        text: pageText,
        imageBase64: base64,
      });
    })();
    return true;
  }
});
