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
import { setDCRs } from '../../store/slices/dcrSlice';
import { dcrApi, visitApi } from '../../services/api';
import { DailyCallReport } from '../../types/dcr.types';
import { showAlert } from '../../utils/helpers';
import { DCRStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES, ROUTES } from '../../constants';
import { formatDate } from '../../utils/dateUtils';

type DCRListNavigationProp = StackNavigationProp<DCRStackParamList, 'DCRList'>;

const DCRListScreen: React.FC = () => {
  const navigation = useNavigation<DCRListNavigationProp>();
  const dispatch = useAppDispatch();

  const { dcrs } = useAppSelector((state) => state.dcr);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDCRs();
  }, []);

  const fetchDCRs = async () => {
    try {
      setError(null);
      const response = await dcrApi.getMyDCRs({
        pageNumber: 1,
        pageSize: 50,
      });
      const items = Array.isArray(response) ? response : (response?.items ?? []);
      dispatch(setDCRs(items));
    } catch (err: any) {
      console.error('Fetch DCRs error:', err);
      setError('Failed to load DCRs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDCRs();
  };

  const handleDCRPress = (dcr: DailyCallReport) => {
    navigation.navigate(ROUTES.DCR_DETAIL, { dcrId: dcr.id });
  };

  const handleCreateDCR = async () => {
    try {
      const visits = await visitApi.getTodayVisits();
      const completed = visits.filter(
        v => v.status === 'Checked-Out' || v.status === 'Completed'
      );
      if (completed.length === 0) {
        showAlert(
          'No Completed Visits',
          'You need to complete at least one visit before submitting your DCR for the day.'
        );
        return;
      }
      navigation.navigate(ROUTES.CREATE_DCR, {});
    } catch {
      navigation.navigate(ROUTES.CREATE_DCR, {});
    }
  };

  const handleCalendar = () => {
    navigation.navigate(ROUTES.DCR_CALENDAR);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return COLORS.textSecondary;
      case 'Submitted':
        return COLORS.info;
      case 'Approved':
        return COLORS.success;
      case 'Rejected':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };

  const renderDCRCard = ({ item }: { item: DailyCallReport }) => (
    <TouchableOpacity onPress={() => handleDCRPress(item)} activeOpacity={0.7}>
      <Card style={styles.dcrCard}>
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
            <Text style={styles.dateText}>{formatDate(item.reportDate, 'dd MMM yyyy')}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="map-marker-check" size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>{item.totalVisits}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <MaterialCommunityIcons name="doctor" size={20} color={COLORS.success} />
            <Text style={styles.statValue}>{item.doctorVisits}</Text>
            <Text style={styles.statLabel}>Doctors</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <MaterialCommunityIcons name="pharmacy" size={20} color={COLORS.info} />
            <Text style={styles.statValue}>{item.chemistVisits}</Text>
            <Text style={styles.statLabel}>Chemists</Text>
          </View>
        </View>

        {item.distanceTraveledKm && (
          <View style={styles.distanceInfo}>
            <MaterialCommunityIcons name="map-marker-distance" size={16} color={COLORS.textSecondary} />
            <Text style={styles.distanceText}>
              Distance: {item.distanceTraveledKm.toFixed(1)} km
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="file-document-outline" size={64} color={COLORS.textDisabled} />
        <Text style={styles.emptyText}>No DCRs found</Text>
        <TouchableOpacity onPress={handleCreateDCR} style={styles.createButton}>
          <Text style={styles.createButtonText}>Create DCR</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (error && !refreshing) {
    return <ErrorMessage message={error} onRetry={fetchDCRs} />;
  }

  return (
    <View style={styles.container}>
      {/* Header Actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.calendarButton} onPress={handleCalendar}>
          <MaterialCommunityIcons name="calendar-month" size={20} color={COLORS.primary} />
          <Text style={styles.calendarText}>Calendar View</Text>
        </TouchableOpacity>
      </View>

      {/* DCR List */}
      <FlatList
        data={dcrs}
        renderItem={renderDCRCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={renderEmpty}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateDCR}>
        <MaterialCommunityIcons name="plus" size={28} color={COLORS.textWhite} />
      </TouchableOpacity>

      <Loading visible={loading && !refreshing} message="Loading DCRs..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  headerActions: {
    backgroundColor: COLORS.background,
    padding: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.paddingSM,
  },
  calendarText: {
    fontSize: SIZES.fontMD,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: SIZES.paddingSM,
  },
  listContent: {
    padding: SIZES.paddingMD,
    paddingBottom: 80,
  },
  dcrCard: {
    marginBottom: SIZES.paddingMD,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.paddingMD,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: SIZES.paddingSM,
  },
  statusBadge: {
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingXS,
    borderRadius: SIZES.radiusSM,
  },
  statusText: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SIZES.paddingMD,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.font2XL,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.paddingSM,
    paddingTop: SIZES.paddingSM,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  distanceText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginLeft: 4,
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
  createButton: {
    paddingHorizontal: SIZES.paddingXL,
    paddingVertical: SIZES.paddingMD,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMD,
  },
  createButtonText: {
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

export default DCRListScreen;
