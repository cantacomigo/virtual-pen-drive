
import React from 'react';
import { Check, Crown, Star, Zap, Users, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const PremiumPlans: React.FC = () => {
  const { currentUser, updatePlan } = useAuthStore();

  const plans = [
    {
      id: 'Individual',
      name: 'Individual',
      price: 'R$ 9,99',
      description: 'Perfeito para quem ouve sozinho em qualquer lugar.',
      icon: <Star className="text-yellow-500" />,
      features: ['Música sem anúncios', 'Reprodução ilimitada (fim do limite de 50)', 'Ouça em qualquer lugar', 'Qualidade de áudio superior'],
      color: 'from-zinc-800 to-zinc-900'
    },
    {
      id: 'Duo',
      name: 'Duo',
      price: 'R$ 14,99',
      description: 'Duas contas premium para pessoas que moram juntas.',
      icon: <Zap className="text-blue-500" />,
      features: ['2 contas Premium', 'Playlists para dois', 'Música sem anúncios', 'Reprodução ilimitada'],
      color: 'from-zinc-800 to-zinc-900',
      badge: 'Popular'
    },
    {
      id: 'Família',
      name: 'Família',
      price: 'R$ 19,99',
      description: 'Até 6 contas premium para membros da família.',
      icon: <Users className="text-green-500" />,
      features: ['Até 6 contas', 'Bloqueio de conteúdo explícito', 'Música sem anúncios', 'Reprodução ilimitada'],
      color: 'from-indigo-900/40 to-zinc-900',
      highlight: true
    }
  ];

  const handleSubscribe = (type: any) => {
    if (!currentUser) return;
    updatePlan(currentUser.id, 'premium', type);
    alert(`Parabéns! Você agora é um assinante do plano ${type}.`);
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-16">
        <div className="inline-flex items-center bg-yellow-500/10 text-yellow-500 px-4 py-1 rounded-full text-sm font-bold mb-4 border border-yellow-500/20">
          <Crown size={16} className="mr-2" />
          PLANOS PREMIUM
        </div>
        <h2 className="text-5xl font-black mb-4">Escolha o seu plano</h2>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          No plano gratuito, você tem direito a apenas 50 reproduções. Assine agora para ouvir sem limites e com a melhor fidelidade sonora.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className={`relative group bg-gradient-to-br ${plan.color} border ${plan.highlight ? 'border-indigo-500/50' : 'border-zinc-800'} rounded-3xl p-8 flex flex-col hover:scale-[1.02] transition-all duration-300 shadow-2xl`}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {plan.badge}
              </span>
            )}
            
            <div className="mb-6">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                {plan.icon}
              </div>
              <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
              <div className="flex items-baseline mb-4">
                <span className="text-3xl font-black">{plan.price}</span>
                <span className="text-zinc-500 ml-1 text-sm">/mês</span>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">{plan.description}</p>
            </div>

            <div className="space-y-4 mb-10 flex-1">
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-center text-sm text-zinc-300">
                  <div className="mr-3 text-green-500 shrink-0"><Check size={18} /></div>
                  {feature}
                </div>
              ))}
            </div>

            <button 
              onClick={() => handleSubscribe(plan.id)}
              disabled={currentUser?.subscriptionType === plan.id}
              className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${
                currentUser?.subscriptionType === plan.id 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : 'bg-white text-black hover:bg-green-500 hover:text-black active:scale-95'
              }`}
            >
              {currentUser?.subscriptionType === plan.id ? 'Plano Atual' : 'Começar agora'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-20 p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center">
          <div className="p-4 bg-green-500/10 text-green-500 rounded-2xl mr-6">
            <ShieldCheck size={40} />
          </div>
          <div>
            <h4 className="text-xl font-bold mb-1">Pagamento Seguro</h4>
            <p className="text-zinc-400 text-sm">Cancele quando quiser, sem taxas escondidas ou fidelidade.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-12 h-8 bg-zinc-800 rounded flex items-center justify-center text-[8px] font-bold text-zinc-500">VISA</div>
          <div className="w-12 h-8 bg-zinc-800 rounded flex items-center justify-center text-[8px] font-bold text-zinc-500">MASTERCARD</div>
          <div className="w-12 h-8 bg-zinc-800 rounded flex items-center justify-center text-[8px] font-bold text-zinc-500">PIX</div>
        </div>
      </div>
    </div>
  );
};

export default PremiumPlans;
