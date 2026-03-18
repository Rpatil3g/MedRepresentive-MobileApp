import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, ErrorMessage, Loading } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setVisits, setTodayVisits } from '../../store/slices/visitSlice';
import { visitApi } from '../../services/api';
import { Visit } from '../../types/visit.types';
import { VisitStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES, ROUTES } from '../../constants';
import { formatTime } from '../../utils/dateUtils';

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
    navigation.navigate(ROUTES.VISIT_CHECK_IN, {});
  };

  const renderVisitCard = ({ item }: { item: Visit }) => {
    const isActive = item.status === 'Checked-In';
    const isCompleted = item.status === 'Checked-Out';

    return (
      <TouchableOpacity onPress={() => handleVisitPress(item)} activeOpacity={0.7}>
        <Card style={styles.visitCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={item.visitType === 'Doctor' ? 'doctor' : 'pharmacy'}
                size={28}
                color={isActive ? COLORS.warning : isCompleted ? COLORS.success : COLORS.primary}
              />
            </View>
            <View style={styles.visitInfo}>
              <Text style={styles.visitTitle}>
                {item.doctorName || item.chemistName || 'Unknown'}
              </Text>
              {item.doctorSpecialty && (
                <Text style={styles.visitSubtitle}>{item.doctorSpecialty}</Text>
              )}
              <Text style={styles.visitTime}>
                Check-in: {formatTime(item.checkInTime)}
                {item.checkOutTime && ` • Check-out: ${formatTime(item.checkOutTime)}`}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                isActive && styles.statusBadgeActive,
                isCompleted && styles.statusBadgeCompleted,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isActive && styles.statusTextActive,
                  isCompleted && styles.statusTextCompleted,
                ]}
              >
                {item.status}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            {item.isPlannedVisit && (
              <View style={styles.tag}>
                <MaterialCommunityIcons name="calendar-check" size={14} color={COLORS.info} />
                <Text style={styles.tagText}>Planned</Text>
              </View>
            )}
            {item.isGeofenceBreach && (
              <View style={[styles.tag, styles.tagWarning]}>
                <MaterialCommunityIcons name="alert" size={14} color={COLORS.warning} />
                <Text style={[styles.tagText, styles.tagTextWarning]}>Out of Range</Text>
              </View>
            )}
            {item.visitDurationMinutes > 0 && (
              <View style={styles.tag}>
                <MaterialCommunityIcons name="clock" size={14} color={COLORS.textSecondary} />
                <Text style={styles.tagText}>{item.visitDurationMinutes} min</Text>
              </View>
            )}
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
              {activeVisit.doctorName || activeVisit.chemistName || 'Visit in progress'}
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
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SIZES.paddingSM,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingMD,
  },
  visitInfo: {
    flex: 1,
  },
  visitTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  visitSubtitle: {
    fontSize: SIZES.fontSM,
    color: COLORS.primary,
    marginTop: 2,
  },
  visitTime: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSM,
    backgroundColor: COLORS.backgroundGray,
  },
  statusBadgeActive: {
    backgroundColor: COLORS.warning + '20',
  },
  statusBadgeCompleted: {
    backgroundColor: COLORS.success + '20',
  },
  statusText: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statusTextActive: {
    color: COLORS.warning,
  },
  statusTextCompleted: {
    color: COLORS.success,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.paddingSM,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 2,
    backgroundColor: COLORS.info + '20',
    borderRadius: SIZES.radiusSM,
  },
  tagWarning: {
    backgroundColor: COLORS.warning + '20',
  },
  tagText: {
    fontSize: SIZES.fontXS,
    color: COLORS.info,
    marginLeft: 4,
    fontWeight: '500',
  },
  tagTextWarning: {
    color: COLORS.warning,
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
