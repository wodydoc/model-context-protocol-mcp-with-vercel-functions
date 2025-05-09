// /api/sse.ts
export const GET = async () => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // 🔁 Send keep-alive every 15s
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(":\n"));
      }, 15000);

      // ✅ Send ready event
      controller.enqueue(encoder.encode("event: ready\ndata: {}\n\n"));

      // 🧹 Cleanup on close
      setTimeout(() => {
        clearInterval(keepAlive);
        controller.close();
      }, 60000); // optional: auto-close after 60s
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
