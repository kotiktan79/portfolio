import { supabase } from '../lib/supabase';

export interface Achievement {
  id: string;
  achievement_type: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string;
  created_at: string;
}

const ACHIEVEMENT_DEFINITIONS = [
  {
    type: 'first_holding',
    title: 'İlk Adım',
    description: 'İlk varlığını ekledin!',
    icon: 'TrendingUp',
    condition: (stats: any) => stats.totalHoldings >= 1,
  },
  {
    type: 'diversified_5',
    title: 'Çeşitlilik Seviyesi 1',
    description: '5 farklı varlık eklendi',
    icon: 'Grid',
    condition: (stats: any) => stats.totalHoldings >= 5,
  },
  {
    type: 'diversified_10',
    title: 'Çeşitlilik Uzmanı',
    description: '10 farklı varlık eklendi',
    icon: 'Award',
    condition: (stats: any) => stats.totalHoldings >= 10,
  },
  {
    type: 'profit_10k',
    title: 'Karlı Yatırımcı',
    description: '10,000 ₺ kar elde edildi',
    icon: 'DollarSign',
    condition: (stats: any) => stats.totalPnL >= 10000,
  },
  {
    type: 'profit_50k',
    title: 'Büyük Kazanç',
    description: '50,000 ₺ kar elde edildi',
    icon: 'TrendingUp',
    condition: (stats: any) => stats.totalPnL >= 50000,
  },
  {
    type: 'portfolio_100k',
    title: 'Altı Haneli',
    description: 'Portföy değeri 100,000 ₺',
    icon: 'Target',
    condition: (stats: any) => stats.totalValue >= 100000,
  },
  {
    type: 'portfolio_500k',
    title: 'Yarım Milyon',
    description: 'Portföy değeri 500,000 ₺',
    icon: 'Star',
    condition: (stats: any) => stats.totalValue >= 500000,
  },
  {
    type: 'portfolio_1m',
    title: 'Milyoner',
    description: 'Portföy değeri 1,000,000 ₺',
    icon: 'Crown',
    condition: (stats: any) => stats.totalValue >= 1000000,
  },
  {
    type: 'all_types',
    title: 'Tam Set',
    description: 'Tüm varlık tiplerinde yatırım',
    icon: 'Package',
    condition: (stats: any) => stats.assetTypes.length >= 6,
  },
  {
    type: 'positive_30_days',
    title: 'Aylık Pozitif',
    description: '30 gün boyunca pozitif getiri',
    icon: 'Calendar',
    condition: (stats: any) => stats.positiveDays >= 30,
  },
  {
    type: 'dividend_earner',
    title: 'Temettü Avcısı',
    description: 'İlk temettü geliri',
    icon: 'Gift',
    condition: (stats: any) => stats.totalDividends > 0,
  },
  {
    type: 'active_trader',
    title: 'Aktif Yatırımcı',
    description: '50 işlem gerçekleştirildi',
    icon: 'Activity',
    condition: (stats: any) => stats.totalTransactions >= 50,
  },
];

export async function checkAndUnlockAchievements(stats: {
  totalHoldings: number;
  totalValue: number;
  totalPnL: number;
  assetTypes: string[];
  positiveDays: number;
  totalDividends: number;
  totalTransactions: number;
}) {
  const { data: unlockedAchievements } = await supabase
    .from('achievements')
    .select('achievement_type');

  const unlockedTypes = new Set(unlockedAchievements?.map((a) => a.achievement_type) || []);
  const newAchievements: Achievement[] = [];

  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    if (!unlockedTypes.has(achievement.type) && achievement.condition(stats)) {
      const { data } = await supabase
        .from('achievements')
        .insert([
          {
            achievement_type: achievement.type,
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon,
          },
        ])
        .select()
        .maybeSingle();

      if (data) {
        newAchievements.push(data);
      }
    }
  }

  return newAchievements;
}

export async function getAllAchievements(): Promise<Achievement[]> {
  const { data } = await supabase
    .from('achievements')
    .select('*')
    .order('unlocked_at', { ascending: false });

  return data || [];
}

export async function getAchievementProgress(stats: any) {
  const { data: unlockedAchievements } = await supabase
    .from('achievements')
    .select('achievement_type');

  const unlockedTypes = new Set(unlockedAchievements?.map((a) => a.achievement_type) || []);

  return ACHIEVEMENT_DEFINITIONS.map((achievement) => ({
    ...achievement,
    unlocked: unlockedTypes.has(achievement.type),
    progress: achievement.condition(stats) ? 100 : 0,
  }));
}
