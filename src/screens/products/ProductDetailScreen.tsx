import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, ErrorMessage } from '../../components/common';
import { productApi } from '../../services/api';
import { ProductDetail } from '../../types/product.types';
import { ProductStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';

type ProductDetailRouteProp = RouteProp<ProductStackParamList, 'ProductDetail'>;

const ProductDetailScreen: React.FC = () => {
  const route = useRoute<ProductDetailRouteProp>();
  const { productId } = route.params;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
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
    load();
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
          setLoading(true);
          productApi
            .getProductDetail(productId)
            .then(d => setProduct(d))
            .catch(() => setError('Failed to load product details'))
            .finally(() => setLoading(false));
        }}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header card */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="pill" size={36} color={COLORS.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.productName}>{product.productName}</Text>
            {product.productType ? (
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{product.productType}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {product.composition ? (
          <Text style={styles.composition}>{product.composition}</Text>
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
        </Card>
      ) : null}

      {/* Details card */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Product Details</Text>

        {[
          { label: 'Category', value: product.category },
          { label: 'Pack Size', value: product.packSize },
          { label: 'Manufacturer', value: product.manufacturer },
          { label: 'HSN Code', value: product.hsnCode },
        ].map(({ label, value }) =>
          value ? (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          ) : null
        )}
      </Card>

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
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingMD,
  },
  headerInfo: {
    flex: 1,
  },
  productName: {
    fontSize: SIZES.fontXL,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  typeBadge: {
    alignSelf: 'flex-start',
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
  composition: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    lineHeight: 18,
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
    gap: SIZES.paddingMD,
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
  descriptionText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default ProductDetailScreen;
