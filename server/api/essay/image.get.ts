export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const query = getQuery(event);
  const rawImage = String(query.image || "").trim();

  if (!rawImage) {
    throw createError({
      statusCode: 400,
      statusMessage: "Image is required"
    });
  }

  if (/^(data|blob):/i.test(rawImage)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Unsupported image source"
    });
  }

  const normalized = rawImage.replace(/\\/g, "/");
  const normalizedNoLeadingSlash = normalized.replace(/^\/+/, "");
  const isAbsoluteUrl = /^(https?:)?\/\//i.test(normalized);
  const host = String(config.ipBackEnd || "localhost:3001");

  const candidates = isAbsoluteUrl
    ? [normalized]
    : [
        `http://${host}${normalized.startsWith("/") ? normalized : `/${normalized}`}`,
        `http://${host}/upload/essay/${normalizedNoLeadingSlash}`,
        `http://${host}/upload/${normalizedNoLeadingSlash}`,
        `http://${host}/uploads/essay/${normalizedNoLeadingSlash}`,
        `http://${host}/uploads/essays/${normalizedNoLeadingSlash}`,
        `http://${host}/uploads/${normalizedNoLeadingSlash}`
      ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) continue;

      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      const cacheControl =
        response.headers.get("cache-control") || "public, max-age=300";
      const body = await response.arrayBuffer();

      setHeader(event, "Content-Type", contentType);
      setHeader(event, "Cache-Control", cacheControl);
      return new Uint8Array(body);
    } catch (_error) {
      // Continue trying other candidate paths.
    }
  }

  throw createError({
    statusCode: 404,
    statusMessage: "Image not found"
  });
});
