export function getConceptImageUrl(
  prompt: string,
  width = 800,
  height = 600
): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true`;
}

export function preloadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

export function buildImagePrompt(
  brief: string,
  category: string,
  styleTags: string[]
): string {
  const styleStr = styleTags.length > 0 ? styleTags.join(', ') : '';
  return `Professional product photo of a custom ${category.toLowerCase()}. ${brief}. Style: ${styleStr}. Studio lighting, clean background, high quality, artisan craftsmanship.`;
}
