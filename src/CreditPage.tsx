export default function CreditPage() {
  return (
    <div className="h-full bg-background text-foreground">
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Credits</h1>

        <p className="text-lg">
          This Room Schedule Visualizer was created by{" "}
          <span className="font-semibold">Hoang Khuong Tang</span>.
        </p>

        <p className="text-muted-foreground">
          Built with React, Vite, Tailwind CSS, and shadcn/ui.
        </p>

        <p className="text-muted-foreground">
          Source code and updates:{" "}
          <a
            href="https://github.com/snowwolf163/room-visualizer"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 underline"
          >
            GitHub Repository
          </a>
        </p>
      </div>
    </div>
  );
}