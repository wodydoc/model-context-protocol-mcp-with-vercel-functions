// /api/sse.ts
export const GET = async (req: Request): Promise<Response> => {
  const stream = new ReadableStream({
    start(controller) {
      // Keep alive stream open
      const encoder = new TextEncoder();
      const ping = () => controller.enqueue(encoder.encode(":\n"));
      const interval = setInterval(ping, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
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
