export function shouldFallbackToBinaryUpload(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to get http url content") ||
    normalized.includes("wrong type of the web page content")
  );
}
