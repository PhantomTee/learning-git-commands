// Mirrors the on-chain get_nft_svg algorithm exactly.
// Used for instant UI display without an extra RPC call.
// The contract version is authoritative; this is purely a display optimisation.

function nftColor(tokenId: number): string {
  if (tokenId <= 33) return "#f59e0b";
  if (tokenId <= 66) return "#8b5cf6";
  return "#ef4444";
}

function nftTier(tokenId: number): string {
  if (tokenId <= 33) return "FOUNDER";
  if (tokenId <= 66) return "KEEPER";
  return "SEEKER";
}

export function generateNftSvg(tokenId: number): string {
  const c      = nftColor(tokenId);
  const tier   = nftTier(tokenId);
  const num    = `#${String(tokenId).padStart(3, "0")}`;
  const serial = `CT-${String(tokenId).padStart(3, "0")}-GEN`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560">`,
    `<defs>`,
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">`,
    `<stop offset="0%" stop-color="#0e0812"/>`,
    `<stop offset="100%" stop-color="#1a0f22"/>`,
    `</linearGradient>`,
    `<linearGradient id="ac" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">`,
    `<stop offset="0%" stop-color="${c}" stop-opacity="0"/>`,
    `<stop offset="50%" stop-color="${c}" stop-opacity="0.7"/>`,
    `<stop offset="100%" stop-color="${c}" stop-opacity="0"/>`,
    `</linearGradient>`,
    `</defs>`,
    `<rect width="400" height="560" rx="18" fill="url(#bg)"/>`,
    `<rect x="4" y="4" width="392" height="552" rx="15" fill="none" stroke="${c}" stroke-width="1.5" stroke-opacity="0.55"/>`,
    `<rect x="12" y="12" width="376" height="536" rx="11" fill="none" stroke="${c}" stroke-width="0.5" stroke-opacity="0.2"/>`,
    `<polygon points="24,24 32,32 24,40 16,32" fill="${c}" opacity="0.45"/>`,
    `<polygon points="376,24 384,32 376,40 368,32" fill="${c}" opacity="0.45"/>`,
    `<polygon points="24,520 32,528 24,536 16,528" fill="${c}" opacity="0.45"/>`,
    `<polygon points="376,520 384,528 376,536 368,528" fill="${c}" opacity="0.45"/>`,
    `<text x="200" y="54" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="${c}" letter-spacing="6" font-weight="bold">CHAINTALES</text>`,
    `<line x1="30" y1="60" x2="150" y2="60" stroke="${c}" stroke-opacity="0.35" stroke-width="0.8"/>`,
    `<line x1="250" y1="60" x2="370" y2="60" stroke="${c}" stroke-opacity="0.35" stroke-width="0.8"/>`,
    `<path d="M152,100 L248,100 L258,185 Q252,228 200,252 Q148,228 142,185 Z" fill="${c}" fill-opacity="0.06" stroke="${c}" stroke-width="1.2" stroke-opacity="0.28"/>`,
    `<polygon points="200,90 205,200 195,200" fill="${c}" opacity="0.75"/>`,
    `<line x1="200" y1="95" x2="200" y2="195" stroke="#ffffff" stroke-width="0.8" stroke-opacity="0.18"/>`,
    `<rect x="181" y="196" width="38" height="8" rx="4" fill="${c}" opacity="0.82"/>`,
    `<rect x="196" y="204" width="8" height="26" rx="3" fill="${c}" opacity="0.55"/>`,
    `<circle cx="200" cy="234" r="7" fill="${c}" opacity="0.55"/>`,
    `<ellipse cx="200" cy="155" rx="20" ry="38" fill="${c}" fill-opacity="0.05"/>`,
    `<text x="200" y="318" text-anchor="middle" font-family="Georgia,serif" font-size="78" fill="${c}" font-weight="bold" opacity="0.88">${num}</text>`,
    `<rect fill="url(#ac)" x="30" y="328" width="340" height="1"/>`,
    `<rect x="138" y="342" width="124" height="26" rx="13" fill="${c}" fill-opacity="0.1" stroke="${c}" stroke-opacity="0.35" stroke-width="0.8"/>`,
    `<text x="200" y="360" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="${c}" letter-spacing="5" font-weight="bold">CREATOR</text>`,
    `<rect x="150" y="372" width="100" height="20" rx="10" fill="${c}" fill-opacity="0.06" stroke="${c}" stroke-opacity="0.2" stroke-width="0.6"/>`,
    `<text x="200" y="386" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="${c}" letter-spacing="3" opacity="0.75">${tier}</text>`,
    `<text x="200" y="430" text-anchor="middle" font-family="Georgia,serif" font-size="12" fill="white" opacity="0.3" font-style="italic">Write the Legend</text>`,
    `<line x1="30" y1="468" x2="150" y2="468" stroke="${c}" stroke-opacity="0.25" stroke-width="0.7"/>`,
    `<line x1="250" y1="468" x2="370" y2="468" stroke="${c}" stroke-opacity="0.25" stroke-width="0.7"/>`,
    `<text x="200" y="489" text-anchor="middle" font-family="monospace" font-size="9" fill="white" opacity="0.22" letter-spacing="2">GENESIS COLLECTION</text>`,
    `<text x="200" y="508" text-anchor="middle" font-family="monospace" font-size="9" fill="white" opacity="0.14" letter-spacing="1">GENLAYER STUDIONET</text>`,
    `<text x="200" y="536" text-anchor="middle" font-family="monospace" font-size="10" fill="${c}" opacity="0.3" letter-spacing="1">${serial}</text>`,
    `</svg>`,
  ].join("");
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
