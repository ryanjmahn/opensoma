export default function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div
        aria-hidden="true"
        className="size-40 rounded-full bg-emerald-400/20 ring-4 ring-emerald-300/40 flex items-center justify-center"
      >
        <div className="size-14 rounded-full bg-violet-400/40 ring-2 ring-violet-300/60" />
      </div>
      <h1 className="text-4xl font-semibold">Hello, cell 🧫</h1>
      <p className="max-w-md text-slate-300">
        OpenSoma is an open-source virtual cell you can explore and poke. Coming soon.
      </p>
      <p className="max-w-md text-xs text-slate-400">
        Educational simulation only. Not medical advice.
      </p>
    </main>
  )
}
