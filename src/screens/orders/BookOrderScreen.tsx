import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from 'react-native-geolocation-service';
import { Button } from '../../components/common';
import { chemistApi, stockistApi, productApi, orderApi } from '../../services/api';
import { Stockist } from '../../services/api/stockistApi';
import { useAppSelector } from '../../store/hooks';
import { OrderStackParamList } from '../../types/navigation.types';
import { OrderType } from '../../types/order.types';
import { Product } from '../../types/product.types';
import { Chemist } from '../../types/chemist.types';
import { COLORS, SIZES } from '../../constants';
import { showAlert, requestLocationPermission } from '../../utils/helpers';
import { formatINR, round2 } from './orderMeta';

type BookOrderNavProp = StackNavigationProp<OrderStackParamList, 'BookOrder'>;
type BookOrderRouteProp = RouteProp<OrderStackParamList, 'BookOrder'>;

interface Party {
  id: string;
  name: string;
  details?: string;
}

interface Line {
  product: Product;
  quantity: string;
  freeQuantity: string;
  discount: string;
}

type SearchKind = 'chemist' | 'stockist' | 'product';

const newOfflineId = () => `ord_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const chemistToParty = (c: Chemist): Party => ({
  id: c.id,
  name: c.pharmacyName || c.chemistName,
  details: [c.chemistName, c.address, c.city].filter(Boolean).join(' • '),
});

const stockistToParty = (s: Stockist): Party => ({
  id: s.id,
  name: s.stockistName,
  details: [s.companyName, s.city].filter(Boolean).join(' • '),
});

const matches = (text: string, ...fields: (string | undefined)[]) => {
  const q = text.trim().toLowerCase();
  return fields.some(f => f?.toLowerCase().includes(q));
};

interface PartyRowProps {
  label: string;
  party: Party | null;
  icon: string;
  onPress?: () => void;
  locked?: boolean;
}

const PartyRow: React.FC<PartyRowProps> = ({ label, party, icon, onPress, locked }) => (
  <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity
      style={[styles.selectRow, locked && styles.selectRowLocked]}
      onPress={locked ? undefined : onPress}
      activeOpacity={locked ? 1 : 0.7}
    >
      <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} />
      <Text style={[styles.selectText, !party && { color: COLORS.textSecondary }]} numberOfLines={1}>
        {party ? party.name : 'Tap to search'}
      </Text>
      {!locked && <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />}
    </TouchableOpacity>
  </View>
);

const BookOrderScreen: React.FC = () => {
  const navigation = useNavigation<BookOrderNavProp>();
  const route = useRoute<BookOrderRouteProp>();
  const params = route.params;
  const { visitId, chemistId: visitChemistId, stockistId: visitStockistId, partyName } = params ?? {};
  const fromVisit = !!visitId;

  const [orderType, setOrderType] = useState<OrderType>('Chemist');
  const [chemist, setChemist] = useState<Party | null>(null);
  const [stockist, setStockist] = useState<Party | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [remarks, setRemarks] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // One id per order attempt: a retry after a network error can't book the same order twice
  const offlineId = useRef(newOfflineId());
  const submitted = useRef(false);

  // ── Search modal
  const [searchKind, setSearchKind] = useState<SearchKind | null>(null);
  const [query, setQuery] = useState('');
  const [partyResults, setPartyResults] = useState<Party[]>([]);
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  // Lists shown as soon as a picker opens — chemists/stockists in the MR's HQ, all active
  // products — fetched once per screen and reused; typing narrows them
  const hqId = useAppSelector(s => s.user.mrProfile?.headquartersId ?? s.auth.user?.headquartersId);
  const defaultLists = useRef<{ chemist?: Party[]; stockist?: Party[]; product?: Product[] }>({});
  const [loadingDefaults, setLoadingDefaults] = useState(false);

  // (Re)initialise whenever we arrive with different visit params
  useEffect(() => {
    const isStockistVisit = !!visitStockistId && !visitChemistId;
    setOrderType(isStockistVisit ? 'Stockist' : 'Chemist');
    setChemist(visitChemistId ? { id: visitChemistId, name: partyName ?? 'Chemist' } : null);
    setStockist(visitStockistId && isStockistVisit ? { id: visitStockistId, name: partyName ?? 'Stockist' } : null);
    setLines([]);
    setRemarks('');
    offlineId.current = newOfflineId();
    submitted.current = false;
  }, [visitId, visitChemistId, visitStockistId, partyName]);

  // Booking location is recorded when available; it never blocks the order
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await requestLocationPermission())) return;
      Geolocation.getCurrentPosition(
        pos => {
          if (!cancelled) setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        () => undefined,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    })();
    return () => { cancelled = true; };
  }, []);

  // Don't lose a half-built order to an accidental back press
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (submitted.current || lines.length === 0) return;
      e.preventDefault();
      Alert.alert('Discard order?', 'The products you added will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, lines.length]);

  const unitPrice = (p: Product) => (orderType === 'Chemist' ? p.ptr : p.pts) ?? 0;

  const computed = useMemo(() => lines.map(l => {
    const qty = parseInt(l.quantity, 10) || 0;
    const price = (orderType === 'Chemist' ? l.product.ptr : l.product.pts) ?? 0;
    const gross = round2(qty * price);
    const discount = round2(gross * (parseFloat(l.discount) || 0) / 100);
    const tax = round2((gross - discount) * (l.product.gstPercentage ?? 0) / 100);
    return { gross, discount, tax, total: round2(gross - discount + tax) };
  }), [lines, orderType]);

  const totals = useMemo(() => computed.reduce(
    (acc, c) => ({
      gross: acc.gross + c.gross,
      discount: acc.discount + c.discount,
      tax: acc.tax + c.tax,
      net: acc.net + c.total,
    }),
    { gross: 0, discount: 0, tax: 0, net: 0 },
  ), [computed]);

  const changeOrderType = (type: OrderType) => {
    if (fromVisit || type === orderType) return;
    setOrderType(type);
    if (type === 'Stockist') setChemist(null);
  };

  // ── Search

  /** The opening list for a picker (cached after the first load) */
  const loadDefaults = async (kind: SearchKind): Promise<Party[] | Product[]> => {
    const cached = defaultLists.current[kind];
    if (cached) return cached;
    if (kind === 'product') {
      const page = await productApi.getProducts({ isActive: true, pageSize: 100 });
      const items = (page?.items ?? []).filter(p => p.isActive !== false);
      defaultLists.current.product = items;
      return items;
    }
    const parties = kind === 'chemist'
      ? (await chemistApi.listChemists(hqId)).map(chemistToParty)
      : (await stockistApi.listStockists(hqId)).map(stockistToParty);
    defaultLists.current[kind] = parties;
    return parties;
  };

  const showList = (kind: SearchKind, list: Party[] | Product[]) => {
    if (kind === 'product') setProductResults(list as Product[]);
    else setPartyResults(list as Party[]);
  };

  const openSearch = async (kind: SearchKind) => {
    setSearchKind(kind);
    setQuery('');
    setPartyResults([]);
    setProductResults([]);

    const seq = ++searchSeq.current;
    setLoadingDefaults(true);
    try {
      const list = await loadDefaults(kind);
      if (seq === searchSeq.current) showList(kind, list);
    } catch {
      // list stays empty — the MR can still search
    } finally {
      if (seq === searchSeq.current) setLoadingDefaults(false);
    }
  };

  const closeSearch = () => setSearchKind(null);

  const runSearch = async (text: string) => {
    setQuery(text);
    if (!searchKind) return;

    // Up to one letter: filter the opening list on the phone; from two letters search everything
    if (text.trim().length < 2) {
      ++searchSeq.current;
      setSearching(false);
      const list = defaultLists.current[searchKind] ?? [];
      if (!text.trim()) {
        showList(searchKind, list);
      } else if (searchKind === 'product') {
        setProductResults((list as Product[]).filter(p => matches(text, p.productName, p.composition)));
      } else {
        setPartyResults((list as Party[]).filter(p => matches(text, p.name, p.details)));
      }
      return;
    }

    const seq = ++searchSeq.current;
    setSearching(true);
    try {
      if (searchKind === 'product') {
        const res = await productApi.searchProducts(text.trim());
        if (seq === searchSeq.current) setProductResults((res || []).filter(p => p.isActive !== false));
      } else if (searchKind === 'stockist') {
        const res = await stockistApi.searchStockists(text.trim());
        if (seq === searchSeq.current) setPartyResults((res || []).map(stockistToParty));
      } else if (searchKind === 'chemist') {
        const res = await chemistApi.searchChemists(text.trim());
        if (seq === searchSeq.current) setPartyResults((res || []).map(chemistToParty));
      }
    } catch {
      // results stay empty
    } finally {
      if (seq === searchSeq.current) setSearching(false);
    }
  };

  const pickParty = (party: Party) => {
    if (searchKind === 'chemist') setChemist(party);
    else setStockist(party);
    closeSearch();
  };

  const pickProduct = (product: Product) => {
    if (lines.some(l => l.product.id === product.id)) {
      closeSearch();
      return;
    }
    setLines(prev => [...prev, { product, quantity: '1', freeQuantity: '', discount: '' }]);
    closeSearch();
  };

  const updateLine = (productId: string, field: 'quantity' | 'freeQuantity' | 'discount', value: string) => {
    const cleaned = field === 'discount' ? value.replace(/[^0-9.]/g, '') : value.replace(/[^0-9]/g, '');
    setLines(prev => prev.map(l => (l.product.id === productId ? { ...l, [field]: cleaned } : l)));
  };

  const removeLine = (productId: string) => setLines(prev => prev.filter(l => l.product.id !== productId));

  // ── Submit
  const handleSubmit = async () => {
    if (orderType === 'Chemist' && !chemist) {
      showAlert('Chemist Required', 'Select the chemist placing this order.');
      return;
    }
    if (!stockist) {
      showAlert(
        'Stockist Required',
        orderType === 'Chemist' ? 'Select the stockist who will supply this order.' : 'Select the stockist placing this order.',
      );
      return;
    }
    if (lines.length === 0) {
      showAlert('No Products', 'Add at least one product to the order.');
      return;
    }
    const unpriced = lines.find(l => unitPrice(l.product) <= 0);
    if (unpriced) {
      showAlert('Price Missing', `${unpriced.product.productName} has no ${orderType === 'Chemist' ? 'PTR' : 'PTS'} set. Remove it or ask your admin to add the price.`);
      return;
    }
    const badQty = lines.find(l => (parseInt(l.quantity, 10) || 0) < 1);
    if (badQty) {
      showAlert('Quantity Required', `Enter a quantity for ${badQty.product.productName}.`);
      return;
    }
    const badDiscount = lines.find(l => (parseFloat(l.discount) || 0) > 100);
    if (badDiscount) {
      showAlert('Invalid Discount', `Discount for ${badDiscount.product.productName} can't be more than 100%.`);
      return;
    }

    setSubmitting(true);
    try {
      const order = await orderApi.createOrder({
        chemistId: orderType === 'Chemist' ? chemist!.id : undefined,
        stockistId: stockist.id,
        visitId,
        latitude: location?.latitude,
        longitude: location?.longitude,
        remarks: remarks.trim() || undefined,
        offlineId: offlineId.current,
        items: lines.map(l => ({
          productId: l.product.id,
          quantity: parseInt(l.quantity, 10),
          freeQuantity: parseInt(l.freeQuantity, 10) || undefined,
          discountPercentage: parseFloat(l.discount) || undefined,
        })),
      });
      submitted.current = true;
      navigation.replace('OrderDetail', { orderId: order.id });
      showAlert('Order Booked', `${order.orderNumber} • ${formatINR(order.netAmount)}`);
    } catch (err: any) {
      const isNetworkError = !err?.response;
      showAlert(
        'Order Not Booked',
        isNetworkError
          ? 'No internet connection. Check your network and tap Book Order again — the order will not be duplicated.'
          : err.response?.data?.message || 'Failed to book the order. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ── Customer ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer</Text>

          <View style={styles.segment}>
            {(['Chemist', 'Stockist'] as OrderType[]).map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.segmentBtn, orderType === type && styles.segmentBtnActive, fromVisit && orderType !== type && styles.segmentBtnDisabled]}
                onPress={() => changeOrderType(type)}
                activeOpacity={fromVisit ? 1 : 0.7}
              >
                <Text style={[styles.segmentText, orderType === type && styles.segmentTextActive]}>
                  {type === 'Chemist' ? 'Chemist Order' : 'Stockist Order'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {orderType === 'Chemist' ? (
            <>
              <PartyRow label="Chemist" party={chemist} icon="store-outline" onPress={() => openSearch('chemist')} locked={fromVisit} />
              <PartyRow label="Supplied By (Stockist)" party={stockist} icon="warehouse" onPress={() => openSearch('stockist')} />
            </>
          ) : (
            <PartyRow label="Stockist" party={stockist} icon="warehouse" onPress={() => openSearch('stockist')} locked={fromVisit} />
          )}

          <Text style={styles.hint}>
            {orderType === 'Chemist' ? 'Priced at PTR (price to retailer).' : 'Priced at PTS (price to stockist).'}
            {fromVisit ? ' Linked to the visit you just logged.' : ''}
          </Text>
        </View>

        {/* ── Products ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Products</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => openSearch('product')}>
              <MaterialCommunityIcons name="plus" size={18} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Add Product</Text>
            </TouchableOpacity>
          </View>

          {lines.length === 0 ? (
            <TouchableOpacity style={styles.emptyLines} onPress={() => openSearch('product')}>
              <MaterialCommunityIcons name="pill" size={30} color={COLORS.textDisabled} />
              <Text style={styles.emptyLinesText}>Tap to add the first product</Text>
            </TouchableOpacity>
          ) : (
            lines.map((line, idx) => {
              const price = unitPrice(line.product);
              const c = computed[idx];
              return (
                <View key={line.product.id} style={[styles.line, idx < lines.length - 1 && styles.lineBorder]}>
                  <View style={styles.lineTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineName} numberOfLines={2}>{line.product.productName}</Text>
                      <Text style={styles.lineSub}>
                        {[line.product.packSize, price > 0 ? `${formatINR(price)} / unit` : 'No price set', line.product.gstPercentage ? `GST ${line.product.gstPercentage}%` : null]
                          .filter(Boolean)
                          .join(' • ')}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeLine(line.product.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.lineInputs}>
                    <View style={styles.lineField}>
                      <Text style={styles.lineFieldLabel}>Qty</Text>
                      <TextInput
                        style={styles.lineInput}
                        keyboardType="number-pad"
                        value={line.quantity}
                        onChangeText={v => updateLine(line.product.id, 'quantity', v)}
                        maxLength={6}
                        selectTextOnFocus
                      />
                    </View>
                    <View style={styles.lineField}>
                      <Text style={styles.lineFieldLabel}>Free</Text>
                      <TextInput
                        style={styles.lineInput}
                        keyboardType="number-pad"
                        value={line.freeQuantity}
                        onChangeText={v => updateLine(line.product.id, 'freeQuantity', v)}
                        placeholder="0"
                        placeholderTextColor={COLORS.textDisabled}
                        maxLength={6}
                      />
                    </View>
                    <View style={styles.lineField}>
                      <Text style={styles.lineFieldLabel}>Disc %</Text>
                      <TextInput
                        style={styles.lineInput}
                        keyboardType="decimal-pad"
                        value={line.discount}
                        onChangeText={v => updateLine(line.product.id, 'discount', v)}
                        placeholder="0"
                        placeholderTextColor={COLORS.textDisabled}
                        maxLength={5}
                      />
                    </View>
                    <View style={[styles.lineField, styles.lineTotalField]}>
                      <Text style={styles.lineFieldLabel}>Amount</Text>
                      <Text style={styles.lineTotal}>{formatINR(c?.total ?? 0)}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Totals ── */}
        {lines.length > 0 && (
          <View style={styles.card}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Gross ({lines.length} products)</Text>
              <Text style={styles.totalValue}>{formatINR(totals.gross)}</Text>
            </View>
            {totals.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, { color: COLORS.success }]}>−{formatINR(totals.discount)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST</Text>
              <Text style={styles.totalValue}>{formatINR(totals.tax)}</Text>
            </View>
            <View style={[styles.totalRow, styles.netRow]}>
              <Text style={styles.netLabel}>Net Amount</Text>
              <Text style={styles.netValue}>{formatINR(totals.net)}</Text>
            </View>
          </View>
        )}

        {/* ── Remarks ── */}
        <View style={styles.card}>
          <View style={[styles.group, { marginBottom: 0 }]}>
            <Text style={styles.label}>Remarks (optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Any notes for your manager"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
          </View>
        </View>

        <Button
          title={lines.length > 0 ? `Book Order • ${formatINR(totals.net)}` : 'Book Order'}
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
        />
        <Text style={styles.footnote}>Amounts are estimates; the final price is set from the product master when the order is booked.</Text>
      </ScrollView>

      {/* ── Search Modal ── */}
      <Modal visible={searchKind !== null} animationType="slide" onRequestClose={closeSearch}>
        <View style={styles.searchRoot}>
          <View style={styles.searchHeader}>
            <TouchableOpacity onPress={closeSearch}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.searchTitle}>
              {searchKind === 'product' ? 'Add Product' : searchKind === 'chemist' ? 'Select Chemist' : 'Select Stockist'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={[styles.selectRow, { margin: SIZES.paddingMD }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={searchKind === 'product' ? 'Search product...' : `Search ${searchKind ?? ''}...`}
              placeholderTextColor={COLORS.textSecondary}
              value={query}
              onChangeText={runSearch}
            />
            {(searching || loadingDefaults) && <ActivityIndicator size="small" color={COLORS.primary} />}
          </View>

          {/* What the list shows: the opening list, or results from searching everything */}
          {!loadingDefaults && (
            <Text style={styles.listHint}>
              {query.trim().length >= 2
                ? 'Search results'
                : searchKind === 'product'
                  ? 'All products — type to search'
                  : hqId
                    ? `${searchKind === 'chemist' ? 'Chemists' : 'Stockists'} in your HQ — type 2+ letters to search all`
                    : `${searchKind === 'chemist' ? 'Chemists' : 'Stockists'} — type to search`}
            </Text>
          )}

          {searchKind === 'product' ? (
            <FlatList
              data={productResults}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const added = lines.some(l => l.product.id === item.id);
                const price = unitPrice(item);
                return (
                  <TouchableOpacity style={styles.resultItem} onPress={() => pickProduct(item)}>
                    <MaterialCommunityIcons name="pill" size={20} color={COLORS.primary} />
                    <View style={styles.resultBody}>
                      <Text style={styles.resultName}>{item.productName}</Text>
                      <Text style={styles.resultDetails} numberOfLines={1}>
                        {[item.packSize, price > 0 ? `${orderType === 'Chemist' ? 'PTR' : 'PTS'} ${formatINR(price)}` : 'No price set']
                          .filter(Boolean)
                          .join(' • ')}
                      </Text>
                    </View>
                    {added ? (
                      <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                    ) : (
                      <MaterialCommunityIcons name="plus-circle-outline" size={20} color={COLORS.textSecondary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {loadingDefaults || searching ? '' : 'No products found'}
                </Text>
              }
            />
          ) : (
            <FlatList
              data={partyResults}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => pickParty(item)}>
                  <MaterialCommunityIcons name={searchKind === 'chemist' ? 'store-outline' : 'warehouse'} size={20} color={COLORS.primary} />
                  <View style={styles.resultBody}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    {item.details ? <Text style={styles.resultDetails} numberOfLines={1}>{item.details}</Text> : null}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {loadingDefaults || searching
                    ? ''
                    : query.trim().length >= 2
                      ? 'No results found'
                      : `No ${searchKind === 'chemist' ? 'chemists' : 'stockists'} here yet — type 2+ letters to search all`}
                </Text>
              }
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  content: {
    padding: SIZES.paddingMD,
    paddingBottom: 40,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    padding: 3,
    marginBottom: SIZES.paddingMD,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: SIZES.radiusSM,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: COLORS.background,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  segmentBtnDisabled: {
    opacity: 0.4,
  },
  segmentText: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.primary,
  },
  group: {
    marginBottom: SIZES.paddingMD,
  },
  label: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSM,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: COLORS.background,
  },
  selectRowLocked: {
    backgroundColor: COLORS.surface,
  },
  selectText: {
    flex: 1,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
  },
  hint: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZES.radiusSM,
    backgroundColor: COLORS.primaryLight,
  },
  addBtnText: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyLines: {
    alignItems: 'center',
    paddingVertical: SIZES.paddingLG,
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
  },
  emptyLinesText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },
  line: {
    paddingVertical: SIZES.paddingSM,
  },
  lineBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  lineTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  lineName: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  lineSub: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  lineInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  lineField: {
    flex: 1,
  },
  lineTotalField: {
    flex: 1.4,
    alignItems: 'flex-end',
  },
  lineFieldLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  lineInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSM,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 8 : 5,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  lineTotal: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: SIZES.fontSM,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  netRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 6,
    paddingTop: 10,
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
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSM,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
  },
  textarea: {
    minHeight: 72,
  },
  footnote: {
    fontSize: SIZES.fontXS,
    color: COLORS.textDisabled,
    textAlign: 'center',
    marginTop: SIZES.paddingSM,
  },
  searchRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    padding: 0,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  resultBody: {
    flex: 1,
    marginLeft: 12,
  },
  resultName: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  resultDetails: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 40,
    marginHorizontal: SIZES.paddingLG,
    fontSize: SIZES.fontSM,
  },
  listHint: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginHorizontal: SIZES.paddingMD,
    marginTop: -4,
    marginBottom: SIZES.paddingSM,
  },
});

export default BookOrderScreen;
