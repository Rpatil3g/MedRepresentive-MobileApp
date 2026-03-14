import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const SIZES = {
  // Screen dimensions
  screenWidth: width,
  screenHeight: height,
  
  // Padding & Margin
  paddingXS: 4,
  paddingSM: 8,
  paddingMD: 16,
  paddingLG: 24,
  paddingXL: 32,
  
  // Border Radius
  radiusXS: 4,
  radiusSM: 8,
  radiusMD: 12,
  radiusLG: 16,
  radiusXL: 24,
  radiusRound: 9999,
  
  // Font Sizes
  fontXS: 10,
  fontSM: 12,
  fontMD: 14,
  fontLG: 16,
  fontXL: 18,
  font2XL: 20,
  font3XL: 24,
  font4XL: 28,
  
  // Icon Sizes
  iconXS: 16,
  iconSM: 20,
  iconMD: 24,
  iconLG: 32,
  iconXL: 48,
  
  // Button Heights
  buttonSM: 36,
  buttonMD: 44,
  buttonLG: 52,
  
  // Header Height
  headerHeight: 56,
  tabBarHeight: 60,
};
