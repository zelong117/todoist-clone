import { useEffect, useState } from 'react';
import { Check, CreditCard, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react';
import { billingAPI, type BillingPlan, type SubscriptionSnapshot } from '../api';

const planLabel = (plan: string) => plan.charAt(0).toUpperCase() + plan.slice(1);

export default function BillingCenter() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionSnapshot | null>(null);
  const [orders, setOrders] = useState<Array<{ id: string; provider: string; plan: string; amount_cents: number; currency: string; status: string; processed_at: string | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [plansResponse, subscriptionResponse, orderResponse] = await Promise.all([
        billingAPI.plans(),
        billingAPI.subscription(),
        billingAPI.orders(),
      ]);
      setPlans(plansResponse.plans);
      setSubscription(subscriptionResponse);
      setOrders(orderResponse.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load subscription details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center text-[var(--text-secondary)]"><LoaderCircle className="mr-2 animate-spin" size={20} />Loading subscription...</div>;
  }

  if (error || !subscription) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 rounded-lg">{error || 'Subscription details are unavailable.'}</div>
        <button onClick={load} className="mt-4 inline-flex items-center gap-2 border border-[var(--border-color)] px-3 py-2 text-sm rounded-lg"><RefreshCw size={15} />Retry</button>
      </div>
    );
  }

  const activePlan = subscription.plan.toLowerCase();
  const paymentNotice = subscription.subscription?.status === 'past_due'
    ? `Payment needs attention. Access remains available through ${subscription.subscription.grace_period_end ? new Date(subscription.subscription.grace_period_end).toLocaleDateString() : 'the configured grace period'}.`
    : subscription.subscription?.status === 'cancelled'
      ? `Cancellation is recorded. Current access remains available through ${subscription.subscription.current_period_end ? new Date(subscription.subscription.current_period_end).toLocaleDateString() : 'the current period end'}.`
      : null;
  return (
    <div className="max-w-5xl mx-auto pb-10">
      <section className="border-b border-[var(--border-color)] pb-6 mb-7">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Account plan</p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{planLabel(activePlan)}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{subscription.subscription?.status === 'active' ? `Active subscription${subscription.subscription.cancel_at_period_end ? ', ending at period close' : ''}.` : 'Current entitlement from TaskFlow.'}</p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 border border-[var(--border-color)] px-3 py-2 text-sm rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"><RefreshCw size={15} />Refresh</button>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border border-[var(--border-color)] rounded-lg p-4"><p className="text-xs text-[var(--text-tertiary)]">Projects</p><p className="mt-1 text-xl font-semibold">{subscription.entitlement.maxProjects}</p></div>
          <div className="border border-[var(--border-color)] rounded-lg p-4"><p className="text-xs text-[var(--text-tertiary)]">AI requests / day</p><p className="mt-1 text-xl font-semibold">{subscription.entitlement.maxAiPerDay}</p></div>
          <div className="border border-[var(--border-color)] rounded-lg p-4"><p className="text-xs text-[var(--text-tertiary)]">Plan access</p><p className="mt-1 text-xl font-semibold">{subscription.entitlement.hosted ? 'Hosted' : 'Core'}</p></div>
        </div>
        {paymentNotice && <p className={`mt-4 border px-4 py-3 text-sm rounded-lg ${subscription.subscription?.status === 'past_due' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>{paymentNotice}</p>}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4"><Sparkles size={18} className="text-[var(--accent)]" /><h3 className="text-lg font-semibold">Available plans</h3></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id.toLowerCase() === activePlan;
            return <article key={plan.id} className={`border p-5 rounded-lg ${isCurrent ? 'border-[var(--accent)] bg-[var(--bg-active)]' : 'border-[var(--border-color)] bg-[var(--bg-card)]'}`}>
              <div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold text-lg">{plan.name}</h4><p className="mt-1 text-2xl font-semibold">{plan.priceCents === 0 ? 'Free' : `$${(plan.priceCents / 100).toFixed(2)}/mo`}</p></div>{isCurrent && <span className="text-xs px-2 py-1 bg-[var(--accent)] text-white rounded-full">Current</span>}</div>
              <ul className="my-5 space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex gap-2"><Check size={16} className="text-emerald-600 shrink-0" />{plan.limits.maxProjects} projects</li>
                <li className="flex gap-2"><Check size={16} className="text-emerald-600 shrink-0" />{plan.limits.maxAiPerDay} AI requests per day</li>
                <li className="flex gap-2"><Check size={16} className="text-emerald-600 shrink-0" />{plan.limits.hosted ? 'Hosted workspace' : 'Core workspace'}</li>
              </ul>
              <button disabled={isCurrent} className="w-full inline-flex justify-center items-center gap-2 border border-[var(--border-color)] px-3 py-2 text-sm rounded-lg disabled:opacity-50 disabled:cursor-default hover:bg-[var(--bg-hover)]" title={isCurrent ? 'Current plan' : 'Checkout is enabled when a payment provider is configured'}><CreditCard size={15} />{isCurrent ? 'Current plan' : 'Contact an administrator to upgrade'}</button>
            </article>;
          })}
        </div>
      </section>
      <section className="mt-8 border-t border-[var(--border-color)] pt-6">
        <h3 className="text-lg font-semibold">Payment history</h3>
        {!orders.length ? <p className="mt-3 text-sm text-[var(--text-secondary)]">No provider payment events have been recorded for this account.</p> : <div className="mt-4 border border-[var(--border-color)] rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[var(--bg-hover)] text-left text-xs text-[var(--text-tertiary)]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-t border-[var(--border-color)]"><td className="px-4 py-3">{new Date(order.created_at).toLocaleDateString()}</td><td className="px-4 py-3 capitalize">{order.plan}</td><td className="px-4 py-3">{order.currency} {(order.amount_cents / 100).toFixed(2)}</td><td className="px-4 py-3 capitalize">{order.status}</td></tr>)}</tbody></table></div>}
      </section>
      <p className="mt-5 text-xs text-[var(--text-tertiary)]">Plan changes are authorized server-side. Checkout remains disabled until a payment provider is configured.</p>
    </div>
  );
}
