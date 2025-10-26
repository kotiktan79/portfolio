import { supabase } from '../lib/supabase';

export async function checkAndUnlockAchievements(holdings: any[], totalValue: number) {
  const { data: existing } = await supabase.from('achievements').select('*');

  if (!existing) return;

  if (holdings.length >= 5 && !existing.find(a => a.achievement_type === 'first_5_assets')) {
    await supabase.from('achievements').insert({
      achievement_type: 'first_5_assets',
      title: 'İlk 5 Varlık',
      description: 'Portföyünüze 5 varlık eklediniz',
      icon: '🎯'
    });
  }

  if (totalValue >= 10000 && !existing.find(a => a.achievement_type === 'portfolio_10k')) {
    await supabase.from('achievements').insert({
      achievement_type: 'portfolio_10k',
      title: '10K Portföy',
      description: 'Portföyünüz 10.000₺ değerine ulaştı',
      icon: '💰'
    });
  }
}
