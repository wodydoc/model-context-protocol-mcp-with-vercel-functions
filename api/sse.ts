// /api/sse.ts — minimalist SSE bridge
export const GET = async () => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Ping every 15s to keep connection alive
      const ping = setInterval(() => {
        controller.enqueue(encoder.encode(":\n"));
      }, 15_000);

      controller.enqueue(encoder.encode("event: ready\ndata: {}\n\n"));

      // Auto-close after 60s
      setTimeout(() => {
        clearInterval(ping);
        controller.close();
      }, 60_000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
