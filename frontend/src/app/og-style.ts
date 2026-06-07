export const ogSize = {
  width: 1200,
  height: 630,
};

export const ogFrameStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
  padding: 56,
  color: "#fcd34d",
  fontFamily: "monospace",
  backgroundColor: "#08050a",
  backgroundImage:
    "linear-gradient(rgba(245,158,11,0.08) 2px, transparent 2px), linear-gradient(90deg, rgba(245,158,11,0.06) 2px, transparent 2px)",
  backgroundSize: "32px 32px",
  border: "12px solid #f59e0b",
  boxShadow: "inset 0 0 0 10px #120d10, inset 0 0 0 16px #78350f",
};

export const ogBadgeStyle = {
  display: "flex",
  alignItems: "center",
  padding: "8px 18px",
  border: "4px solid #f59e0b",
  background: "#120d10",
  color: "#fcd34d",
  fontSize: 34,
  letterSpacing: 2,
  textTransform: "uppercase" as const,
};
