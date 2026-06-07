import { generateNftSvg, svgToDataUri } from "@/lib/nft-svg";

export default function CreatorNftImage({
  tokenId,
  className = "w-full pixel-frame",
}: {
  tokenId: number;
  className?: string;
}) {
  return (
    <img
      src={svgToDataUri(generateNftSvg(tokenId))}
      alt={`Creator NFT #${tokenId}`}
      className={className}
      style={{ display: "block", imageRendering: "pixelated" }}
    />
  );
}
