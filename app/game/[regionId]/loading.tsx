export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg relative min-h-screen">
      <div className="text-4xl animate-pulse delay-75 mb-6 text-cyan">🗺️</div>
      <div className="text-xl font-mono text-cyan animate-pulse">
        正在載入道路資料…
      </div>
      <div className="mt-8 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan animate-bounce" />
        <div className="w-2 h-2 rounded-full bg-cyan animate-bounce" style={{ animationDelay: '0.2s' }} />
        <div className="w-2 h-2 rounded-full bg-cyan animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}
