import { supabase, CashBalance, CashTransaction, TransactionType } from '../lib/supabase';

export async function getCashBalance(currency: string = 'TRY'): Promise<CashBalance | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('cash_balances')
      .select('*')
      .eq('user_id', user.id)
      .eq('currency', currency)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const { data: newBalance, error: createError } = await supabase
        .from('cash_balances')
        .insert({
          user_id: user.id,
          currency,
          balance: 0,
          total_deposits: 0,
          total_withdrawals: 0,
          realized_profit: 0,
        })
        .select()
        .single();

      if (createError) throw createError;
      return newBalance;
    }

    return data;
  } catch (error) {
    console.error('Error getting cash balance:', error);
    return null;
  }
}

export async function updateCashBalance(
  currency: string,
  amount: number,
  transactionType: TransactionType,
  notes?: string,
  relatedHoldingId?: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const currentBalance = await getCashBalance(currency);
    if (!currentBalance) return false;

    const balanceBefore = currentBalance.balance;
    let balanceAfter = balanceBefore;
    let realizedProfit = currentBalance.realized_profit;
    let totalDeposits = currentBalance.total_deposits;
    let totalWithdrawals = currentBalance.total_withdrawals;

    switch (transactionType) {
      case 'deposit':
        balanceAfter = balanceBefore + amount;
        totalDeposits += amount;
        break;
      case 'withdrawal':
        balanceAfter = balanceBefore - amount;
        totalWithdrawals += amount;
        break;
      case 'buy':
        balanceAfter = balanceBefore - amount;
        break;
      case 'sell':
        balanceAfter = balanceBefore + amount;
        break;
      case 'dividend':
        balanceAfter = balanceBefore + amount;
        realizedProfit += amount;
        break;
    }

    if (balanceAfter < 0 && (transactionType === 'buy' || transactionType === 'withdrawal')) {
      throw new Error('Yetersiz bakiye');
    }

    const { error: balanceError } = await supabase
      .from('cash_balances')
      .update({
        balance: balanceAfter,
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        realized_profit: realizedProfit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentBalance.id);

    if (balanceError) throw balanceError;

    const { error: transactionError } = await supabase
      .from('cash_transactions')
      .insert({
        user_id: user.id,
        transaction_type: transactionType,
        currency,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        related_holding_id: relatedHoldingId,
        notes,
      });

    if (transactionError) throw transactionError;

    return true;
  } catch (error) {
    console.error('Error updating cash balance:', error);
    return false;
  }
}

export async function getCashTransactions(limit: number = 50): Promise<CashTransaction[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('cash_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting cash transactions:', error);
    return [];
  }
}

export async function getTotalCashValue(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase
      .from('cash_balances')
      .select('balance, currency')
      .eq('user_id', user.id);

    if (error) throw error;
    if (!data) return 0;

    let totalTRY = 0;

    for (const balance of data) {
      if (balance.currency === 'TRY') {
        totalTRY += balance.balance;
      } else if (balance.currency === 'USD') {
        totalTRY += balance.balance * 34;
      } else if (balance.currency === 'EUR') {
        totalTRY += balance.balance * 37;
      }
    }

    return totalTRY;
  } catch (error) {
    console.error('Error getting total cash value:', error);
    return 0;
  }
}

export function formatCash(amount: number, currency: string = 'TRY'): string {
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺';
  return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}
