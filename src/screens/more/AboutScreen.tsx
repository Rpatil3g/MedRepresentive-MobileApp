import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from '../../components/common';
import { COLORS, SIZES } from '../../constants';

const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '100';
const COMPANY_NAME = 'Eterniro Pvt. Ltd.';
const COMPANY_WEBSITE = 'https://eterniro.com';
const SUPPORT_EMAIL = 'contact@eterniro.com';

const features = [
  { icon: 'map-marker-check', label: 'GPS Attendance Tracking' },
  { icon: 'doctor',            label: 'Doctor Visit Management' },
  { icon: 'clipboard-text',    label: 'Daily Call Reports' },
  { icon: 'calendar-month',    label: 'Monthly Tour Planning' },
  { icon: 'pill',              label: 'Product Catalog' },
  { icon: 'cash-multiple',     label: 'Expense Management' },
];

const AboutScreen: React.FC = () => (
  <ScrollView style={styles.container} contentContainerStyle={styles.content}>

    {/* App Identity */}
    <View style={styles.hero}>
      <Image
        source={require('../../assets/brand/logo-mark.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="EterniRo"
      />
      <Text style={styles.appName}>EterniRo Field Force</Text>
      <Text style={styles.tagline}>Field Force Automation for Medical Representatives</Text>
      <View style={styles.versionBadge}>
        <Text style={styles.versionBadgeText}>v{APP_VERSION} · Build {BUILD_NUMBER}</Text>
      </View>
    </View>

    {/* Company */}
    <Card style={styles.card}>
      <View style={styles.cardRow}>
        <MaterialCommunityIcons name="office-building-outline" size={20} color={COLORS.primary} />
        <Text style={styles.cardLabel}>Developed by</Text>
      </View>
      <Text style={styles.cardValue}>{COMPANY_NAME}</Text>
      <Text
        style={styles.cardLink}
        onPress={() => Linking.openURL(COMPANY_WEBSITE)}
      >
        {COMPANY_WEBSITE}
      </Text>
    </Card>

    {/* Key Features */}
    <Text style={styles.sectionTitle}>What's inside</Text>
    <Card style={styles.featuresCard}>
      {features.map((f, i) => (
        <View
          key={f.label}
          style={[styles.featureRow, i < features.length - 1 && styles.featureRowBorder]}
        >
          <View style={styles.featureIconWrap}>
            <MaterialCommunityIcons name={f.icon} size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.featureLabel}>{f.label}</Text>
        </View>
      ))}
    </Card>

    {/* Legal */}
    <Text style={styles.sectionTitle}>Legal</Text>
    <Card style={styles.card}>
      <Text style={styles.legalText}>
        EterniRo Field Force is proprietary software licensed exclusively for use by authorised
        medical representatives of registered EterniRo Field Force customers. Unauthorised copying,
        distribution, or reverse engineering is strictly prohibited.
      </Text>
      <Text style={[styles.legalText, { marginTop: SIZES.paddingSM }]}>
        © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
      </Text>
    </Card>

    {/* Contact */}
    <Card style={styles.card}>
      <View style={styles.cardRow}>
        <MaterialCommunityIcons name="email-outline" size={18} color={COLORS.primary} />
        <Text style={styles.cardLabel}>Support</Text>
      </View>
      <Text
        style={styles.cardLink}
        onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
      >
        {SUPPORT_EMAIL}
      </Text>
    </Card>

  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  content: {
    padding: SIZES.paddingLG,
    paddingBottom: SIZES.paddingXL,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: SIZES.paddingXL,
  },
  logo: {
    width: 88,
    height: 88,
    marginBottom: SIZES.paddingMD,
  },
  appName: {
    fontSize: SIZES.font3XL,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  tagline: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.paddingXS,
    paddingHorizontal: SIZES.paddingLG,
  },
  versionBadge: {
    marginTop: SIZES.paddingMD,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingXS,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusRound,
  },
  versionBadgeText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SIZES.paddingMD,
    marginTop: SIZES.paddingSM,
  },
  card: {
    marginBottom: SIZES.paddingMD,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SIZES.paddingXS,
  },
  cardLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardLink: {
    fontSize: SIZES.fontMD,
    color: COLORS.primary,
    marginTop: 2,
  },
  featuresCard: {
    marginBottom: SIZES.paddingMD,
    padding: 0,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingMD - 2,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: SIZES.radiusSM,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingMD,
  },
  featureLabel: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
  },
  legalText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default AboutScreen;
