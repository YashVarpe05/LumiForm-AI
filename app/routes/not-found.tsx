export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
      <h1 className="text-4xl font-bold text-indigo-700 mb-4">404 - Not Found</h1>
      <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist.</p>
      <a 
        href="/" 
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
      >
        Go Home
      </a>
    </div>
  );
}
