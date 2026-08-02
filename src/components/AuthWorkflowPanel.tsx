import { CalendarDays, CheckCircle2, ClipboardPlus, Timer } from 'lucide-react';

const steps = [
  { icon: ClipboardPlus, title: 'Capture', copy: 'Collect every loose thought in one inbox.' },
  { icon: CalendarDays, title: 'Plan', copy: 'Give priority work a place in time.' },
  { icon: Timer, title: 'Focus', copy: 'Turn the next task into a focused session.' },
  { icon: CheckCircle2, title: 'Review', copy: 'See progress and adjust the next move.' },
];

export default function AuthWorkflowPanel() {
  return (
    <section className="auth-workflow-panel">
      <div className="auth-brand-mark" aria-hidden="true">T</div>
      <p className="auth-eyebrow">TASKFLOW WORKSPACE</p>
      <h1 className="auth-display">Make the next move<br />obvious.</h1>
      <p className="auth-intro">
        One calm workspace for capturing work, deciding what matters, and closing the loop.
      </p>

      <figure className="auth-workflow-figure">
        <picture>
          <source srcSet="/images/taskflow-workflow.webp" type="image/webp" />
          <img src="/images/taskflow-workflow.png" alt="Task capture, planning, focus, and review workflow" />
        </picture>
      </figure>

      <ol className="auth-workflow-steps">
        {steps.map(({ icon: Icon, title, copy }, index) => (
          <li key={title}>
            <span className="auth-step-number">0{index + 1}</span>
            <Icon size={17} strokeWidth={1.8} />
            <span>
              <strong>{title}</strong>
              <small>{copy}</small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
