import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, ErrorMessage, Loading } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setDoctors,
  setSearchQuery,
  setLoading,
  setError,
  setPagination,
} from '../../store/slices/doctorSlice';
import { doctorApi } from '../../services/api';
import { Doctor } from '../../types/doctor.types';
import { DoctorStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES, ROUTES } from '../../constants';
import { truncateText } from '../../utils/helpers';

type DoctorListNavigationProp = StackNavigationProp<DoctorStackParamList, 'DoctorList'>;

const DoctorListScreen: React.FC = () => {
  const navigation = useNavigation<DoctorListNavigationProp>();
  const dispatch = useAppDispatch();

  const { doctors, loading, error, searchQuery, pagination } = useAppSelector(
    state => state.doctor
  );

  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  const fetchDoctors = useCallback(
    async (page = 1, append = false) => {
      try {
        if (page === 1) {
          dispatch(setLoading(true));
        } else {
          setLoadingMore(true);
        }

        const response = await doctorApi.getDoctors({
          pageNumber: page,
          pageSize: 20,
          searchTerm: searchQuery || undefined,
          isActive: true,
        });

        if (append) {
          dispatch(setDoctors([...doctors, ...response.items]));
        } else {
          dispatch(setDoctors(response.items));
        }

        dispatch(
          setPagination({
            currentPage: response.pageNumber,
            totalPages: response.totalPages,
            totalCount: response.totalCount,
          })
        );

        dispatch(setError(null));
      } catch (err) {
        console.error('Fetch doctors error:', err);
        dispatch(setError('Failed to load doctors'));
      } finally {
        dispatch(setLoading(false));
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [dispatch, searchQuery]
  );

  useEffect(() => {
    fetchDoctors(1);
  }, [fetchDoctors]);

  const handleSearch = () => {
    dispatch(setSearchQuery(localSearchQuery));
  };

  const handleClearSearch = () => {
    setLocalSearchQuery('');
    dispatch(setSearchQuery(''));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDoctors(1);
  };

  const handleLoadMore = () => {
    if (!loadingMore && pagination.currentPage < pagination.totalPages) {
      fetchDoctors(pagination.currentPage + 1, true);
    }
  };

  const handleDoctorPress = (doctor: Doctor) => {
    navigation.navigate(ROUTES.DOCTOR_DETAIL, { doctorId: doctor.id });
  };

  const handleAddDoctor = () => {
    navigation.navigate(ROUTES.ADD_DOCTOR);
  };

  const renderDoctorCard = ({ item }: { item: Doctor }) => (
    <TouchableOpacity onPress={() => handleDoctorPress(item)} activeOpacity={0.7}>
      <Card style={styles.doctorCard}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="doctor" size={32} color={COLORS.primary} />
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{item.doctorName}</Text>
            {item.specialty ? <Text style={styles.specialty}>{item.specialty}</Text> : null}
            {item.clinicName ? (
              <Text style={styles.clinicName} numberOfLines={1}>
                {truncateText(item.clinicName, 30)}
              </Text>
            ) : null}
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
        </View>

        <View style={styles.cardFooter}>
          {item.mobileNumber ? (
            <View style={styles.contactItem}>
              <MaterialCommunityIcons name="phone" size={16} color={COLORS.textSecondary} />
              <Text style={styles.contactText}>{item.mobileNumber}</Text>
            </View>
          ) : null}
          {item.city ? (
            <View style={styles.contactItem}>
              <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.textSecondary} />
              <Text style={styles.contactText}>{item.city}</Text>
            </View>
          ) : null}
        </View>

        {item.category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>Category {item.category}</Text>
          </View>
        ) : null}
      </Card>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) {
      return null;
    }
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return null;
    }
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="doctor" size={64} color={COLORS.textDisabled} />
        <Text style={styles.emptyText}>
          {searchQuery ? 'No doctors found' : 'No doctors available'}
        </Text>
        {searchQuery ? (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear Search</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  if (error && !refreshing) {
    return <ErrorMessage message={error} onRetry={() => fetchDoctors(1)} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={COLORS.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors by name, specialty..."
            placeholderTextColor={COLORS.textDisabled}
            value={localSearchQuery}
            onChangeText={setLocalSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {localSearchQuery.length > 0 ? (
            <TouchableOpacity onPress={handleClearSearch}>
              <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {!loading && doctors.length > 0 ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>
            {pagination.totalCount} {pagination.totalCount === 1 ? 'doctor' : 'doctors'} found
          </Text>
        </View>
      ) : null}

      <FlatList
        data={doctors}
        renderItem={renderDoctorCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddDoctor}>
        <MaterialCommunityIcons name="plus" size={28} color={COLORS.textWhite} />
      </TouchableOpacity>

      <Loading visible={loading && !refreshing} message="Loading doctors..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  searchContainer: {
    backgroundColor: COLORS.background,
    padding: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundGray,
    borderRadius: SIZES.radiusMD,
    paddingHorizontal: SIZES.paddingMD,
    height: 44,
  },
  searchIcon: {
    marginRight: SIZES.paddingSM,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
  },
  resultContainer: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: SIZES.paddingMD,
    paddingBottom: 90,
    flexGrow: 1,
  },
  doctorCard: {
    marginBottom: SIZES.paddingMD,
    padding: SIZES.paddingMD,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.paddingMD,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${COLORS.primaryLight}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingMD,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  specialty: {
    fontSize: SIZES.fontSM,
    color: COLORS.primary,
    marginBottom: 2,
  },
  clinicName: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.paddingMD,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  categoryBadge: {
    position: 'absolute',
    top: SIZES.paddingMD,
    right: SIZES.paddingMD,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSM,
  },
  categoryText: {
    fontSize: SIZES.fontXS,
    color: COLORS.textWhite,
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
  },
  clearButton: {
    marginTop: SIZES.paddingLG,
    paddingHorizontal: SIZES.paddingLG,
    paddingVertical: SIZES.paddingMD,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMD,
  },
  clearButtonText: {
    color: COLORS.textWhite,
    fontSize: SIZES.fontMD,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: SIZES.paddingLG,
    alignItems: 'center',
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

export default DoctorListScreen;

