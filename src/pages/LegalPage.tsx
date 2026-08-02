import { ArrowLeft } from 'lucide-react';

type LegalDocument = 'privacy' | 'terms';

const content: Record<LegalDocument, { eyebrow: string; title: string; sections: Array<[string, string]> }> = {
  privacy: {
    eyebrow: 'TASKFLOW PRIVACY', title: 'Your workspace data, handled with care.',
    sections: [['What we store', 'Account details, workspace records and files you choose to upload are used to provide the TaskFlow service. Passwords are stored as hashes, not readable text.'], ['How access works', 'The service checks the authenticated account and server-side role before returning projects, tasks, files, plans or administrative data.'], ['Your controls', 'You can export account data and request account deletion from the account center. Team owners must transfer ownership or remove a team before deletion.']],
  },
  terms: {
    eyebrow: 'TASKFLOW TERMS', title: 'Clear terms for a considered workspace.',
    sections: [['Service use', 'Use TaskFlow to manage your own work and authorized team work. Keep your account credentials private and do not attempt to bypass access controls or quotas.'], ['Plans and billing', 'Plan entitlements are controlled by the service. A plan change becomes effective only through an administrator action or a verified provider event.'], ['Availability', 'Local and development installations are provided for evaluation. Production availability, payment provider terms and support commitments require a deployed service agreement.']],
  },
};

export default function LegalPage({ document }: { document: LegalDocument }) {
  const page = content[document];
  const back = () => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); };
  return <main className="legal-page"><nav className="legal-nav"><button onClick={back}><ArrowLeft size={16} /> Back to TaskFlow</button><span className="marketing-logo"><span className="marketing-logo-mark">T</span><span>TASKFLOW</span></span></nav><article><p className="marketing-eyebrow">{page.eyebrow}</p><h1>{page.title}</h1>{page.sections.map(([heading, copy]) => <section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}</article></main>;
}
