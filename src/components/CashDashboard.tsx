import { useState, useEffect } from 'react';
import { Wallet, Plus, Minus, TrendingUp, DollarSign, ArrowDownCircle, ArrowUpCircle, Zap } from 'lucide-react';
import { CashBalance, CashTransaction } from '../lib/supabase';
import { getCashBalance, getCashTransactions, updateCashBalance, formatCash } from '../services/cashService';

export function CashDashboard() {
  const [balance, setBalance] = useState<CashBalance | null>(null);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showProfitWithdrawModal, setShowProfitWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [balanceData, transactionsData] = await Promise.all([
      getCashBalance('TRY'),
      getCashTransactions(10),
    ]);

    setBalance(balanceData);
    setTransactions(transactionsData);
  }

  async function handleDeposit() {
    if (!amount || parseFloat(amount) <= 0) return;

    setLoading(true);
    const success = await updateCashBalance('TRY', parseFloat(amount), 'deposit', notes || 'Para yatırma');

    if (success) {
      setShowDepositModal(false);
      setAmount('');
      setNotes('');
      await loadData();
    } else {
      alert('İşlem başarısız oldu');
    }
    setLoading(false);
  }

  async function handleWithdraw() {
    if (!amount || parseFloat(amount) <= 0) return;
    if (balance && parseFloat(amount) > balance.balance) {
      alert('Yetersiz bakiye');
      return;
    }

    setLoading(true);
    const success = await updateCashBalance('TRY', parseFloat(amount), 'withdrawal', notes || 'Para çekme');

    if (success) {
      setShowWithdrawModal(false);
      setAmount('');
      setNotes('');
      await loadData();
    } else {
      alert('İşlem başarısız oldu');
    }
    setLoading(false);
  }

  async function handleProfitWithdraw() {
    if (!amount || parseFloat(amount) <= 0) return;
    if (!balance || balance.realized_profit <= 0) {
      alert('Çekilecek kar yok');
      return;
    }
    if (parseFloat(amount) > balance.realized_profit) {
      alert('Gerçekleşen karınızdan fazla çekemezsiniz');
      return;
    }
    if (parseFloat(amount) > balance.balance) {
      alert('Yetersiz bakiye - Önce satış yaparak kar realize edin');
      return;
    }

    setLoading(true);
    const success = await updateCashBalance('TRY', parseFloat(amount), 'withdrawal', notes || 'Kar çekme');

    if (success) {
      setShowProfitWithdrawModal(false);
      setAmount('');
      setNotes('');
      await loadData();
    } else {
      alert('İşlem başarısız oldu');
    }
    setLoading(false);
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownCircle className="text-green-600" size={20} />;
      case 'withdrawal':
        return <ArrowUpCircle className="text-red-600" size={20} />;
      case 'buy':
        return <TrendingUp className="text-blue-600" size={20} />;
      case 'sell':
        return <DollarSign className="text-green-600" size={20} />;
      case 'dividend':
        return <Plus className="text-green-600" size={20} />;
      default:
        return <Wallet className="text-slate-600" size={20} />;
    }
  };

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: 'Para Yatırma',
      withdrawal: 'Para Çekme',
      buy: 'Alım',
      sell: 'Satım',
      dividend: 'Temettü',
    };
    return labels[type] || type;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wallet className="text-blue-600" size={24} />
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Nakit Cüzdan
            </h3>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              Para giriş çıkış takibi
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowDepositModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Yatır</span>
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            <Minus size={16} />
            <span className="hidden sm:inline">Çek</span>
          </button>
          {balance && balance.realized_profit > 0 && (
            <button
              onClick={() => setShowProfitWithdrawModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all font-medium shadow-md hover:shadow-lg"
            >
              <Zap size={16} />
              <span className="hidden sm:inline">Kar Çek</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-slate-600 dark:text-gray-400 mb-1 font-medium">Mevcut Bakiye</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {balance ? formatCash(balance.balance, 'TRY') : '0.00 ₺'}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-xs text-slate-600 dark:text-gray-400 mb-1 font-medium">Toplam Yatırılan</p>
          <p className="text-2xl font-bold text-green-600">
            {balance ? formatCash(balance.total_deposits, 'TRY') : '0.00 ₺'}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-xs text-slate-600 dark:text-gray-400 mb-1 font-medium">Toplam Çekilen</p>
          <p className="text-2xl font-bold text-red-600">
            {balance ? formatCash(balance.total_withdrawals, 'TRY') : '0.00 ₺'}
          </p>
        </div>

        <div className={`p-4 bg-gradient-to-br rounded-lg border ${
          balance && balance.realized_profit >= 0
            ? 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 border-green-200 dark:border-green-800'
            : 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 border-red-200 dark:border-red-800'
        }`}>
          <p className="text-xs text-slate-600 dark:text-gray-400 mb-1 font-medium">Gerçekleşen Kar/Zarar</p>
          <p className={`text-2xl font-bold ${balance && balance.realized_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {balance ? formatCash(balance.realized_profit, 'TRY') : '0.00 ₺'}
          </p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-700 dark:text-gray-300 mb-3">
          Son İşlemler
        </h4>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {transactions.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-gray-400 py-8">
              Henüz işlem yok
            </p>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-900 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction.transaction_type)}
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      {getTransactionLabel(transaction.transaction_type)}
                    </p>
                    {transaction.notes && (
                      <p className="text-xs text-slate-500 dark:text-gray-400 truncate max-w-xs">
                        {transaction.notes}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${
                    ['deposit', 'sell', 'dividend'].includes(transaction.transaction_type)
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {['deposit', 'sell', 'dividend'].includes(transaction.transaction_type) ? '+' : '-'}
                    {formatCash(transaction.amount, transaction.currency)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Bakiye: {formatCash(transaction.balance_after, transaction.currency)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showDepositModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Para Yatır</h3>
              <button onClick={() => setShowDepositModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Miktar (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Not (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Örn: Maaş yatırımı"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  İptal
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'İşleniyor...' : 'Yatır'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Para Çek</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Mevcut Bakiye: <strong>{balance ? formatCash(balance.balance, 'TRY') : '0.00 ₺'}</strong>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Miktar (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Not (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Örn: Fatura ödemesi"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  İptal
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'İşleniyor...' : 'Çek'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfitWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border-2 border-yellow-500">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
              <div className="flex items-center gap-3">
                <Zap className="text-yellow-600" size={24} />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Kar Çek</h3>
              </div>
              <button onClick={() => setShowProfitWithdrawModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    Gerçekleşen Kar: <strong className="text-lg">{balance ? formatCash(balance.realized_profit, 'TRY') : '0.00 ₺'}</strong>
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Mevcut Bakiye: <strong>{balance ? formatCash(balance.balance, 'TRY') : '0.00 ₺'}</strong>
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg">
                <p className="text-sm text-yellow-900 dark:text-yellow-300 font-medium">
                  💡 Kar çekme işlemi sadece gerçekleşen karınızdan yapılabilir. Satış yaptıkça kar realize olur.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Çekilecek Miktar (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={balance?.realized_profit || 0}
                  className="w-full px-4 py-2 border-2 border-yellow-300 dark:border-yellow-700 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-yellow-500"
                  placeholder="0.00"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => balance && setAmount((balance.realized_profit * 0.25).toFixed(2))}
                    className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => balance && setAmount((balance.realized_profit * 0.5).toFixed(2))}
                    className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => balance && setAmount((balance.realized_profit * 0.75).toFixed(2))}
                    className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => balance && setAmount(balance.realized_profit.toFixed(2))}
                    className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                  >
                    Tümü
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Not (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-yellow-500"
                  placeholder="Örn: Yıllık kar çekimi"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowProfitWithdrawModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  İptal
                </button>
                <button
                  onClick={handleProfitWithdraw}
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
                >
                  {loading ? 'İşleniyor...' : '💰 Kar Çek'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
