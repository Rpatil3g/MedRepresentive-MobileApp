import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { addMonths, endOfMonth, format, isSameMonth, parseISO, startOfMonth, subDays } from 'date-fns';
import { expenseApi } from '../../services/api';
import { refreshRejectedCounts } from '../../hooks/useRejectedCounts';
import { Expense, ExpenseCategory, ExpenseStatus } from '../../types/expense.types';
import { ExpenseStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES, EXPENSE_ATTENTION_WINDOW_DAYS } from '../../constants';
import { formatDate } from '../../utils/dateUtils';
import { showAlert } from '../../utils/helpers';

type ExpenseListNavProp = StackNavigationProp<ExpenseStackParamList, 'ExpenseList'>;
type ExpenseListRouteProp = RouteProp<ExpenseStackParamList, 'ExpenseList'>;

const CATEGORY_META: Record<ExpenseCategory, { icon: string; color: string; bg: string }> = {
  Travel:  { icon: 'car-outline',        color: '#ea580c', bg: '#ffedd5' },
  Food:    { icon: 'food-outline',       color: '#16a34a', bg: '#dcfce7' },
  Other:   { icon: 'dots-horizontal',   color: '#7c3aed', bg: '#ede9fe' },
};

const STATUS_META: Record<ExpenseStatus, { color: string; bg: string; label: string }> = {
  Pending:  { color: '#b45309', bg: '#fffbeb', label: 'Pending'  },
  Approved: { color: '#047857', bg: '#f0fdf4', label: 'Approved' },
  Rejected: { color: '#dc2626', bg: '#fef2f2', label: 'Rejected' },
  Paid:     { color: '#1d4ed8', bg: '#eff6ff', label: 'Paid'     },
};

const TABS: Array<ExpenseStatus | 'All'> = ['All', 'Pending', 'Approved', 'Rejected', 'Paid'];

// Expense dates are date-only ('yyyy-MM-ddT00:00:00'); key on the raw date so no timezone shift applies
const dayKeyOf = (expense: Expense) => expense.expenseDate.slice(0, 10);

const sumOf = (items: Expense[]) => items.reduce((sum, e) => sum + e.amount, 0);
const inr = (amount: number) => `₹ ${amount.toLocaleString('en-IN')}`;

const ExpenseListScreen: React.FC = () => {
  const navigation = useNavigation<ExpenseListNavProp>();
  const route = useRoute<ExpenseListRouteProp>();
  // Opened from a DCR for one day — show just that day, no month switcher
  const filterDate = route.params?.date;
  const returnTo = route.params?.returnTo;

  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  // Rejected / pending claims from the last 90 days — shown even when they fall in another month
  const [attention, setAttention] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ExpenseStatus | 'All'>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const isCurrentMonth = isSameMonth(month, new Date());
  const monthKey = format(month, 'yyyy-MM');

  const fetchExpenses = useCallback(async (forMonth: Date) => {
    const seq = ++requestSeq.current;
    try {
      const listRequest = filterDate
        ? expenseApi.getMyExpenses({ date: filterDate })
        : expenseApi.getMyExpenses({
            fromDate: format(startOfMonth(forMonth), 'yyyy-MM-dd'),
            toDate: format(endOfMonth(forMonth), 'yyyy-MM-dd'),
          });
      const attentionRequest = filterDate
        ? Promise.resolve([] as Expense[])
        : expenseApi.getMyExpenses({
            fromDate: format(subDays(new Date(), EXPENSE_ATTENTION_WINDOW_DAYS), 'yyyy-MM-dd'),
            status: 'Rejected,Pending',
          }).catch(() => [] as Expense[]);

      const [list, needsAttention] = await Promise.all([listRequest, attentionRequest]);
      if (seq !== requestSeq.current) return;
      setExpenses(list);
      setAttention(needsAttention);
    } catch {
      // silently handled — empty list shown
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
        setSwitching(false);
        setRefreshing(false);
      }
    }
  }, [filterDate]);

  useFocusEffect(useCallback(() => { fetchExpenses(month); }, [fetchExpenses, month]));

  const onRefresh = () => { setRefreshing(true); fetchExpenses(month); };

  const changeMonth = (delta: number) => {
    setSwitching(true);
    setMonth(prev => startOfMonth(addMonths(prev, delta)));
  };

  const handleDelete = (expense: Expense) => {
    if (expense.status !== 'Pending') {
      showAlert('Cannot Delete', 'Only pending expenses can be deleted.');
      return;
    }
    showAlert(
      'Delete Expense',
      `Delete ₹${expense.amount.toLocaleString('en-IN')} ${expense.category} expense?`,
      async () => {
        setDeletingId(expense.id);
        try {
          await expenseApi.deleteExpense(expense.id);
          refreshRejectedCounts();
          setExpenses(prev => prev.filter(e => e.id !== expense.id));
          setAttention(prev => prev.filter(e => e.id !== expense.id));
        } catch {
          showAlert('Error', 'Failed to delete expense. Please try again.');
        } finally {
          setDeletingId(null);
        }
      },
    );
  };

  const filtered = activeTab === 'All'
    ? expenses
    : expenses.filter(e => e.status === activeTab);

  // Newest day first; each group carries its own total
  const dayGroups = useMemo(() => {
    const groups = new Map<string, Expense[]>();
    for (const e of filtered) {
      const key = dayKeyOf(e);
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([day, items]) => ({ day, items, total: sumOf(items) }));
  }, [filtered]);

  // Only claims from other months — this month's already appear in the list below
  const attentionItems = useMemo(
    () => (filterDate ? ([] as Expense[]) : attention.filter(e => !dayKeyOf(e).startsWith(monthKey)))
      .sort((a, b) => (a.status === b.status ? dayKeyOf(b).localeCompare(dayKeyOf(a)) : a.status === 'Rejected' ? -1 : 1)),
    [attention, filterDate, monthKey],
  );

  const totals = useMemo(() => ({
    claimed: sumOf(expenses),
    pending: sumOf(expenses.filter(e => e.status === 'Pending')),
    approved: sumOf(expenses.filter(e => e.status === 'Approved')),
    paid: sumOf(expenses.filter(e => e.status === 'Paid')),
  }), [expenses]);

  const periodLabel = filterDate
    ? format(parseISO(filterDate), 'dd MMM yyyy')
    : format(month, 'MMMM yyyy');

  const renderCard = (expense: Expense) => {
    const cat = CATEGORY_META[expense.category as ExpenseCategory] ?? CATEGORY_META.Other;
    const status = STATUS_META[expense.status];
    const isDeleting = deletingId === expense.id;

    return (
      <View key={expense.id} style={styles.card}>
        <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
          <MaterialCommunityIcons name={cat.icon} size={20} color={cat.color} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardCategory}>{expense.category}</Text>
            <Text style={styles.cardAmount}>{inr(expense.amount)}</Text>
          </View>
          <View style={styles.cardBottomRow}>
            <Text style={styles.cardDate}>{formatDate(expense.expenseDate, 'dd MMM yyyy')}</Text>
            {expense.description ? (
              <Text style={styles.cardDesc} numberOfLines={1}>{expense.description}</Text>
            ) : null}
          </View>
          <View style={styles.cardTagRow}>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
            {expense.receiptUrl ? (
              <View style={styles.receiptBadge}>
                <MaterialCommunityIcons name="paperclip" size={12} color={COLORS.textSecondary} />
                <Text style={styles.receiptBadgeText}>Receipt</Text>
              </View>
            ) : null}
          </View>
          {expense.status === 'Rejected' && expense.approvalComments ? (
            <View style={styles.rejectionNote}>
              <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#dc2626" />
              <Text style={styles.rejectionNoteText} numberOfLines={2}>
                {expense.approvalComments}
              </Text>
            </View>
          ) : null}
        </View>

        {expense.status === 'Pending' && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(expense)}
            disabled={isDeleting}
          >
            {isDeleting
              ? <ActivityIndicator size="small" color={COLORS.error} />
              : <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.error} />
            }
          </TouchableOpacity>
        )}
        {expense.status === 'Rejected' && (
          <View style={styles.rejectedActions}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('EditExpense', { expenseId: expense.id })}
            >
              <MaterialCommunityIcons name="pencil-outline" size={16} color={COLORS.primary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDelete(expense)}
              disabled={isDeleting}
            >
              {isDeleting
                ? <ActivityIndicator size="small" color={COLORS.error} />
                : <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.error} />
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const rejectedElsewhere = attentionItems.filter(e => e.status === 'Rejected').length;
  const pendingElsewhere = attentionItems.length - rejectedElsewhere;

  return (
    <View style={styles.container}>
      {/* Month switcher — hidden when showing a single day from a DCR */}
      {filterDate ? (
        <View style={styles.dayHeader}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={18} color={COLORS.primary} />
          <Text style={styles.dayHeaderText}>Expenses on {periodLabel}</Text>
        </View>
      ) : (
        <View style={styles.monthRow}>
          <TouchableOpacity style={styles.monthNavBtn} onPress={() => changeMonth(-1)}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{periodLabel}</Text>
          <TouchableOpacity
            style={[styles.monthNavBtn, isCurrentMonth && styles.monthNavBtnDisabled]}
            onPress={() => changeMonth(1)}
            disabled={isCurrentMonth}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={isCurrentMonth ? COLORS.textDisabled : COLORS.primary}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Totals for the month (or day) */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Claimed</Text>
          <Text style={styles.summaryValue}>{inr(totals.claimed)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: STATUS_META.Pending.color }]}>{inr(totals.pending)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Approved</Text>
          <Text style={[styles.summaryValue, { color: STATUS_META.Approved.color }]}>{inr(totals.approved)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Paid</Text>
          <Text style={[styles.summaryValue, { color: STATUS_META.Paid.color }]}>{inr(totals.paid)}</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabRow}
        contentContainerStyle={styles.tabRowContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {switching && (
          <ActivityIndicator style={styles.switchingSpinner} color={COLORS.primary} />
        )}

        {/* Claims from other months the MR still has to fix (rejected) or is waiting on (pending) */}
        {attentionItems.length > 0 && (
          <View style={styles.attentionBox}>
            <View style={styles.attentionHeader}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#b45309" />
              <Text style={styles.attentionTitle}>From other months</Text>
            </View>
            <Text style={styles.attentionSubtitle}>
              {[
                rejectedElsewhere > 0 ? `${rejectedElsewhere} rejected — edit and resubmit` : '',
                pendingElsewhere > 0 ? `${pendingElsewhere} awaiting approval` : '',
              ].filter(Boolean).join(' · ')}
            </Text>
            {attentionItems.map(renderCard)}
          </View>
        )}

        {dayGroups.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="receipt" size={48} color={COLORS.textDisabled} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'All'
                ? `No expenses ${filterDate ? 'on' : 'in'} ${periodLabel}`
                : `No ${activeTab.toLowerCase()} expenses ${filterDate ? 'on' : 'in'} ${periodLabel}`}
            </Text>
            {activeTab === 'All' && (filterDate || isCurrentMonth) && (
              <Text style={styles.emptySubtitle}>Tap + to add an expense</Text>
            )}
          </View>
        ) : (
          dayGroups.map(group => (
            <View key={group.day}>
              <View style={styles.dayGroupHeader}>
                <Text style={styles.dayGroupDate}>{format(parseISO(group.day), 'EEE, dd MMM')}</Text>
                <Text style={styles.dayGroupTotal}>{inr(group.total)}</Text>
              </View>
              {group.items.map(renderCard)}
            </View>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpense', { date: filterDate, returnTo })}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={26} color={COLORS.textWhite} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundGray,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    paddingVertical: SIZES.paddingMD,
    paddingHorizontal: SIZES.paddingLG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  monthNavBtnDisabled: {
    backgroundColor: COLORS.backgroundGray,
  },
  monthLabel: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.paddingLG,
    paddingVertical: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dayHeaderText: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  switchingSpinner: {
    marginBottom: SIZES.paddingSM,
  },
  attentionBox: {
    backgroundColor: '#fffbeb',
    borderRadius: SIZES.radiusLG,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: SIZES.paddingSM,
    paddingBottom: 2,
    marginBottom: SIZES.paddingMD,
  },
  attentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attentionTitle: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
    color: '#92400e',
  },
  attentionSubtitle: {
    fontSize: SIZES.fontXS,
    color: '#b45309',
    marginTop: 2,
    marginBottom: SIZES.paddingSM,
  },
  dayGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 6,
  },
  dayGroupDate: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  dayGroupTotal: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabRow: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexGrow: 0,
  },
  tabRowContent: {
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
    gap: 8,
  },
  tab: {
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 6,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.backgroundGray,
  },
  tabActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabText: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: SIZES.paddingMD,
    paddingBottom: 90,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptySubtitle: {
    fontSize: SIZES.fontSM,
    color: COLORS.textDisabled,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingSM + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingMD,
  },
  cardBody: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardCategory: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardAmount: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardBottomRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  cardDate: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
  },
  cardDesc: {
    fontSize: SIZES.fontXS,
    color: COLORS.textDisabled,
    flex: 1,
  },
  cardTagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSM,
  },
  statusText: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
  },
  receiptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSM,
    backgroundColor: COLORS.backgroundGray,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  receiptBadgeText: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
  },
  rejectionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#fef2f2',
    borderRadius: SIZES.radiusSM,
    borderLeftWidth: 2,
    borderLeftColor: '#dc2626',
  },
  rejectionNoteText: {
    flex: 1,
    fontSize: SIZES.fontXS,
    color: '#dc2626',
    lineHeight: 16,
  },
  actionBtn: {
    padding: SIZES.paddingXS,
    marginLeft: SIZES.paddingSM,
  },
  rejectedActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    marginLeft: SIZES.paddingSM,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSM,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editBtnText: {
    fontSize: SIZES.fontXS,
    fontWeight: '700',
    color: COLORS.primary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});

export default ExpenseListScreen;
