export function landingSplitTextIntoWordSpans(targetElement) {
  if (!targetElement) return { wordSpans: [], restore: () => {} };

  const originalHtml = targetElement.innerHTML;
  const originalText = targetElement.textContent ?? "";
  const words = originalText.trim().split(/\s+/).filter(Boolean);

  targetElement.innerHTML = "";

  const wordSpans = words.map((word, wordIndex) => {
    const span = document.createElement("span");
    span.className = "hcLandingWord";
    span.style.opacity = "0";
    span.textContent = word;
    targetElement.appendChild(span);
    if (wordIndex < words.length - 1) targetElement.appendChild(document.createTextNode(" "));
    return span;
  });

  return {
    wordSpans,
    restore: () => {
      targetElement.innerHTML = originalHtml || originalText;
    },
  };
}

