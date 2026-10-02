import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { Button, ErrorMessage } from '../../components/common';
import { orderApi } from '../../services/api';
import { Order } from '../../types/order.types';
import { OrderStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';
import { showAlert } from '../../utils/helpers';
import { ORDER_STATUS_META, formatINR } from './orderMeta';

type OrderDetailRouteProp = RouteProp<OrderStackParamList, 'OrderDetail'>;

const OrderDetailScreen: React.FC = () => {
  const route = useRoute<OrderDetailRouteProp>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setOrder(await orderApi.getOrderById(orderId));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load order');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order?',
      `${order?.orderNumber} will be cancelled and removed from your sales total.`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              setOrder(await orderApi.cancelOrder(orderId));
            } catch (err: any) {
              showAlert('Error', err?.response?.data?.message || 'Failed to cancel the order.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !order) {
    return <ErrorMessage message={error ?? 'Order not found'} onRetry={load} />;
  }

  const status = ORDER_STATUS_META[order.orderStatus];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <MaterialCommunityIcons name={status.icon} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>{format(new Date(order.orderDate), 'dd MMM yyyy, hh:mm a')}</Text>
        {order.statusRemarks ? (
          <View style={[styles.note, { borderLeftColor: status.color }]}>
            <Text style={styles.noteText}>{order.statusRemarks}</Text>
          </View>
        ) : null}
      </View>

      {/* Customer */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Customer</Text>
        {order.orderType === 'Chemist' ? (
          <>
            <InfoRow icon="store-outline" label="Chemist" value={order.chemistName ?? '—'} />
            <InfoRow icon="warehouse" label="Supplied by" value={order.stockistName} />
          </>
        ) : (
          <InfoRow icon="warehouse" label="Stockist" value={order.stockistName} />
        )}
        {order.dispatchedAt ? (
          <InfoRow icon="truck-check-outline" label="Dispatched on" value={format(new Date(order.dispatchedAt), 'dd MMM yyyy, hh:mm a')} />
        ) : null}
        {order.remarks ? <InfoRow icon="text" label="Remarks" value={order.remarks} /> : null}
      </View>

      {/* Items */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Products ({order.itemCount})</Text>
        {order.items.map((item, idx) => (
          <View key={item.id} style={[styles.itemRow, idx < order.items.length - 1 && styles.itemBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemSub}>
                {item.quantity} × {formatINR(item.unitPrice)}
                {item.freeQuantity > 0 ? ` + ${item.freeQuantity} free` : ''}
                {item.discountPercentage > 0 ? ` • ${item.discountPercentage}% off` : ''}
                {item.taxPercentage > 0 ? ` • GST ${item.taxPercentage}%` : ''}
              </Text>
            </View>
            <Text style={styles.itemTotal}>{formatINR(item.lineTotal)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <TotalRow label="Gross" value={formatINR(order.totalAmount)} />
          {order.discountAmount > 0 && <TotalRow label="Discount" value={`−${formatINR(order.discountAmount)}`} />}
          <TotalRow label="GST" value={formatINR(order.taxAmount)} />
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Net Amount</Text>
            <Text style={styles.netValue}>{formatINR(order.netAmount)}</Text>
          </View>
        </View>
      </View>

      {order.orderStatus === 'PENDING' && (
        <Button
          title="Cancel Order"
          variant="danger"
          onPress={handleCancel}
          loading={cancelling}
          disabled={cancelling}
        />
      )}
    </ScrollView>
  );
};

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <MaterialCommunityIcons name={icon} size={18} color={COLORS.textSecondary} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const TotalRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.totalRow}>
    <Text style={styles.totalLabel}>{label}</Text>
    <Text style={styles.totalValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  content: {
    padding: SIZES.paddingMD,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundGray,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
  },
  cardTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingSM,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: SIZES.fontLG,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSM,
  },
  statusText: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
  },
  dateText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  note: {
    marginTop: SIZES.paddingSM,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.backgroundGray,
    borderLeftWidth: 3,
    borderRadius: SIZES.radiusSM,
  },
  noteText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  itemName: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemSub: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totals: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 6,
    paddingTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  netLabel: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  netValue: {
    fontSize: SIZES.fontLG,
    fontWeight: '800',
    color: COLORS.primary,
  },
});

export default OrderDetailScreen;
