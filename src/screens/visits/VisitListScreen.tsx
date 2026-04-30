import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, ErrorMessage, Loading } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setVisits, setTodayVisits, removeVisit } from '../../store/slices/visitSlice';
import { visitApi, dcrApi } from '../../services/api';
import { Visit } from '../../types/visit.types';
import { VisitStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES, ROUTES } from '../../constants';
import { formatTime, formatDate } from '../../utils/dateUtils';

type VisitListNavigationProp = StackNavigationProp<VisitStackParamList, 'VisitList'>;

const VisitListScreen: React.FC = () => {
  const navigation = useNavigation<VisitListNavigationProp>();
  const dispatch = useAppDispatch();

  const visits = useAppSelector((state) => state.visit.visits ?? []);
  const todayVisits = useAppSelector((state) => state.visit.todayVisits ?? []);
  const activeVisit = useAppSelector((state) => state.visit.activeVisit);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTodayOnly, setShowTodayOnly] = useState(true);

  useEffect(() => {
    fetchVisits();
  }, [showTodayOnly]);

  const fetchVisits = async () => {
    try {
      setError(null);

      if (showTodayOnly) {
        const data = await visitApi.getTodayVisits();
        dispatch(setTodayVisits(data));
      } else {
        const response = await visitApi.getVisits({
          pageNumber: 1,
          pageSize: 50,
        });
        const items = Array.isArray(response) ? response : (response?.items ?? []);
        dispatch(setVisits(items));
      }
    } catch (err: any) {
      console.error('Fetch visits error:', err);
      setError('Failed to load visits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchVisits();
  };

  const handleVisitPress = (visit: Visit) => {
    navigation.navigate(ROUTES.VISIT_DETAIL, { visitId: visit.id });
  };

  const handleStartVisit = () => {
    navigation.navigate(ROUTES.LOG_VISIT, {});
  };

  const handleDeleteVisit = (visit: Visit) => {
    Alert.alert(
      'Delete Visit',
      `Delete visit with ${visit.doctorName || visit.chemistName || visit.stockistName || 'this contact'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const visitDate = formatDate(visit.visitDateTime, 'yyyy-MM-dd');
              const dcr = await dcrApi.getDCRByDate(visitDate);
              if (dcr && (dcr.status === 'Submitted' || dcr.status === 'Approved')) {
                Alert.alert(
                  'Cannot Delete',
                  'DCR for this date is already submitted. Contact your manager to make changes.'
                );
                return;
              }
              await visitApi.deleteVisit(visit.id);
              dispatch(removeVisit(visit.id));
            } catch {
              Alert.alert('Error', 'Failed to delete visit. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderVisitCard = ({ item, index }: { item: Visit; index: number }) => {
    const isActive = item.status === 'Checked-In';
    const isCompleted = item.status === 'Checked-Out' || item.status === 'Completed';
    const isCancelled = item.status === 'Cancelled';

    const accentColor = isActive
      ? COLORS.warning
      : isCompleted
      ? COLORS.success
      : isCancelled
      ? COLORS.error
      : COLORS.textDisabled;

    const statusLabel = isActive ? 'Active' : item.status;

    return (
      <TouchableOpacity onPress={() => handleVisitPress(item)} activeOpacity={0.7}>
        <Card style={styles.visitCard} padding={0}>
          <View style={styles.cardBody}>
            {/* Header row */}
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={item.visitType === 'Doctor' ? 'doctor' : 'store-outline'}
                  size={24}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.visitInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.visitNumber}>#{index + 1}</Text>
                  <Text style={styles.visitTitle} numberOfLines={1}>
                    {item.doctorName || item.chemistName || item.stockistName || 'Unknown'}
                  </Text>
                </View>
                {item.doctorSpecialty && (
                  <Text style={styles.visitSubtitle}>{item.doctorSpecialty}</Text>
                )}
                <Text style={styles.visitTime}>
                  {formatTime(item.visitDateTime)}
                  {item.checkOutTime ? ` — ${formatTime(item.checkOutTime)}` : ''}
                </Text>
              </View>

              {/* Status badge */}
              <View style={[styles.statusBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.statusText}>{statusLabel}</Text>
              </View>
            </View>

            {/* Info chips row */}
            <View style={styles.cardFooter}>
              {item.visitDurationMinutes > 0 && (
                <View style={styles.durationChip}>
                  <MaterialCommunityIcons name="clock-outline" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.durationChipText}>{item.visitDurationMinutes} min</Text>
                </View>
              )}
              {item.isOrderBooked && (
                <View style={[styles.chip, styles.chipOrder]}>
                  <MaterialCommunityIcons name="cash-multiple" size={13} color="#7c3aed" />
                  <Text style={[styles.chipText, { color: '#7c3aed' }]}>Order</Text>
                </View>
              )}
              {item.samples.length > 0 && (
                <View style={styles.chip}>
                  <MaterialCommunityIcons name="package-variant" size={13} color={COLORS.info} />
                  <Text style={[styles.chipText, { color: COLORS.info }]}>
                    {item.samples.length} Sample{item.samples.length > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              {item.productsDiscussed.length > 0 && (
                <View style={styles.chip}>
                  <MaterialCommunityIcons name="pill" size={13} color={COLORS.primary} />
                  <Text style={[styles.chipText, { color: COLORS.primary }]}>
                    {item.productsDiscussed.length} Product{item.productsDiscussed.length > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              {item.isPlannedVisit && (
                <View style={styles.chip}>
                  <MaterialCommunityIcons name="calendar-check" size={13} color={COLORS.secondary} />
                  <Text style={[styles.chipText, { color: COLORS.secondary }]}>Planned</Text>
                </View>
              )}
              {item.isGeofenceBreach && (
                <View style={[styles.chip, styles.chipWarning]}>
                  <MaterialCommunityIcons name="map-marker-alert" size={13} color={COLORS.warning} />
                  <Text style={[styles.chipText, { color: COLORS.warning }]}>Out of Range</Text>
                </View>
              )}
              {!isActive && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteVisit(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="map-marker-off" size={64} color={COLORS.textDisabled} />
        <Text style={styles.emptyText}>
          {showTodayOnly ? 'No visits today' : 'No visits found'}
        </Text>
        <TouchableOpacity onPress={handleStartVisit} style={styles.startVisitButton}>
          <Text style={styles.startVisitText}>Start a Visit</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (error && !refreshing) {
    return <ErrorMessage message={error} onRetry={fetchVisits} />;
  }

  const displayVisits = showTodayOnly ? todayVisits : visits;

  return (
    <View style={styles.container}>
      {/* Active Visit Banner */}
      {activeVisit && (
        <TouchableOpacity
          style={styles.activeVisitBanner}
          onPress={() => handleVisitPress(activeVisit)}
        >
          <MaterialCommunityIcons name="map-marker-check" size={24} color={COLORS.textWhite} />
          <View style={styles.activeVisitInfo}>
            <Text style={styles.activeVisitText}>Active Visit</Text>
            <Text style={styles.activeVisitDoctor}>
              {activeVisit.doctorName || activeVisit.chemistName || activeVisit.stockistName || 'Visit in progress'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, showTodayOnly && styles.filterTabActive]}
          onPress={() => setShowTodayOnly(true)}
        >
          <Text style={[styles.filterText, showTodayOnly && styles.filterTextActive]}>
            Today ({todayVisits.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, !showTodayOnly && styles.filterTabActive]}
          onPress={() => setShowTodayOnly(false)}
        >
          <Text style={[styles.filterText, !showTodayOnly && styles.filterTextActive]}>
            All Visits
          </Text>
        </TouchableOpacity>
      </View>

      {/* Visit List */}
      <FlatList
        data={displayVisits}
        renderItem={renderVisitCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={renderEmpty}
      />

      {/* FAB */}
      {!activeVisit && (
        <TouchableOpacity style={styles.fab} onPress={handleStartVisit}>
          <MaterialCommunityIcons name="plus" size={28} color={COLORS.textWhite} />
        </TouchableOpacity>
      )}

      <Loading visible={loading && !refreshing} message="Loading visits..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  activeVisitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    padding: SIZES.paddingMD,
  },
  activeVisitInfo: {
    flex: 1,
    marginLeft: SIZES.paddingMD,
  },
  activeVisitText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textWhite,
    fontWeight: '600',
  },
  activeVisitDoctor: {
    fontSize: SIZES.fontMD,
    color: COLORS.textWhite,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: SIZES.paddingMD,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.transparent,
  },
  filterTabActive: {
    borderBottomColor: COLORS.primary,
  },
  filterText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: SIZES.paddingMD,
    paddingBottom: 80,
  },
  visitCard: {
    marginBottom: SIZES.paddingMD,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 0,
  },
  accentStripe: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: SIZES.radiusMD,
    borderBottomLeftRadius: SIZES.radiusMD,
  },
  cardBody: {
    flex: 1,
    padding: SIZES.paddingMD,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SIZES.paddingSM,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingSM,
  },
  visitInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visitNumber: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
    color: COLORS.textDisabled,
  },
  visitTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  visitSubtitle: {
    fontSize: SIZES.fontSM,
    color: COLORS.primary,
    marginTop: 2,
  },
  visitTime: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusRound,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: SIZES.fontXS,
    color: COLORS.textWhite,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: COLORS.transparent,
    borderRadius: SIZES.radiusRound,
    borderWidth: 1,
    borderColor: COLORS.textSecondary + '60',
  },
  durationChipText: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: COLORS.backgroundGray,
    borderRadius: SIZES.radiusRound,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipOrder: {
    borderColor: '#7c3aed40',
    backgroundColor: '#f5f3ff',
  },
  deleteBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  chipWarning: {
    borderColor: COLORS.warning + '60',
    backgroundColor: COLORS.warningLight,
  },
  chipText: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: SIZES.fontLG,
    color: COLORS.textSecondary,
    marginTop: SIZES.paddingMD,
    marginBottom: SIZES.paddingLG,
  },
  startVisitButton: {
    paddingHorizontal: SIZES.paddingXL,
    paddingVertical: SIZES.paddingMD,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMD,
  },
  startVisitText: {
    color: COLORS.textWhite,
    fontSize: SIZES.fontMD,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: SIZES.paddingLG,
    bottom: SIZES.paddingLG,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default VisitListScreen;
