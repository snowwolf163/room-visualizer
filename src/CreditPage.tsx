export default function CreditPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Credits</h1>
      <p className="text-lg">
        This Room Schedule Visualizer was created by <span className="font-semibold">Hoang Khuong Tang</span>.
      </p>
      <p className="mt-2 text-gray-700">
        Built with React, Vite, Tailwind CSS, and shadcn/ui.
      </p>
      <p className="mt-2 text-gray-700">
        Source code and updates: <a href="https://github.com/snowwolf163/room-visualizer" target="_blank" rel="noreferrer" className="text-blue-600 underline">GitHub Repository</a>
      </p>
    </div>
  )
}
