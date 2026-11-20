import teacherGuide from '../../../content/teacher-guide.md?raw'
import { Md } from '../components/ui/Md'
import { stories, type Story } from '../lib/content'
import { LEVELS, pick, useLevel } from '../lib/level'
import { href, type Route } from '../lib/route'

export function SafetyNote({ compact }: { compact?: boolean }) {
  if (compact)
    return (
      <p>
        OpenSoma is an educational simulation of cells grown in a lab. <strong>It is not medical advice</strong> and can't tell you whether any treatment is right for anyone. If you or someone you love has cancer, talk with your care team, or the US National Cancer Institute (<a className="underline" href="https://www.cancer.gov/contact" target="_blank" rel="noreferrer">1-800-4-CANCER</a>). <a className="underline" href="#/safety">More</a>
      </p>
    )
  return null
}

export function Safety() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-4xl sm:text-5xl">Not medical advice </h1>
      <Md className="text-ink" text={`OpenSoma is a learning tool. It shows how **cells grown in a lab dish** respond when a gene is turned off, and makes simple predictions about drugs. It **cannot** tell you whether a treatment would work for a real person, and nothing here should be used to decide whether to take, stop or avoid any medicine.

**Why lab cells aren't people:** the cells here are two long-grown cell lines. A real tumor is made of many kinds of cells and sits inside a body with blood vessels, an immune system and organs that process drugs. Most drugs that work on cells in a dish fail when tested in people. [@wong2019]

**If you or someone you love has cancer:** your care team knows the details that matter. Good, free, reliable information:

- [National Cancer Institute: What Is Cancer?](https://www.cancer.gov/about-cancer/understanding/what-is-cancer)
- [NCI Cancer Information Service](https://www.cancer.gov/contact): 1-800-4-CANCER (US), with chat and email too
- [NCI: Finding health care services](https://www.cancer.gov/about-cancer/managing-care/services)

Outside the US, your national cancer society or health service is a good place to start.`} />
    </div>
  )
}

export function Teacher() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Md text={teacherGuide} className="text-ink" />
      <section className="space-y-2">
        <h2 className="text-3xl">Share a lesson at a set level</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm">
          <thead><tr className="text-left text-muted"><th className="py-1">Lesson</th>{LEVELS.map((l) => <th key={l.id}>{l.label}</th>)}<th>Worksheet</th></tr></thead>
          <tbody>
            {stories.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="py-2">{s.title}</td>
                {LEVELS.map((l) => <td key={l.id}><a className="text-accent underline" href={href(`story/${s.id}`, { level: l.id })}>link</a></td>)}
                <td><a className="text-accent underline" href={href(`worksheet/${s.id}`)}>print</a></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <p className="text-xs text-muted">Tip: right-click a link and copy it. Opening it sets the reading level automatically.</p>
      </section>
    </div>
  )
}

export function Worksheet({ route }: { route: Route }) {
  const { level } = useLevel()
  const s: Story | undefined = stories.find((x) => x.id === route.path[1])
  if (!s) return <p>Not found.</p>
  return (
    <article className="worksheet mx-auto max-w-3xl space-y-4">
      <div className="no-print flex gap-2"><button className="btn-primary" onClick={() => window.print()}>Print</button><a className="btn" href="#/teacher">Back</a></div>
      <h1 className="text-4xl sm:text-5xl">{s.title}: worksheet</h1>
      <p>Name: ____________________ Date: __________</p>
      <p className="text-sm">Open OpenSoma → Learn → “{s.title}”. Work through each step and answer the questions.</p>
      <ol className="list-decimal space-y-4 pl-6">
        {s.steps.map((st, i) => (
          <li key={i} className="space-y-1">
            <strong>{st.title}</strong>
            <Md text={pick(st.text, level)} className="text-sm" />
            <p className="text-sm">In your own words, what is the main idea of this step?</p>
            <div className="h-12 border-b border-dashed border-line" />
          </li>
        ))}
      </ol>
      {s.quiz && (
        <>
          <h2 className="text-3xl">Quiz</h2>
          <ol className="list-decimal space-y-3 pl-6">
            {s.quiz.map((q, i) => (
              <li key={i}>
                {pick(q.q, level)}
                <ul className="pl-4">{q.options.map((o, j) => <li key={j}>☐ {o}</li>)}</ul>
              </li>
            ))}
          </ol>
          <details className="no-print text-sm"><summary>Answer key (teachers)</summary><ol className="list-decimal pl-6">{s.quiz.map((q, i) => <li key={i}>{q.options[q.answer]}</li>)}</ol></details>
        </>
      )}
      <p className="text-xs">OpenSoma: educational simulation, not medical advice. Sources: see the Sources page.</p>
    </article>
  )
}
