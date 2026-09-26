import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, ErrorMessage } from '../../components/common';
import { productApi } from '../../services/api';
import { ProductDetail } from '../../types/product.types';
import { ProductStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';

type ProductDetailRouteProp = RouteProp<ProductStackParamList, 'ProductDetail'>;

const openUrl = async (url: string, label: string) => {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Error', `Failed to open ${label}. Please check your internet connection.`);
  }
};

const ProductDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ProductDetailRouteProp>();
  const { productId } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({ headerTitleAlign: 'left' });
  }, [navigation]);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await productApi.getProductDetail(productId);
      setProduct(data);
      setError(null);
    } catch {
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <ErrorMessage
        message={error ?? 'Product not found'}
        onRetry={() => {
          setError(null);
          loadProduct();
        }}
      />
    );
  }

  const hasMedia = product.brandImageUrl || product.visualAidUrl || product.brochureUrl || product.productVideoUrl;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header card */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.imageContainer}>
            {product.brandImageUrl && !imageError ? (
              <Image
                source={{ uri: product.brandImageUrl }}
                style={styles.brandImage}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.imageFallback}>
                <MaterialCommunityIcons name="pill" size={40} color={COLORS.primary} />
              </View>
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.productName}>{product.productName}</Text>
            <View style={styles.badgeRow}>
              {product.productType ? (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{product.productType}</Text>
                </View>
              ) : null}
              {product.isCampaignProduct ? (
                <View style={styles.campaignBadge}>
                  <MaterialCommunityIcons name="star" size={11} color={COLORS.warning} />
                  <Text style={styles.campaignBadgeText}>Focus Product</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        {product.composition ? (
          <View style={styles.compositionBox}>
            <Text style={styles.compositionLabel}>Composition</Text>
            <Text style={styles.compositionText}>{product.composition}</Text>
          </View>
        ) : null}
      </Card>

      {/* Pricing card */}
      {(product.mrp != null || product.ptr != null || product.pts != null) ? (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <View style={styles.pricingGrid}>
            {product.mrp != null ? (
              <View style={styles.priceBox}>
                <Text style={styles.priceBoxLabel}>MRP</Text>
                <Text style={styles.priceBoxValue}>₹{product.mrp.toFixed(2)}</Text>
              </View>
            ) : null}
            {product.ptr != null ? (
              <View style={styles.priceBox}>
                <Text style={styles.priceBoxLabel}>PTR</Text>
                <Text style={styles.priceBoxValue}>₹{product.ptr.toFixed(2)}</Text>
              </View>
            ) : null}
            {product.pts != null ? (
              <View style={styles.priceBox}>
                <Text style={styles.priceBoxLabel}>PTS</Text>
                <Text style={styles.priceBoxValue}>₹{product.pts.toFixed(2)}</Text>
              </View>
            ) : null}
          </View>
          {product.gstPercentage != null ? (
            <View style={styles.gstRow}>
              <MaterialCommunityIcons name="percent" size={14} color={COLORS.textSecondary} />
              <Text style={styles.gstText}>GST: {product.gstPercentage}%</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* Product Details card */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Product Details</Text>
        {[
          { label: 'Category', value: product.category },
          { label: 'Pack Size', value: product.packSize },
          { label: 'HSN Code', value: product.hsnCode },
          { label: 'Manufacturer', value: product.manufacturer },
        ].map(({ label, value }) =>
          value ? (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          ) : null
        )}
      </Card>

      {/* Media & Assets card */}
      {hasMedia ? (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Media & Assets</Text>
          <Text style={styles.mediaSubtitle}>Tap to open for doctor/chemist presentation</Text>
          <View style={styles.mediaGrid}>
            {product.visualAidUrl ? (
              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() => openUrl(product.visualAidUrl!, 'Visual Aid')}
                activeOpacity={0.7}
              >
                <View style={[styles.mediaIcon, { backgroundColor: '#e0e7ff' }]}>
                  <MaterialCommunityIcons name="presentation" size={24} color="#4f46e5" />
                </View>
                <Text style={styles.mediaLabel}>Visual Aid</Text>
                <Text style={styles.mediaType}>PDF</Text>
              </TouchableOpacity>
            ) : null}
            {product.brochureUrl ? (
              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() => openUrl(product.brochureUrl!, 'Brochure')}
                activeOpacity={0.7}
              >
                <View style={[styles.mediaIcon, { backgroundColor: COLORS.successLight }]}>
                  <MaterialCommunityIcons name="file-document-outline" size={24} color={COLORS.success} />
                </View>
                <Text style={styles.mediaLabel}>Brochure</Text>
                <Text style={styles.mediaType}>PDF</Text>
              </TouchableOpacity>
            ) : null}
            {product.productVideoUrl ? (
              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() => openUrl(product.productVideoUrl!, 'Product Video')}
                activeOpacity={0.7}
              >
                <View style={[styles.mediaIcon, { backgroundColor: COLORS.errorLight }]}>
                  <MaterialCommunityIcons name="play-circle-outline" size={24} color={COLORS.error} />
                </View>
                <Text style={styles.mediaLabel}>Product Video</Text>
                <Text style={styles.mediaType}>MP4</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Card>
      ) : null}

      {/* Description */}
      {product.description ? (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{product.description}</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
};

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
  },
  headerCard: {
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SIZES.paddingSM,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: SIZES.radiusMD,
    marginRight: SIZES.paddingMD,
    overflow: 'hidden',
    flexShrink: 0,
  },
  brandImage: {
    width: 80,
    height: 80,
  },
  imageFallback: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.radiusMD,
  },
  headerInfo: {
    flex: 1,
  },
  productName: {
    fontSize: SIZES.fontXL,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.infoLight,
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 3,
    borderRadius: SIZES.radiusSM,
  },
  typeBadgeText: {
    fontSize: SIZES.fontXS,
    color: COLORS.info,
    fontWeight: '600',
  },
  campaignBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 3,
    borderRadius: SIZES.radiusSM,
  },
  campaignBadgeText: {
    fontSize: SIZES.fontXS,
    color: COLORS.warning,
    fontWeight: '700',
  },
  compositionBox: {
    marginTop: SIZES.paddingSM,
    backgroundColor: COLORS.backgroundGray,
    borderRadius: SIZES.radiusSM,
    padding: SIZES.paddingSM,
  },
  compositionLabel: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compositionText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  card: {
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
  },
  sectionTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingMD,
  },
  pricingGrid: {
    flexDirection: 'row',
    gap: SIZES.paddingSM,
  },
  priceBox: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
    alignItems: 'center',
  },
  priceBoxLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  priceBoxValue: {
    fontSize: SIZES.fontXL,
    fontWeight: '700',
    color: COLORS.primary,
  },
  gstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SIZES.paddingSM,
  },
  gstText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SIZES.paddingSM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  detailLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: SIZES.fontSM,
    color: COLORS.textPrimary,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: SIZES.paddingMD,
  },
  mediaSubtitle: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginTop: -SIZES.paddingSM,
    marginBottom: SIZES.paddingMD,
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: SIZES.paddingSM,
    flexWrap: 'wrap',
  },
  mediaButton: {
    flex: 1,
    minWidth: 90,
    alignItems: 'center',
    backgroundColor: COLORS.backgroundGray,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mediaIcon: {
    width: 48,
    height: 48,
    borderRadius: SIZES.radiusMD,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  mediaLabel: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  mediaType: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  descriptionText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default ProductDetailScreen;
