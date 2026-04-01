import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, ErrorMessage, Loading } from '../../components/common';
import { productApi } from '../../services/api';
import { Product } from '../../types/product.types';
import { ProductStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES, ROUTES } from '../../constants';

type ProductListNavigationProp = StackNavigationProp<ProductStackParamList, 'ProductList'>;

const ALL_CATEGORY = 'All';

const ProductListScreen: React.FC = () => {
  const navigation = useNavigation<ProductListNavigationProp>();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([ALL_CATEGORY]);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Tracks when products were last successfully fetched.
  // Using a ref so it doesn't trigger re-renders.
  const lastFetchedAt = useRef<number | null>(null);
  const STALE_TIME_MS = 60_000; // 60 seconds

  const fetchProducts = useCallback(
    async (page = 1, append = false, category = selectedCategory, search = searchQuery) => {
      try {
        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        let result;
        if (search.trim()) {
          const items = await productApi.searchProducts(search.trim());
          setProducts(items);
          setTotalCount(items.length);
          setTotalPages(1);
          setCurrentPage(1);
          setError(null);
          return;
        }

        result = await productApi.getProducts({
          pageNumber: page,
          pageSize: 20,
          isActive: true,
          category: category !== ALL_CATEGORY ? category : undefined,
        });

        if (append) {
          setProducts(prev => [...prev, ...result.items]);
        } else {
          setProducts(result.items);
        }
        setCurrentPage(result.pageNumber);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
        setError(null);
        lastFetchedAt.current = Date.now();
      } catch {
        setError('Failed to load products');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [selectedCategory, searchQuery]
  );

  useEffect(() => {
    setCategoriesLoading(true);
    productApi.getCategories()
      .then(cats => setCategories([ALL_CATEGORY, ...cats]))
      .catch(err => console.warn('Failed to load product categories:', err))
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    fetchProducts(1, false, selectedCategory, searchQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // Re-fetch when the screen comes back into focus (e.g. after navigating to
  // ProductDetail and pressing back). Skipped if data is still fresh (< 60s old)
  // to avoid a redundant network call on the very first mount.
  useFocusEffect(
    useCallback(() => {
      const isStale =
        lastFetchedAt.current === null ||
        Date.now() - lastFetchedAt.current > STALE_TIME_MS;

      if (isStale) {
        fetchProducts(1, false, selectedCategory, searchQuery);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory])
  );

  const handleSearch = () => {
    fetchProducts(1, false, selectedCategory, searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchProducts(1, false, selectedCategory, '');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts(1, false, selectedCategory, searchQuery);
  };

  const handleLoadMore = () => {
    if (!loadingMore && currentPage < totalPages) {
      fetchProducts(currentPage + 1, true);
    }
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate(ROUTES.PRODUCT_DETAIL as 'ProductDetail', { productId: product.id });
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setSearchQuery('');
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity onPress={() => handleProductPress(item)} activeOpacity={0.7}>
      <Card style={styles.productCard}>
        <View style={styles.cardRow}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="pill" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.productName}</Text>
            {item.composition ? (
              <Text style={styles.composition} numberOfLines={1}>
                {item.composition}
              </Text>
            ) : null}
            <View style={styles.priceRow}>
              {item.ptr != null ? (
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>PTR: </Text>
                  <Text style={styles.priceValue}>₹{item.ptr.toFixed(2)}</Text>
                </View>
              ) : null}
              {item.mrp != null ? (
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>MRP: </Text>
                  <Text style={styles.priceValue}>₹{item.mrp.toFixed(2)}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textSecondary} />
        </View>

        <View style={styles.badgeRow}>
          {item.productType ? (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{item.productType}</Text>
            </View>
          ) : null}
          {item.packSize ? (
            <Text style={styles.packSize}>{item.packSize}</Text>
          ) : null}
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="pill" size={64} color={COLORS.textDisabled} />
        <Text style={styles.emptyText}>
          {searchQuery ? 'No products found' : 'No products available'}
        </Text>
        {searchQuery ? (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear Search</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  if (error && !refreshing && products.length === 0) {
    return <ErrorMessage message={error} onRetry={() => fetchProducts(1)} />;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
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
            placeholder="Search brands, molecules..."
            placeholderTextColor={COLORS.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={handleClearSearch}>
              <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {categoriesLoading
            ? [60, 90, 75, 80, 65].map(width => (
                <View key={width} style={[styles.catTab, styles.catTabSkeleton, { width }]} />
              ))
            : categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catTab, selectedCategory === cat && styles.catTabActive]}
                  onPress={() => handleCategorySelect(cat)}
                >
                  <Text
                    style={[styles.catTabText, selectedCategory === cat && styles.catTabTextActive]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
        </ScrollView>
      </View>

      {/* Count */}
      {!loading && products.length > 0 ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>
            {totalCount} {totalCount === 1 ? 'product' : 'products'} found
          </Text>
        </View>
      ) : null}

      <FlatList
        data={products}
        renderItem={renderProductCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />

      <Loading visible={loading && !refreshing} message="Loading products..." />
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
  tabsWrapper: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsScroll: {
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
    gap: SIZES.paddingSM,
  },
  catTab: {
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM - 2,
    borderRadius: SIZES.radiusRound,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catTabSkeleton: {
    backgroundColor: COLORS.border,
    borderColor: COLORS.border,
  },
  catTabText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  catTabTextActive: {
    color: COLORS.textWhite,
    fontWeight: '600',
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
  productCard: {
    marginBottom: SIZES.paddingMD,
    padding: SIZES.paddingMD,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingMD,
    flexShrink: 0,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  composition: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    gap: SIZES.paddingMD,
  },
  priceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.paddingSM,
    gap: SIZES.paddingSM,
  },
  typeBadge: {
    backgroundColor: COLORS.infoLight,
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSM,
  },
  typeBadgeText: {
    fontSize: SIZES.fontXS,
    color: COLORS.info,
    fontWeight: '600',
  },
  packSize: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
  },
  footerLoader: {
    paddingVertical: SIZES.paddingLG,
    alignItems: 'center',
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
});

export default ProductListScreen;
