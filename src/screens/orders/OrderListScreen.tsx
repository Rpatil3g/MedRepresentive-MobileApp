import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { addMonths, endOfMonth, format, isSameMonth, startOfMonth } from 'date-fns';
import { orderApi, targetApi } from '../../services/api';
import { Order, OrderStatus, OrderSummary } from '../../types/order.types';
import { MyTargets } from '../../types/target.types';
import { OrderStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';
import { ORDER_STATUS_META, formatINR, formatINRShort } from './orderMeta';

type OrderListNavProp = StackNavigationProp<OrderStackParamList, 'OrderList'>;

const PAGE_SIZE = 20;
const TABS: Array<OrderStatus | 'ALL'> = ['ALL', 'PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];

const OrderListScreen: React.FC = () => {
  const navigation = useNavigation<OrderListNavProp>();

  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL');
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [targets, setTargets] = useState<MyTargets | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestSeq = useRef(0);

  const isCurrentMonth = isSameMonth(month, new Date());

  const load = useCallback(async (forMonth: Date, tab: OrderStatus | 'ALL') => {
    const seq = ++requestSeq.current;
    const fromDate = format(forMonth, 'yyyy-MM-dd');
    const toDate = format(endOfMonth(forMonth), 'yyyy-MM-dd');
    try {
      const [list, monthSummary, monthTargets] = await Promise.all([
        orderApi.getMyOrders({
          fromDate,
          toDate,
          status: tab === 'ALL' ? undefined : tab,
          pageNumber: 1,
          pageSize: PAGE_SIZE,
        }),
        orderApi.getMySummary({ fromDate, toDate }).catch(() => null),
        targetApi.getMyTargets(forMonth.getFullYear(), forMonth.getMonth() + 1).catch(() => null),
      ]);
      if (seq !== requestSeq.current) return;
      setOrders(list?.items ?? []);
      setTotalCount(list?.totalCount ?? 0);
      setPage(1);
      setSummary(monthSummary);
      setTargets(monthTargets);
    } catch {
      if (seq === requestSeq.current) {
        setOrders([]);
        setTotalCount(0);
      }
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(month, activeTab);
    }, [load, month, activeTab]),
  );

  const loadMore = async () => {
    if (loadingMore || orders.length >= totalCount) return;
    setLoadingMore(true);
    try {
      const next = await orderApi.getMyOrders({
        fromDate: format(month, 'yyyy-MM-dd'),
        toDate: format(endOfMonth(month), 'yyyy-MM-dd'),
        status: activeTab === 'ALL' ? undefined : activeTab,
        pageNumber: page + 1,
        pageSize: PAGE_SIZE,
      });
      setOrders(prev => [...prev, ...(next?.items ?? [])]);
      setPage(page + 1);
    } catch {
      // keep what we have
    } finally {
      setLoadingMore(false);
    }
  };

  const changeMonth = (delta: number) => {
    setLoading(true);
    setMonth(prev => startOfMonth(addMonths(prev, delta)));
  };

  const changeTab = (tab: OrderStatus | 'ALL') => {
    setLoading(true);
    setActiveTab(tab);
  };

  const onRefresh = () => {
    setRefreshing(true);
    load(month, activeTab);
  };

  // Achievement counts dispatched orders only; booked includes those still awaiting dispatch
  const booked = summary?.totalValue ?? 0;
  const dispatched = targets?.actualSales ?? 0;
  const salesTarget = targets?.salesTarget ?? null;
  const progress = salesTarget ? Math.min((dispatched / salesTarget) * 100, 100) : 0;

  const renderOrder = ({ item }: { item: Order }) => {
    const status = ORDER_STATUS_META[item.orderStatus];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardTopRow}>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <Text style={styles.amount}>{formatINR(item.netAmount)}</Text>
        </View>
        <View style={styles.partyRow}>
          <MaterialCommunityIcons
            name={item.orderType === 'Chemist' ? 'store-outline' : 'warehouse'}
            size={14}
            color={COLORS.textSecondary}
          />
          <Text style={styles.partyText} numberOfLines={1}>
            {item.orderType === 'Chemist' ? `${item.chemistName} • via ${item.stockistName}` : item.stockistName}
          </Text>
        </View>
        <View style={styles.cardBottomRow}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <MaterialCommunityIcons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={styles.meta}>
            {item.itemCount} {item.itemCount === 1 ? 'product' : 'products'} • {format(new Date(item.orderDate), 'dd MMM, hh:mm a')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Month switcher + summary */}
      <View style={styles.summaryCard}>
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.monthText}>{format(month, 'MMMM yyyy')}</Text>
          <TouchableOpacity
            onPress={() => changeMonth(1)}
            disabled={isCurrentMonth}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={isCurrentMonth ? COLORS.textDisabled : COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Dispatched</Text>
            <Text style={styles.summaryValue}>{formatINRShort(dispatched)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Target</Text>
            <Text style={styles.summaryValue}>{salesTarget ? formatINRShort(salesTarget) : '—'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <TouchableOpacity style={styles.summaryItem} onPress={() => navigation.navigate('MyTargets')}>
            <Text style={styles.summaryLabel}>Booked ({summary?.totalOrders ?? 0})</Text>
            <Text style={styles.summaryValue}>{formatINRShort(booked)}</Text>
          </TouchableOpacity>
        </View>
        {salesTarget ? (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        ) : null}
      </View>

      {/* Status tabs */}
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
            onPress={() => changeTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'ALL' ? 'All' : ORDER_STATUS_META[tab].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={COLORS.primary} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="cart-outline" size={48} color={COLORS.textDisabled} />
              <Text style={styles.emptyTitle}>No orders</Text>
              <Text style={styles.emptySubtitle}>
                {isCurrentMonth ? 'Tap + to book an order' : 'Nothing booked in this month'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('BookOrder')} activeOpacity={0.85}>
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
  },
  summaryCard: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.paddingLG,
    paddingTop: SIZES.paddingSM,
    paddingBottom: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.paddingSM,
  },
  monthText: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
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
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: SIZES.paddingSM,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#be185d',
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
  listContent: {
    padding: SIZES.paddingMD,
    paddingBottom: 90,
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingSM + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  amount: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  partyText: {
    flex: 1,
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSM,
  },
  statusText: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
  },
  meta: {
    fontSize: SIZES.fontXS,
    color: COLORS.textDisabled,
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

export default OrderListScreen;
